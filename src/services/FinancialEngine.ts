import { formatBRLFromCents } from '../utils/currency';
import type {
  Account,
  Income,
  Reserve,
  DebtInstallment,
  FinancialSummary,
  NextAction
} from '../types';
import { AccountService } from './AccountService';
import { DebtService } from './DebtService';
import { getTodayISO } from '../utils/date';

export class FinancialEngine {
  static calculateSummary(
    accounts: Account[],
    incomes: Income[],
    reserves: Reserve[],
    currentBalanceCents: number,
    debtInstallments: DebtInstallment[] = []
  ): FinancialSummary {
    const today = getTodayISO();
    const currentMonth = today.substring(0, 7);

    let expectedIncomeCents = 0;
    let receivedIncomeCents = 0;

    let totalExpensesCents = 0;
    let paidExpensesCents = 0;
    let overdueExpensesCents = 0;
    let overdueCount = 0;

    // ============================================================
    // INCOME
    // ============================================================

    incomes.forEach(income => {
      if (income.status === 'cancelled') return;

      if (income.status === 'received') {
        receivedIncomeCents += income.amount_cents;
      } else if (income.status === 'pending') {
        expectedIncomeCents += income.amount_cents;
      }
    });

    // ============================================================
    // DEBT MAP
    // ============================================================

    const installmentByAccountId = new Map<string, DebtInstallment>();

    debtInstallments.forEach(installment => {
      installmentByAccountId.set(
        installment.account_id,
        installment
      );
    });

    // ============================================================
    // EXPENSES
    // ============================================================

    accounts
      .filter(account =>
        (account.type as string) !== 'income' &&
        account.status !== 'cancelled'
      )
      .forEach(account => {
        const installment =
          installmentByAccountId.get(account.id);

        // Parcela de dívida
        if (installment) {
          const remaining =
            DebtService.remainingCents(installment);

          totalExpensesCents += remaining;

          if (
            installment.paid_amount_cents >=
            installment.amount_cents
          ) {
            paidExpensesCents += installment.amount_cents;
            return;
          }

          if (DebtService.isOverdue(installment, today)) {
            overdueExpensesCents += remaining;
            overdueCount++;
          }

          return;
        }

        // Conta normal
        totalExpensesCents += account.amount_cents;

        if (account.status === 'paid') {
          paidExpensesCents += account.amount_cents;
          return;
        }

        if (AccountService.isAccountOverdue(account)) {
          overdueExpensesCents += account.amount_cents;
          overdueCount++;
        }
      });

    // ============================================================
    // PENDING VALUES
    // ============================================================

    const pendingExpensesCents =
      Math.max(0, totalExpensesCents);

    const pendingIncomesCents =
      expectedIncomeCents;

    // ============================================================
    // RESERVES
    // ============================================================

    const totalReserveTarget =
      reserves.reduce(
        (sum, reserve) => sum + reserve.target_cents,
        0
      );

    const totalReserveCurrent =
      reserves.reduce(
        (sum, reserve) => sum + reserve.current_cents,
        0
      );

    const reserveNeeded =
      Math.max(
        0,
        totalReserveTarget - totalReserveCurrent
      );

    let suggestedReserveCents = 0;

    if (reserveNeeded > 0 && expectedIncomeCents > 0) {
      suggestedReserveCents = Math.min(
        reserveNeeded,
        Math.floor(expectedIncomeCents * 0.1)
      );
    }

    // ============================================================
    // DEBT METRICS
    // ============================================================

    let totalDebtRemainingCents = 0;
    let monthlyDebtCommitmentCents = 0;
    let overdueDebtInstallmentsCents = 0;

    debtInstallments.forEach(installment => {
      const remaining =
        DebtService.remainingCents(installment);

      if (remaining <= 0) return;

      totalDebtRemainingCents += remaining;

      if (DebtService.isOverdue(installment, today)) {
        overdueDebtInstallmentsCents += remaining;
      }

      if (installment.due_date.startsWith(currentMonth)) {
        monthlyDebtCommitmentCents += remaining;
      }
    });

    // ============================================================
    // BALANCE
    // ============================================================

    const projectedBalanceCents =
      currentBalanceCents +
      pendingIncomesCents -
      pendingExpensesCents;

    // ============================================================
    // FREE MONEY
    //
    // Represents the projected balance after the minimum
    // suggested reserve, never allowing a negative investment
    // recommendation.
    // ============================================================

    const freeMoneyCents =
      projectedBalanceCents -
      suggestedReserveCents;

    const availableForInvestmentCents =
      freeMoneyCents > 0
        ? Math.floor(freeMoneyCents * 0.5)
        : 0;

    const isTight =
      projectedBalanceCents < 0;

    // ============================================================
    // NEXT ACTION
    // ============================================================

    let nextAction: NextAction | null = null;

    // 1. Overdue accounts
    const overdueAccounts = accounts
      .filter(account =>
        (account.type as string) !== 'income' &&
        account.status === 'pending' &&
        AccountService.isAccountOverdue(account)
      )
      .sort((a, b) =>
        a.due_date.localeCompare(b.due_date)
      );

    if (overdueAccounts.length > 0) {
      const account = overdueAccounts[0];

      nextAction = {
        type: 'pay',
        title: 'Conta Atrasada',
        description:
          `Pagar "${account.title}" • ` +
          `Venceu em ${account.due_date
            .split('-')
            .reverse()
            .join('/')}`,
        amountCents: account.amount_cents,
        entityId: account.id,
        priority: 'critical'
      };
    }

    // 2. Income waiting for confirmation
    if (!nextAction) {
      const pendingIncome =
        incomes
          .filter(income =>
            income.status === 'pending' &&
            income.expected_date <= today
          )
          .sort((a, b) =>
            a.expected_date.localeCompare(
              b.expected_date
            )
          );

      if (pendingIncome.length > 0) {
        const income = pendingIncome[0];

        nextAction = {
          type: 'receive',
          title: 'Confirmar Recebimento',
          description:
            `Você já recebeu "${income.title}"? • ` +
            `Esperado em ${income.expected_date
              .split('-')
              .reverse()
              .join('/')}`,
          amountCents: income.amount_cents,
          entityId: income.id,
          priority: 'high'
        };
      }
    }

    // 3. Account due today
    if (!nextAction) {
      const dueToday =
        accounts.filter(account =>
          (account.type as string) !== 'income' &&
          account.status === 'pending' &&
          account.due_date === today
        );

      if (dueToday.length > 0) {
        const account = dueToday[0];

        nextAction = {
          type: 'pay',
          title: 'Vence Hoje',
          description:
            `Pagar "${account.title}" • Vence hoje`,
          amountCents: account.amount_cents,
          entityId: account.id,
          priority: 'high'
        };
      }
    }

    // 4. Reserve
    if (
      !nextAction &&
      suggestedReserveCents > 0 &&
      currentBalanceCents >= suggestedReserveCents
    ) {
      nextAction = {
        type: 'reserve',
        title: 'Proteger seu Futuro',
        description:
          `Separar R$ ${formatBRLFromCents(
            suggestedReserveCents
          ).replace('R$ ', '')} para sua reserva de emergência`,
        amountCents: suggestedReserveCents,
        priority: 'medium'
      };
    }

    // 5. Investment
    if (
      !nextAction &&
      availableForInvestmentCents > 0
    ) {
      nextAction = {
        type: 'invest',
        title: 'Dinheiro Livre para Investir',
        description:
          `Considere planejar o aporte de R$ ` +
          `${formatBRLFromCents(
            availableForInvestmentCents
          ).replace('R$ ', '')} este mês`,
        amountCents: availableForInvestmentCents,
        priority: 'low'
      };
    }

    return {
      currentBalanceCents,
      projectedBalanceCents,

      expectedIncomeCents,
      receivedIncomeCents,

      totalExpensesCents,
      paidExpensesCents,
      overdueExpensesCents,

      suggestedReserveCents,

      freeMoneyCents,
      availableForInvestmentCents,

      isTight,

      nextAction,
      overdueCount,

      totalDebtRemainingCents,
      monthlyDebtCommitmentCents,
      overdueDebtInstallmentsCents
    };
  }

  static calculateScore(
    summary: FinancialSummary
  ): number {
    let score = 100;

    if (summary.overdueCount > 0) {
      score -= summary.overdueCount * 15;
    }

    if (summary.isTight) {
      score -= 20;
    }

    return Math.max(
      0,
      Math.min(100, score)
    );
  }
}
