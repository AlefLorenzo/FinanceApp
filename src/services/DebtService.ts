import type { DebtInstallment } from '../types';
import { getTodayISO } from '../utils/date';

/**
 * Computed installment status at runtime.
 * 'overdue' is derived from due_date vs today, NOT stored in the DB,
 * so the app remains correct even after several days without being opened.
 */
export type ComputedInstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export class DebtService {
  /**
   * Determines the real status of an installment at the moment of evaluation.
   *
   * Rules:
   * - paid: paid_amount_cents >= amount_cents
   * - partial: 0 < paid_amount_cents < amount_cents (regardless of due_date)
   * - overdue: not paid/partial AND due_date < today
   * - pending: not paid/partial AND due_date >= today
   */
  static getInstallmentStatus(
    installment: Pick<DebtInstallment, 'amount_cents' | 'paid_amount_cents' | 'due_date' | 'status'>,
    today: string = getTodayISO()
  ): ComputedInstallmentStatus {
    if (installment.paid_amount_cents >= installment.amount_cents) return 'paid';
    if (installment.paid_amount_cents > 0) return 'partial';
    if (installment.due_date < today) return 'overdue';
    return 'pending';
  }

  static isOverdue(
    installment: Pick<DebtInstallment, 'amount_cents' | 'paid_amount_cents' | 'due_date'>,
    today: string = getTodayISO()
  ): boolean {
    return (
      installment.paid_amount_cents < installment.amount_cents &&
      installment.due_date < today
    );
  }

  static remainingCents(installment: Pick<DebtInstallment, 'amount_cents' | 'paid_amount_cents'>): number {
    return Math.max(0, installment.amount_cents - installment.paid_amount_cents);
  }

  /**
   * Calculates the total remaining amount for a debt from its installments.
   * This is the source of truth — not debt.current_amount_cents.
   */
  static calculateDebtRemaining(installments: DebtInstallment[]): number {
    return installments.reduce((sum, inst) => sum + DebtService.remainingCents(inst), 0);
  }

  /**
   * Counts paid installments from the installments array.
   * Use this to verify / recalculate debt.paid_installments.
   */
  static countPaidInstallments(installments: DebtInstallment[]): number {
    return installments.filter(i => i.paid_amount_cents >= i.amount_cents).length;
  }

  /**
   * Generates the due dates for each installment starting from first_due_date,
   * incrementing by 1 month per installment.
   */
  static generateDueDates(firstDueDate: string, count: number): string[] {
    const dates: string[] = [];
    const [year, month, day] = firstDueDate.split('-').map(Number);
    for (let i = 0; i < count; i++) {
      const d = new Date(year, month - 1 + i, day);
      // Handle month overflow (e.g. Jan 31 + 1 month → Feb 28)
      if (d.getDate() !== day) {
        d.setDate(0); // last day of previous month
      }
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }
}
