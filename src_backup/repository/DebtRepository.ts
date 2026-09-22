import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Debt, DebtInstallment, Account } from '../types';
import { DebtService } from '../services/DebtService';

export class DebtRepository {
  /**
   * 1. Creates a Debt.
   * 2. Generates N DebtInstallments.
   * 3. Generates N corresponding Accounts to integrate with the rest of the app.
   */
  static async create(
    debt: Omit<Debt, 'id' | 'paid_installments' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    return await db.transaction('rw', db.debts, db.debt_installments, db.accounts, async () => {
      const debtId = uuidv4();
      const now = new Date();

      const newDebt: Debt = {
        ...debt,
        id: debtId,
        status: 'active',
        paid_installments: 0,
        created_at: now,
        updated_at: now,
      };

      await db.debts.add(newDebt);

      const dueDates = DebtService.generateDueDates(debt.first_due_date, debt.total_installments);

      for (let i = 0; i < debt.total_installments; i++) {
        const installmentId = uuidv4();
        const accountId = uuidv4();
        const dueDate = dueDates[i];

        const installment: DebtInstallment = {
          id: installmentId,
          debt_id: debtId,
          account_id: accountId,
          installment_number: i + 1,
          amount_cents: debt.installment_amount_cents,
          paid_amount_cents: 0,
          due_date: dueDate,
          status: 'pending',
          created_at: now,
        };

        const account: Account = {
          id: accountId,
          title: `${debt.title} - Parcela ${i + 1}/${debt.total_installments}`,
          amount_cents: debt.installment_amount_cents,
          due_date: dueDate,
          category_id: debt.category_id, // Inherit category from Debt
          status: 'pending',
          type: 'expense',
          debtId: debtId,
          debtInstallmentId: installmentId,
          installment_current: i + 1,
          installment_total: debt.total_installments,
          created_at: now,
          updated_at: now,
        };

        await db.debt_installments.add(installment);
        await db.accounts.add(account);
      }

      return debtId;
    });
  }

  static async getAll(): Promise<Debt[]> {
    return await db.debts.toArray();
  }

  static async getById(id: string): Promise<Debt | undefined> {
    return await db.debts.get(id);
  }

  static async getInstallments(debtId: string): Promise<DebtInstallment[]> {
    const installments = await db.debt_installments.where('debt_id').equals(debtId).toArray();
    return installments.sort((a, b) => a.installment_number - b.installment_number);
  }

  /**
   * Pays a specific amount of an installment (partial or full).
   * - Only debits the exact `amountCents` paid from the wallet.
   * - Prevents duplicate payment.
   * - Never debits more than the remaining amount.
   */
  static async payInstallment(installmentId: string, amountCents: number): Promise<void> {
    await db.transaction('rw', db.debts, db.debt_installments, db.accounts, db.wallets, db.transactions, async () => {
      const inst = await db.debt_installments.get(installmentId);
      if (!inst) throw new Error('Installment not found');

      const remaining = DebtService.remainingCents(inst);
      if (remaining <= 0 || inst.status === 'paid') return; // Already paid

      // Cap payment at remaining amount to avoid overpayment
      const actualPayment = Math.min(amountCents, remaining);
      const newPaidAmount = inst.paid_amount_cents + actualPayment;
      const isFullyPaid = newPaidAmount >= inst.amount_cents;
      const newStatus = isFullyPaid ? 'paid' : 'partial';
      const now = new Date();

      // 1. Update Installment
      await db.debt_installments.update(inst.id, {
        paid_amount_cents: newPaidAmount,
        status: newStatus,
        paid_at: isFullyPaid ? now : undefined,
      });

      // 2. Update Account
      await db.accounts.update(inst.account_id, {
        status: newStatus === 'paid' ? 'paid' : 'pending',
        updated_at: now,
      });

      // 3. Update Debt counters if fully paid
      if (isFullyPaid) {
        const debt = await db.debts.get(inst.debt_id);
        if (debt) {
          await db.debts.update(debt.id, {
            paid_installments: debt.paid_installments + 1,
            updated_at: now,
          });
        }
      }

      // 4. Update Wallet (Debit only the actualPayment)
      const wallets = await db.wallets.toArray();
      let wallet = wallets[0];
      if (!wallet) {
        wallet = { id: 'default', name: 'Minha Conta', balance_cents: 390000, created_at: now, updated_at: now };
        await db.wallets.add(wallet);
      }

      await db.wallets.update(wallet.id, {
        balance_cents: wallet.balance_cents - actualPayment,
        updated_at: now,
      });

      // 5. Create a SINGLE transaction for this payment
      const debt = await db.debts.get(inst.debt_id);
      await db.transactions.add({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference_id: inst.id, // Reference is the installment
        type: 'debt_paid',
        amount_cents: -actualPayment, // Negative
        date: now,
        description: isFullyPaid
          ? `Pagamento de parcela: ${debt?.title || 'Dívida'} (${inst.installment_number}/${debt?.total_installments})`
          : `Pagamento parcial: ${debt?.title || 'Dívida'} (${inst.installment_number}/${debt?.total_installments})`,
        created_at: now,
      });
    });
  }

  /**
   * Settles the entire debt (early payoff or renegotiation).
   * - Records ONE single transaction.
   * - Debits Wallet ONCE.
   * - Marks all pending/partial installments as 'paid'.
   */
  static async settleDebt(debtId: string, settlementAmountCents: number): Promise<void> {
    await db.transaction('rw', db.debts, db.debt_installments, db.accounts, db.wallets, db.transactions, async () => {
      const debt = await db.debts.get(debtId);
      if (!debt || debt.status === 'paid_off') return;

      const now = new Date();
      const installments = await db.debt_installments.where('debt_id').equals(debtId).toArray();
      
      // 1. Update all non-paid installments and their accounts
      for (const inst of installments) {
        if (inst.status !== 'paid') {
          await db.debt_installments.update(inst.id, {
            status: 'paid',
            paid_amount_cents: inst.amount_cents, // Mark as fully paid for consistency
            paid_at: now,
          });

          await db.accounts.update(inst.account_id, {
            status: 'paid',
            updated_at: now,
          });
        }
      }

      // 2. Update Debt
      await db.debts.update(debtId, {
        status: 'paid_off',
        settlement_amount_cents: settlementAmountCents,
        settled_at: now,
        paid_installments: debt.total_installments,
        updated_at: now,
      });

      // 3. Update Wallet (Debit settlement amount ONCE)
      const wallets = await db.wallets.toArray();
      let wallet = wallets[0];
      if (!wallet) {
        wallet = { id: 'default', name: 'Minha Conta', balance_cents: 390000, created_at: now, updated_at: now };
        await db.wallets.add(wallet);
      }

      await db.wallets.update(wallet.id, {
        balance_cents: wallet.balance_cents - settlementAmountCents,
        updated_at: now,
      });

      // 4. Record a SINGLE transaction for the settlement
      await db.transactions.add({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference_id: debtId, // Reference is the Debt itself
        type: 'debt_settlement',
        amount_cents: -settlementAmountCents, // Negative
        date: now,
        description: `Quitação antecipada — ${debt.title}`,
        created_at: now,
      });
    });
  }

  static async cancelDebt(debtId: string): Promise<void> {
    await db.transaction('rw', db.debts, db.debt_installments, db.accounts, async () => {
      await db.debts.update(debtId, { status: 'cancelled', updated_at: new Date() });
      
      const installments = await db.debt_installments.where('debt_id').equals(debtId).toArray();
      for (const inst of installments) {
        if (inst.status !== 'paid') {
          await db.accounts.update(inst.account_id, { status: 'cancelled', updated_at: new Date() });
        }
      }
    });
  }
}
