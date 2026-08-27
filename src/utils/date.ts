import { format, isBefore, startOfDay, parseISO } from 'date-fns';

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isOverdue(dueDateISO: string): boolean {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(dueDateISO));
  return isBefore(dueDate, today);
}
