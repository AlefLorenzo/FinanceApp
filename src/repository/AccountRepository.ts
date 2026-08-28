import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Account, AccountStatus } from '../types';

const DEFAULT_WALLET_BALANCE_CENTS = 0;

export class AccountRepository {
  static async create(
    account: Omit<Account, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
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
    const all = await db.accounts.toArray();

    return all.filter(
      account => (account.type as string) !== 'income'
    );
  }

  static async update(
    id: string,
    updates: Partial<Omit<Account, 'id'>>
  ): Promise<void> {
    await db.accounts.update(id, {
      ...updates,
      updated_at: new Date(),
    });
  }

  static async updateStatus(
    id: string,
    status: AccountStatus
  ): Promise<void> {
    await db.accounts.update(id, {
      status,
      updated_at: new Date(),
    });
  }

  /**
   * Marca uma conta como paga e registra o evento financeiro
   * de forma atômica.
   */
  static async markAsPaid(accountId: string): Promise<void> {
    const account = await db.accounts.get(accountId);

    if (
      !account ||
      account.status === 'paid' ||
      account.status === 'cancelled' ||
      (account.type as string) === 'income'
    ) {
      return;
    }

    // Dívidas são processadas pelo DebtRepository,
    // pois precisam atualizar também a parcela.
    if (account.debtInstallmentId) {
      const { DebtRepository } = await import('./DebtRepository');

      await DebtRepository.payInstallment(
        account.debtInstallmentId,
        account.amount_cents
      );

      return;
    }

    await db.transaction(
      'rw',
      db.accounts,
      db.payments,
      db.wallets,
      db.transactions,
      async () => {
        const current = await db.accounts.get(accountId);

        if (
          !current ||
          current.status === 'paid' ||
          current.status === 'cancelled' ||
          (current.type as string) === 'income'
        ) {
          return;
        }

        const now = new Date();

        await db.accounts.update(accountId, {
          status: 'paid',
          updated_at: now,
        });

        await db.payments.add({
          id: uuidv4(),
          account_id: accountId,
          amount_cents: current.amount_cents,
          paid_at: now,
          payment_method: 'other',
          created_at: now,
        });

        const wallets = await db.wallets.toArray();

        let wallet = wallets[0];

        if (!wallet) {
          wallet = {
            id: 'default',
            name: 'Minha Conta',
            balance_cents: DEFAULT_WALLET_BALANCE_CENTS,
            created_at: now,
            updated_at: now,
          };

          await db.wallets.add(wallet);
        }

        await db.wallets.update(wallet.id, {
          balance_cents:
            wallet.balance_cents - current.amount_cents,
          updated_at: now,
        });

        await db.transactions.add({
          id: uuidv4(),
          wallet_id: wallet.id,
          reference_id: accountId,
          type: 'expense_paid',
          amount_cents: -current.amount_cents,
          date: now,
          description: `Pagamento: ${current.title}`,
          created_at: now,
        });
      }
    );
  }

  /**
   * Reverte uma conta paga para pendente.
   */
  static async markAsPending(accountId: string): Promise<void> {
    const account = await db.accounts.get(accountId);

    if (
      !account ||
      account.status === 'pending' ||
      account.status === 'cancelled'
    ) {
      return;
    }

    if (account.debtInstallmentId) {
      throw new Error(
        'Parcelas de dívida devem ser revertidas pelo DebtRepository.'
      );
    }

    await db.transaction(
      'rw',
      db.accounts,
      db.payments,
      db.wallets,
      db.transactions,
      async () => {
        const current = await db.accounts.get(accountId);

        if (!current || current.status !== 'paid') {
          return;
        }

        const now = new Date();

        await db.accounts.update(accountId, {
          status: 'pending',
          updated_at: now,
        });

        const payments = await db.payments
          .where('account_id')
          .equals(accountId)
          .toArray();

        for (const payment of payments) {
          await db.payments.delete(payment.id);
        }

        const wallets = await db.wallets.toArray();
        const wallet = wallets[0];

        if (wallet) {
          await db.wallets.update(wallet.id, {
            balance_cents:
              wallet.balance_cents + current.amount_cents,
            updated_at: now,
          });
        }

        const transactions = await db.transactions
          .where('reference_id')
          .equals(accountId)
          .toArray();

        for (const transaction of transactions) {
          if (transaction.type === 'expense_paid') {
            await db.transactions.delete(transaction.id);
          }
        }
      }
    );
  }

  static async delete(id: string): Promise<void> {
    await db.accounts.delete(id);
  }
}
