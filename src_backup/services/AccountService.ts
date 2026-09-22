import type { Account, AccountPriority } from '../types';
import { isOverdue } from '../utils/date';
import { differenceInDays, startOfDay, parseISO } from 'date-fns';

export class AccountService {
  static calculatePriority(account: Account): AccountPriority {
    if (account.status === 'paid' || account.status === 'cancelled') {
      return 'normal';
    }

    if (isOverdue(account.due_date)) {
      return 'urgent';
    }

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(account.due_date));
    const diff = differenceInDays(dueDate, today);

    if (diff === 0) return 'urgent'; // due today
    if (diff >= 1 && diff <= 3) return 'next';
    if (diff >= 4 && diff <= 7) return 'attention';
    return 'normal';
  }

  static isAccountOverdue(account: Account): boolean {
    if (account.status === 'paid' || account.status === 'cancelled') {
      return false;
    }
    return isOverdue(account.due_date);
  }
}
