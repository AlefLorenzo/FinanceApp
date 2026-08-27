import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

export function useBalance() {
  // Get wallet balance (SALDO ATUAL)
  // This is the absolute truth of money physically available based on ATOMIC transactions.
  const wallets = useLiveQuery(() => db.wallets.toArray(), []);
  const currentBalanceCents = wallets && wallets.length > 0 ? wallets[0].balance_cents : 390000; // Initialize visually for MVP

  // Get pending expenses (CONTAS PENDENTES)
  const pendingAccounts = useLiveQuery(() => 
    db.accounts
      .filter(a => a.status === 'pending' && (a.type as string) !== 'income')
      .toArray(), 
  []);
  
  // Get pending incomes (RECEITAS PENDENTES)
  const pendingIncomes = useLiveQuery(() => 
    db.income
      .filter(i => i.status === 'pending')
      .toArray(), 
  []);
  
  if (!pendingAccounts || !pendingIncomes) {
    return { currentBalanceCents, projectedBalanceCents: currentBalanceCents, pendingExpensesCents: 0, pendingIncomesCents: 0 };
  }

  let pendingExpensesCents = 0;
  pendingAccounts.forEach(acc => {
    pendingExpensesCents += acc.amount_cents;
  });

  let pendingIncomesCents = 0;
  pendingIncomes.forEach(inc => {
    pendingIncomesCents += inc.amount_cents;
  });

  // SALDO PROJETADO = Saldo Atual + Receitas Pendentes - Contas Pendentes
  const projectedBalanceCents = currentBalanceCents + pendingIncomesCents - pendingExpensesCents;

  return {
    currentBalanceCents,
    projectedBalanceCents,
    pendingExpensesCents,
    pendingIncomesCents
  };
}
