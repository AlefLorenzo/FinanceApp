import { formatBRLFromCents } from '../utils/currency';
import type { Account, Income, Reserve, DebtInstallment, FinancialSummary, NextAction } from '../types';
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

    let expectedIncomeCents = 0;
    let receivedIncomeCents = 0;
    let totalExpensesCents = 0;
    let paidExpensesCents = 0;
    let overdueExpensesCents = 0;
    let overdueCount = 0;

    // 1. Process Income
    incomes.forEach(inc => {
      if (inc.status !== 'cancelled') {
        expectedIncomeCents += inc.amount_cents;
        if (inc.status === 'received') {
          receivedIncomeCents += inc.amount_cents;
        }
      }
    });

    // 2. Process Expenses (Debt installments are already included as Accounts, so this naturally covers projected balance and total expenses without duplication)
    accounts.filter(a => (a.type as string) !== 'income' && a.status !== 'cancelled').forEach(acc => {
      totalExpensesCents += acc.amount_cents;
      
      // Partial debt payments reflect on account status. If account is pending/partial, 
      // we only count what is truly paid if we had partial tracking on Account. 
      // For MVP, if it's 'partial', Account is 'pending'. We don't add to paidExpensesCents.
      if (acc.status === 'paid') {
        paidExpensesCents += acc.amount_cents;
      } else if (acc.status === 'pending' || acc.status === 'partial' as any) {
        if (AccountService.isAccountOverdue(acc)) {
          overdueExpensesCents += acc.amount_cents;
          overdueCount++;
        }
      }
    });

    const pendingExpensesCents = totalExpensesCents - paidExpensesCents;
    const pendingIncomesCents = expectedIncomeCents - receivedIncomeCents;

    // 3. Reserves calculation
    const totalReserveTarget = reserves.reduce((sum, r) => sum + r.target_cents, 0);
    const totalReserveCurrent = reserves.reduce((sum, r) => sum + r.current_cents, 0);
    const reserveNeeded = totalReserveTarget - totalReserveCurrent;
    
    let suggestedReserveCents = 0;
    if (reserveNeeded > 0) {
      suggestedReserveCents = Math.min(reserveNeeded, expectedIncomeCents * 0.1); 
    }

    // 4. Debt Reporting Metrics
    let totalDebtRemainingCents = 0;
    let monthlyDebtCommitmentCents = 0;
    let overdueDebtInstallmentsCents = 0;
    
    const currentMonth = today.substring(0, 7); // YYYY-MM

    debtInstallments.forEach(inst => {
      const remaining = DebtService.remainingCents(inst);
      if (remaining > 0) {
        totalDebtRemainingCents += remaining;
        
        if (DebtService.isOverdue(inst, today)) {
          overdueDebtInstallmentsCents += remaining;
        }
        
        if (inst.due_date.startsWith(currentMonth)) {
          monthlyDebtCommitmentCents += inst.amount_cents;
        }
      }
    });

    // 5. Balance Calculations
    const projectedBalanceCents = currentBalanceCents + pendingIncomesCents - pendingExpensesCents;
    const freeMoneyCents = expectedIncomeCents - totalExpensesCents - suggestedReserveCents;
    const availableForInvestmentCents = freeMoneyCents > 0 ? freeMoneyCents * 0.5 : 0; 
    const isTight = freeMoneyCents < 0;

    // 6. NextAction logic (Priorities)
    let nextAction: NextAction | null = null;

    // Priority 1: Critical Overdue Bills
    const criticalOverdue = accounts.filter(
      a => (a.status === 'pending' || a.status === 'partial' as any) && (a.type as string) !== 'income' && AccountService.isAccountOverdue(a)
    ).sort((a, b) => a.due_date.localeCompare(b.due_date));

    if (criticalOverdue.length > 0) {
      nextAction = {
        type: 'pay',
        title: 'Conta Atrasada',
        description: `Pagar "${criticalOverdue[0].title}" • Venceu em ${criticalOverdue[0].due_date.split('-').reverse().join('/')}`,
        amountCents: criticalOverdue[0].amount_cents,
        entityId: criticalOverdue[0].id,
        priority: 'critical'
      };
    }

    // Priority 2: Receive pending income expected by today or earlier
    if (!nextAction) {
      const pendingIncomeToday = incomes.filter(
        i => i.status === 'pending' && i.expected_date <= today
      ).sort((a, b) => a.expected_date.localeCompare(b.expected_date));

      if (pendingIncomeToday.length > 0) {
        nextAction = {
          type: 'receive',
          title: 'Confirmar Recebimento',
          description: `Você já recebeu "${pendingIncomeToday[0].title}"? • Esperado em ${pendingIncomeToday[0].expected_date.split('-').reverse().join('/')}`,
          amountCents: pendingIncomeToday[0].amount_cents,
          entityId: pendingIncomeToday[0].id,
          priority: 'high'
        };
      }
    }

    // Priority 3: Pay bill due today
    if (!nextAction) {
      const dueToday = accounts.filter(
        a => (a.status === 'pending' || a.status === 'partial' as any) && (a.type as string) !== 'income' && a.due_date === today
      );

      if (dueToday.length > 0) {
        nextAction = {
          type: 'pay',
          title: 'Vence Hoje',
          description: `Pagar "${dueToday[0].title}" • Vence hoje`,
          amountCents: dueToday[0].amount_cents,
          entityId: dueToday[0].id,
          priority: 'high'
        };
      }
    }

    // Priority 4: Reserve Emergency Aporte
    if (!nextAction && suggestedReserveCents > 0 && currentBalanceCents >= suggestedReserveCents) {
      nextAction = {
        type: 'reserve',
        title: 'Proteger seu Futuro',
        description: `Separar R$ ${formatBRLFromCents(suggestedReserveCents).replace('R$ ', '')} para sua reserva de emergência`,
        amountCents: suggestedReserveCents,
        priority: 'medium'
      };
    }

    // Priority 5: Invest Tip
    if (!nextAction && availableForInvestmentCents > 0) {
      nextAction = {
        type: 'invest',
        title: 'Dinheiro Livre para Investir',
        description: `Considere planejar o aporte de R$ ${formatBRLFromCents(availableForInvestmentCents).replace('R$ ', '')} este mês`,
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
      // Phase 2
      totalDebtRemainingCents,
      monthlyDebtCommitmentCents,
      overdueDebtInstallmentsCents
    };
  }

  static calculateScore(summary: FinancialSummary): number {
    let score = 100;
    
    // Penalties
    if (summary.overdueCount > 0) score -= (summary.overdueCount * 15);
    if (summary.isTight) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }
}
