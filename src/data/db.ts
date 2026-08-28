import Dexie, { type Table, type Transaction } from 'dexie';
import type { 
  Account, Category, Payment, RecurringAccount, 
  Reminder, AppSettings, Wallet, Reserve, 
  ReserveContribution, PasswordEntry, InvestmentPlan,
  Income, Debt, DebtInstallment, AppNotification, AppTransaction, SentNotificationLog
} from '../types';

export class FinanceDatabase extends Dexie {
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>; // Now strictly Expenses
  income!: Table<Income, string>;
  payments!: Table<Payment, string>;
  transactions!: Table<AppTransaction, string>;
  recurring_accounts!: Table<RecurringAccount, string>;
  reminders!: Table<Reminder, string>;
  settings!: Table<AppSettings, string>;
  wallets!: Table<Wallet, string>;
  reserves!: Table<Reserve, string>;
  reserve_contributions!: Table<ReserveContribution, string>;
  passwords!: Table<PasswordEntry, string>;
  investment_plans!: Table<InvestmentPlan, string>;
  debts!: Table<Debt, string>;
  debt_installments!: Table<DebtInstallment, string>;
  notifications!: Table<AppNotification, string>;
  sent_notification_logs!: Table<SentNotificationLog, string>;

  constructor() {
    super('FinanceAppDB');
    
    this.version(1).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id',
      payments: 'id, account_id, paid_at',
      recurring_accounts: 'id, active, type'
    });

    this.version(2).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id',
      payments: 'id, account_id, paid_at',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, completed',
      settings: 'id'
    });

    this.version(3).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id',
      payments: 'id, account_id, paid_at',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, completed',
      settings: 'id',
      wallets: 'id',
      reserves: 'id'
    });

    this.version(4).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id',
      payments: 'id, account_id, paid_at',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, category, completed',
      settings: 'id',
      wallets: 'id',
      reserves: 'id',
      reserve_contributions: 'id, reserve_id, contributed_at',
      passwords: 'id, title',
      investment_plans: 'id'
    });

    // V5: Separation of Income, Addition of Debts, Transactions and Notifications
    this.version(5).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id',
      income: 'id, expected_date, category_id, status, recurring_id',
      payments: 'id, account_id, paid_at',
      transactions: 'id, wallet_id, reference_id, type, date',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, category, completed',
      settings: 'id',
      wallets: 'id',
      reserves: 'id',
      reserve_contributions: 'id, reserve_id, contributed_at',
      passwords: 'id, title',
      investment_plans: 'id',
      debts: 'id, status, due_day',
      debt_installments: 'id, debt_id, due_date, status',
      notifications: 'id, type, created_at, read'
    }).upgrade(async (tx: Transaction) => {
      console.log('--- STARTING V5 MIGRATION: Separating Income from Accounts ---');
      
      const accountsTable = tx.table('accounts');
      const incomeTable = tx.table('income');

      const allAccounts = await accountsTable.toArray();
      const totalAccounts = allAccounts.length;
      
      // We are looking for anything stored as type 'income'
      const incomeAccounts = allAccounts.filter((a: any) => a.type === 'income');
      const expectedIncomeCount = incomeAccounts.length;

      console.log(`Total accounts found: ${totalAccounts}`);
      console.log(`Total 'income' type to migrate: ${expectedIncomeCount}`);

      let migratedCount = 0;

      for (const acc of incomeAccounts) {
        // Map account status to income status
        let newStatus: 'pending' | 'received' | 'cancelled' = 'pending';
        if (acc.status === 'paid') newStatus = 'received';
        if (acc.status === 'cancelled') newStatus = 'cancelled';

        await incomeTable.add({
          id: acc.id,
          title: acc.title,
          description: acc.description,
          amount_cents: acc.amount_cents,
          expected_date: acc.due_date,
          received_date: newStatus === 'received' ? acc.updated_at.toISOString().split('T')[0] : undefined,
          category_id: acc.category_id,
          status: newStatus,
          recurring_id: acc.recurring_id,
          created_at: acc.created_at || new Date(),
          updated_at: acc.updated_at || new Date()
        });

        migratedCount++;
      }

      console.log(`Successfully migrated to Income table: ${migratedCount}`);

      if (expectedIncomeCount !== migratedCount) {
        console.error(`MIGRATION ABORTED: Expected ${expectedIncomeCount}, but migrated ${migratedCount}.`);
        throw new Error('Migration failed due to count mismatch. Aborting to preserve data.');
      }

      console.log('Migration verified. 100% of income records migrated safely.');
      console.log('NOTE: Legacy income records are preserved in the accounts table for now to ensure no data destruction. The application logic will ignore them.');
    });

    // V6: Add account_id index to debt_installments for reverse lookup (installment → account)
    // No data migration needed — index is additive only.
    this.version(6).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id, debtId, debtInstallmentId',
      income: 'id, expected_date, category_id, status, recurring_id',
      payments: 'id, account_id, paid_at',
      transactions: 'id, wallet_id, reference_id, type, date',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, category, completed',
      settings: 'id',
      wallets: 'id',
      reserves: 'id',
      reserve_contributions: 'id, reserve_id, contributed_at',
      passwords: 'id, title',
      investment_plans: 'id',
      debts: 'id, status, category_id',
      debt_installments: 'id, debt_id, due_date, status, account_id',
      notifications: 'id, type, created_at, read'
    });

    this.version(7).stores({
      categories: 'id, name',
      accounts: 'id, due_date, category_id, status, type, recurring_id, installment_id, debtId, debtInstallmentId',
      income: 'id, expected_date, category_id, status, recurring_id',
      payments: 'id, account_id, paid_at',
      transactions: 'id, wallet_id, reference_id, type, date',
      recurring_accounts: 'id, active, type',
      reminders: 'id, date, category, completed',
      settings: 'id',
      wallets: 'id',
      reserves: 'id',
      reserve_contributions: 'id, reserve_id, contributed_at',
      passwords: 'id, title',
      investment_plans: 'id',
      debts: 'id, status, category_id',
      debt_installments: 'id, debt_id, due_date, status, account_id',
      notifications: 'id, type, created_at, read',
      sent_notification_logs: 'id, reference_id, notification_type, reference_date'
    });
  }
}

export const db = new FinanceDatabase();
