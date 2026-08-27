import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Income, IncomeStatus } from '../types';

export class IncomeRepository {
  static async create(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    await db.income.add({
      ...income,
      id,
      created_at: now,
      updated_at: now,
    });
    return id;
  }

  static async getById(id: string): Promise<Income | undefined> {
    return await db.income.get(id);
  }

  static async getAll(): Promise<Income[]> {
    return await db.income.toArray();
  }

  static async update(id: string, updates: Partial<Omit<Income, 'id'>>): Promise<void> {
    await db.income.update(id, { ...updates, updated_at: new Date() });
  }

  static async updateStatus(id: string, status: IncomeStatus): Promise<void> {
    await db.income.update(id, { status, updated_at: new Date() });
  }

  // --- EVENT-DRIVEN RECEIVED LOGIC (ATOMIC) ---

  static async markAsReceived(incomeId: string, receivedDate: string = new Date().toISOString().split('T')[0]): Promise<void> {
    await db.transaction('rw', db.income, db.transactions, db.wallets, async () => {
      const income = await db.income.get(incomeId);
      if (!income || income.status === 'received') return;

      const now = new Date();

      // 1. Update income status
      await db.income.update(incomeId, { 
        status: 'received', 
        received_date: receivedDate,
        updated_at: now 
      });

      // 2. Get/Initialize Wallet
      const wallets = await db.wallets.toArray();
      let wallet = wallets[0];
      if (!wallet) {
        wallet = { id: 'default', name: 'Minha Conta', balance_cents: 390000, created_at: now, updated_at: now };
        await db.wallets.add(wallet);
      }

      // 3. Update Wallet Balance (+ amount)
      await db.wallets.update(wallet.id, { 
        balance_cents: wallet.balance_cents + income.amount_cents,
        updated_at: now
      });

      // 4. Record Transaction log
      await db.transactions.add({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference_id: incomeId,
        type: 'income_received',
        amount_cents: income.amount_cents, // positive
        date: now,
        description: `Recebimento: ${income.title}`,
        created_at: now
      });
    });
  }

  static async markAsPending(incomeId: string): Promise<void> {
    await db.transaction('rw', db.income, db.transactions, db.wallets, async () => {
      const income = await db.income.get(incomeId);
      if (!income || income.status === 'pending') return;

      const now = new Date();

      // 1. Reverse income status
      await db.income.update(incomeId, { 
        status: 'pending', 
        received_date: undefined,
        updated_at: now 
      });

      // 2. Reverse Wallet Balance (- amount)
      const wallets = await db.wallets.toArray();
      const wallet = wallets[0];
      if (wallet) {
        await db.wallets.update(wallet.id, { 
          balance_cents: wallet.balance_cents - income.amount_cents,
          updated_at: now
        });
      }

      // 3. Delete matching transaction history
      const txs = await db.transactions.where('reference_id').equals(incomeId).toArray();
      for (const t of txs) {
        await db.transactions.delete(t.id);
      }
    });
  }

  static async delete(id: string): Promise<void> {
    await db.income.delete(id);
  }
}
