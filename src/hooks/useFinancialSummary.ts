import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { FinancialEngine } from '../services/FinancialEngine';
import type { FinancialSummary } from '../types';

export function useFinancialSummary(): FinancialSummary {
  // Query all necessary tables dynamically and reactively via Dexie useLiveQuery
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const incomes = useLiveQuery(() => db.income.toArray(), []) || [];
  const reserves = useLiveQuery(() => db.reserves.toArray(), []) || [];
  const debtInstallments = useLiveQuery(() => db.debt_installments.toArray(), []) || [];

  // Rigorous Wallet balance logic
  const currentBalanceCents = wallets.length > 0 ? wallets[0].balance_cents : 390000; // visual initial MVP balance

  // Calculate the single immutable summary source of truth
  return FinancialEngine.calculateSummary(accounts, incomes, reserves, currentBalanceCents, debtInstallments);
}
