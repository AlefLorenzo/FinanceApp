import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type {
  Debt,
  DebtInstallment,
  Account
} from '../types';
import { DebtService } from '../services/DebtService';

const DEFAULT_WALLET_BALANCE_CENTS = 0;

export class DebtRepository {
  static async create(
    debt: Omit<
      Debt,
      'id' |
      'paid_installments' |
      'status' |
      'created_at' |
      'updated_at'
    >
  ): Promise<string> {
    return await db.transaction(
      'rw',
      db.debts,
      db.debt_installments,
      db.accounts,
      async () => {
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

        const dueDates =
          DebtService.generateDueDates(
            debt.first_due_date,
            debt.total_installments
          );

        for (
          let i = 0;
          i < debt.total_installments;
          i++
        ) {
          const installmentId = uuidv4();
          const accountId = uuidv4();
          const dueDate = dueDates[i];

          const installment: DebtInstallment = {
            id: installmentId,
            debt_id: debtId,
            account_id: accountId,
            installment_number: i + 1,
            amount_cents:
              debt.installment_amount_cents,
            paid_amount_cents: 0,
            due_date: dueDate,
            status: 'pending',
            created_at: now,
          };

          const account: Account = {
            id: accountId,
            title:
              `${debt.title} - Parcela ${i + 1}/${debt.total_installments}`,
            amount_cents:
              debt.installment_amount_cents,
            due_date: dueDate,
            category_id: debt.category_id,
            status: 'pending',
            type: 'expense',
            debtId,
            debtInstallmentId: installmentId,
            installment_current: i + 1,
            installment_total:
              debt.total_installments,
            created_at: now,
            updated_at: now,
          };

          await db.debt_installments.add(
            installment
          );

          await db.accounts.add(account);
        }

        return debtId;
      }
    );
  }

  static async getAll(): Promise<Debt[]> {
    return await db.debts.toArray();
  }

  static async getById(
    id: string
  ): Promise<Debt | undefined> {
    return await db.debts.get(id);
  }

  static async getInstallments(
    debtId: string
  ): Promise<DebtInstallment[]> {
    const installments =
      await db.debt_installments
        .where('debt_id')
        .equals(debtId)
        .toArray();

    return installments.sort(
      (a, b) =>
        a.installment_number -
        b.installment_number
    );
  }

  static async payInstallment(
    installmentId: string,
    amountCents: number
  ): Promise<void> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return;
    }

    await db.transaction(
      'rw',
      db.debts,
      db.debt_installments,
      db.accounts,
      db.wallets,
      db.transactions,
      async () => {
        const inst =
          await db.debt_installments.get(
            installmentId
          );

        if (!inst) {
          throw new Error(
            'Installment not found'
          );
        }

        const remaining =
          DebtService.remainingCents(inst);

        if (remaining <= 0) return;

        const actualPayment =
          Math.min(amountCents, remaining);

        const newPaidAmount =
          inst.paid_amount_cents +
          actualPayment;

        const isFullyPaid =
          newPaidAmount >=
          inst.amount_cents;

        const newStatus =
          isFullyPaid
            ? 'paid'
            : 'partial';

        const now = new Date();

        await db.debt_installments.update(
          inst.id,
          {
            paid_amount_cents:
              newPaidAmount,
            status: newStatus,
            paid_at:
              isFullyPaid
                ? now
                : undefined,
          }
        );

        await db.accounts.update(
          inst.account_id,
          {
            status:
              isFullyPaid
                ? 'paid'
                : 'pending',
            updated_at: now,
          }
        );

        if (isFullyPaid) {
          const debt =
            await db.debts.get(
              inst.debt_id
            );

          if (debt) {
            const installments =
              await db.debt_installments
                .where('debt_id')
                .equals(inst.debt_id)
                .toArray();

            const paidCount =
              DebtService.countPaidInstallments(
                installments
              );

            await db.debts.update(
              debt.id,
              {
                paid_installments:
                  paidCount,
                status:
                  paidCount >=
                  debt.total_installments
                    ? 'paid_off'
                    : 'active',
                updated_at: now,
              }
            );
          }
        }

        const wallets =
          await db.wallets.toArray();

        let wallet = wallets[0];

        if (!wallet) {
          wallet = {
            id: 'default',
            name: 'Minha Conta',
            balance_cents:
              DEFAULT_WALLET_BALANCE_CENTS,
            created_at: now,
            updated_at: now,
          };

          await db.wallets.add(wallet);
        }

        await db.wallets.update(
          wallet.id,
          {
            balance_cents:
              wallet.balance_cents -
              actualPayment,
            updated_at: now,
          }
        );

        const debt =
          await db.debts.get(
            inst.debt_id
          );

        await db.transactions.add({
          id: uuidv4(),
          wallet_id: wallet.id,
          reference_id: inst.id,
          type: 'debt_paid',
          amount_cents:
            -actualPayment,
          date: now,
          description:
            isFullyPaid
              ? `Pagamento de parcela: ${debt?.title || 'Dívida'} (${inst.installment_number}/${debt?.total_installments})`
              : `Pagamento parcial: ${debt?.title || 'Dívida'} (${inst.installment_number}/${debt?.total_installments})`,
          created_at: now,
        });
      }
    );
  }

  static async settleDebt(
    debtId: string,
    settlementAmountCents: number
  ): Promise<void> {
    if (
      !Number.isFinite(
        settlementAmountCents
      ) ||
      settlementAmountCents < 0
    ) {
      throw new Error(
        'Valor de quitação inválido'
      );
    }

    await db.transaction(
      'rw',
      db.debts,
      db.debt_installments,
      db.accounts,
      db.wallets,
      db.transactions,
      async () => {
        const debt =
          await db.debts.get(debtId);

        if (
          !debt ||
          debt.status === 'paid_off' ||
          debt.status === 'cancelled'
        ) {
          return;
        }

        const now = new Date();

        const installments =
          await db.debt_installments
            .where('debt_id')
            .equals(debtId)
            .toArray();

        for (const inst of installments) {
          if (inst.status === 'paid') {
            continue;
          }

          await db.debt_installments.update(
            inst.id,
            {
              status: 'paid',
              paid_amount_cents:
                inst.amount_cents,
              paid_at: now,
            }
          );

          await db.accounts.update(
            inst.account_id,
            {
              status: 'paid',
              updated_at: now,
            }
          );
        }

        await db.debts.update(
          debtId,
          {
            status: 'paid_off',
            settlement_amount_cents:
              settlementAmountCents,
            settled_at: now,
            paid_installments:
              debt.total_installments,
            updated_at: now,
          }
        );

        const wallets =
          await db.wallets.toArray();

        let wallet = wallets[0];

        if (!wallet) {
          wallet = {
            id: 'default',
            name: 'Minha Conta',
            balance_cents:
              DEFAULT_WALLET_BALANCE_CENTS,
            created_at: now,
            updated_at: now,
          };

          await db.wallets.add(wallet);
        }

        await db.wallets.update(
          wallet.id,
          {
            balance_cents:
              wallet.balance_cents -
              settlementAmountCents,
            updated_at: now,
          }
        );

        await db.transactions.add({
          id: uuidv4(),
          wallet_id: wallet.id,
          reference_id: debtId,
          type: 'debt_settlement',
          amount_cents:
            -settlementAmountCents,
          date: now,
          description:
            `Quitação antecipada — ${debt.title}`,
          created_at: now,
        });
      }
    );
  }

  static async cancelDebt(
    debtId: string
  ): Promise<void> {
    await db.transaction(
      'rw',
      db.debts,
      db.debt_installments,
      db.accounts,
      async () => {
        const now = new Date();

        const debt =
          await db.debts.get(debtId);

        if (!debt) return;

        await db.debts.update(
          debtId,
          {
            status: 'cancelled',
            updated_at: now,
          }
        );

        const installments =
          await db.debt_installments
            .where('debt_id')
            .equals(debtId)
            .toArray();

        for (const inst of installments) {
          if (inst.status !== 'paid') {
            await db.accounts.update(
              inst.account_id,
              {
                status: 'cancelled',
                updated_at: now,
              }
            );
          }
        }
      }
    );
  }
}
