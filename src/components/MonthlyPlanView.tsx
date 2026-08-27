import { formatBRLFromCents } from '../utils/currency';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Account, Income } from '../types';
import { AccountService } from '../services/AccountService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function MonthProgressBar({ label, valueCents, totalCents, color }: {
  label: string; valueCents: number; totalCents: number; color: string;
}) {
  const pct = totalCents > 0 ? Math.min(100, Math.round((valueCents / totalCents) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-bold text-gray-700">{label}</span>
        <span className="text-sm font-black text-gray-900">
          {formatBRLFromCents(valueCents)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{pct}% de R$ {formatBRLFromCents(totalCents).replace(",00", "").replace("R$ ", "")}</p>
    </div>
  );
}

export function MonthlyPlanView() {
  const summary = useFinancialSummary();
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const incomes = useLiveQuery(() => db.income.toArray(), []) || [];
  const settings = useLiveQuery(() => db.settings.toArray(), [])?.[0];
  const isHidden = settings?.hide_values ?? false;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, 'MMMM yyyy', { locale: ptBR });
  const dayOfMonth = getDate(now);
  const daysTotal = getDaysInMonth(now);
  const monthProgressPct = Math.round((dayOfMonth / daysTotal) * 100);

  const fmt = (cents: number) =>
    isHidden ? '••••' : `${formatBRLFromCents(cents)}`;

  // Group pending expenses by week
  const monthStart_iso = format(monthStart, 'yyyy-MM-dd');
  const monthEnd_iso = format(monthEnd, 'yyyy-MM-dd');

  const pendingExpenses = (accounts as Account[])
    .filter(a => (a.type as string) !== 'income' && a.status === 'pending' && a.due_date >= monthStart_iso && a.due_date <= monthEnd_iso)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const pendingIncomes = (incomes as Income[])
    .filter(inc => inc.status === 'pending' && inc.expected_date >= monthStart_iso && inc.expected_date <= monthEnd_iso)
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date));

  // Budget health
  const healthColor = summary.isTight
    ? 'text-red-500'
    : summary.projectedBalanceCents < summary.currentBalanceCents
    ? 'text-yellow-500'
    : 'text-green-500';

  const HealthIcon = summary.isTight
    ? TrendingDown
    : summary.projectedBalanceCents > summary.currentBalanceCents
    ? TrendingUp
    : Minus;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Month Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Meu Mês</p>
          <h2 className="text-xl font-black capitalize mb-4">{monthLabel}</h2>

          {/* Month progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Dia {dayOfMonth}</span>
              <span>{daysTotal - dayOfMonth} dias restantes</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${monthProgressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{monthProgressPct}% do mês concluído</p>
          </div>

          {/* Health indicator */}
          <div className={`flex items-center gap-2 ${healthColor}`}>
            <HealthIcon className="w-5 h-5" />
            <span className="text-sm font-bold">
              {summary.isTight
                ? 'Orçamento apertado — atenção necessária'
                : summary.projectedBalanceCents > summary.currentBalanceCents
                ? 'Mês saudável — você vai fechar no azul'
                : 'Mês equilibrado'}
            </span>
          </div>
        </div>
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Fluxo do mês */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Fluxo do Mês</h3>
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 space-y-5">
          <MonthProgressBar
            label="💰 Receitas Recebidas"
            valueCents={summary.receivedIncomeCents}
            totalCents={summary.expectedIncomeCents}
            color="bg-green-500"
          />
          <MonthProgressBar
            label="📋 Contas Pagas"
            valueCents={summary.paidExpensesCents}
            totalCents={summary.totalExpensesCents}
            color="bg-blue-500"
          />
          {summary.overdueExpensesCents > 0 && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-red-700 font-bold text-sm">
                🔴 {summary.overdueCount} conta(s) atrasada(s): {fmt(summary.overdueExpensesCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Projeção de fechamento */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Projeção de Fechamento</h3>
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Saldo atual</span>
            <span className="font-black text-gray-900">{fmt(summary.currentBalanceCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">+ Receitas pendentes</span>
            <span className="font-black text-green-600">
              {fmt(summary.expectedIncomeCents - summary.receivedIncomeCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">− Contas pendentes</span>
            <span className="font-black text-red-500">
              {fmt(summary.totalExpensesCents - summary.paidExpensesCents)}
            </span>
          </div>
          {summary.suggestedReserveCents > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">− Reserva sugerida</span>
              <span className="font-black text-blue-500">{fmt(summary.suggestedReserveCents)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-gray-100 flex justify-between">
            <span className="font-black text-gray-900">Saldo projetado</span>
            <span className={`font-black text-lg ${summary.projectedBalanceCents >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {fmt(summary.projectedBalanceCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Dinheiro livre</span>
            <span className={`font-black text-sm ${summary.freeMoneyCents >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
              {fmt(summary.freeMoneyCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Próximas contas do mês */}
      {pendingExpenses.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
            Contas Pendentes ({pendingExpenses.length})
          </h3>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {pendingExpenses.map(bill => {
              const isOverdue = AccountService.isAccountOverdue(bill);
              return (
                <div key={bill.id} className="flex items-center justify-between px-5 py-3.5 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{isOverdue ? '🔴' : '🔵'}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{bill.title}</p>
                      <p className="text-xs text-gray-400">
                        {isOverdue ? '⚠️ Atrasada' : format(new Date(bill.due_date + 'T00:00:00'), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black text-sm shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                    {isHidden ? '••••' : `${formatBRLFromCents(bill.amount_cents)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Receitas do mês */}
      {pendingIncomes.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
            Receitas Esperadas ({pendingIncomes.length})
          </h3>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {pendingIncomes.map(inc => (
              <div key={inc.id} className="flex items-center justify-between px-5 py-3.5 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">💰</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(inc.expected_date + 'T00:00:00'), "d 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className="font-black text-sm text-green-600 shrink-0">
                  {isHidden ? '••••' : `${formatBRLFromCents(inc.amount_cents)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

