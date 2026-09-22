import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Account, AccountStatus } from '../types';

export class AccountRepository {
  static async create(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    await db.accounts.add({
      ...account,
      id,
      created_at: now,
      updated_at: now,
    });
    return id;
  }

  static async getById(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  }

  static async getAllExpenses(): Promise<Account[]> {
    // V5: We now strictly ignore any legacy account where type === 'income'
    const all = await db.accounts.toArray();
    return all.filter(a => (a.type as string) !== 'income');
  }

  static async update(id: string, updates: Partial<Omit<Account, 'id'>>): Promise<void> {
    await db.accounts.update(id, { ...updates, updated_at: new Date() });
  }

  static async updateStatus(id: string, status: AccountStatus): Promise<void> {
    await db.accounts.update(id, { status, updated_at: new Date() });
  }

  // --- EVENT-DRIVEN PAYMENT LOGIC (ATOMIC) ---

  static async markAsPaid(accountId: string): Promise<void> {
    const account = await db.accounts.get(accountId);
    if (!account || account.status === 'paid' || (account.type as string) === 'income') return;

    if (account.debtInstallmentId) {
      const { DebtRepository } = await import('./DebtRepository');
      return DebtRepository.payInstallment(account.debtInstallmentId, account.amount_cents);
    }

    await db.transaction('rw', db.accounts, db.payments, db.wallets, db.transactions, async () => {
      // Re-fetch inside transaction
      const account = await db.accounts.get(accountId);
      if (!account || account.status === 'paid' || (account.type as string) === 'income') return;

      const now = new Date();

      // 1. Update account
      await db.accounts.update(accountId, { status: 'paid', updated_at: now });

      // 2. Record payment history
      await db.payments.add({
        id: uuidv4(),
        account_id: accountId,
        amount_cents: account.amount_cents,
        paid_at: now,
        payment_method: 'other',
        created_at: now,
      });

      // 3. Update Wallet Balance (- amount)
      const wallets = await db.wallets.toArray();
      let wallet = wallets[0];
      
      if (!wallet) {
        wallet = { id: 'default', name: 'Minha Conta', balance_cents: 390000, created_at: now, updated_at: now };
        await db.wallets.add(wallet);
      }

      await db.wallets.update(wallet.id, { 
        balance_cents: wallet.balance_cents - account.amount_cents,
        updated_at: now
      });

      // 4. Record Transaction log
      await db.transactions.add({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference_id: accountId,
        type: 'expense_paid',
        amount_cents: -account.amount_cents, // negative
        date: now,
        description: `Pagamento: ${account.title}`,
        created_at: now
      });
    });
  }

  static async markAsPending(accountId: string): Promise<void> {
    await db.transaction('rw', db.accounts, db.payments, db.wallets, db.transactions, async () => {
      const account = await db.accounts.get(accountId);
      if (!account || account.status === 'pending' || (account.type as string) === 'income') return;

      const now = new Date();

      // 1. Reverse account status
      await db.accounts.update(accountId, { status: 'pending', updated_at: now });

      // 2. Delete payment history
      const payments = await db.payments.where('account_id').equals(accountId).toArray();
      for (const p of payments) {
        await db.payments.delete(p.id);
      }

      // 3. Reverse Wallet Balance (+ amount)
      const wallets = await db.wallets.toArray();
      const wallet = wallets[0];
      if (wallet) {
        await db.wallets.update(wallet.id, { 
          balance_cents: wallet.balance_cents + account.amount_cents,
          updated_at: now
        });
      }

      // 4. Delete matching transaction history
      const txs = await db.transactions.where('reference_id').equals(accountId).toArray();
      for (const t of txs) {
        await db.transactions.delete(t.id);
      }
    });
  }

  static async delete(id: string): Promise<void> {
    await db.accounts.delete(id);
  }
}
