import { formatBRLFromCents } from '../utils/currency';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { useState, useEffect } from 'react';
import { X, BellOff, CheckCheck } from 'lucide-react';
import { AccountRepository } from '../repository/AccountRepository';
import { IncomeRepository } from '../repository/IncomeRepository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Account, Income } from '../types';
import { AccountService } from '../services/AccountService';
import { useToast } from './ui/ToastContext';

type NotifEntry =
  | { kind: 'account'; data: Account }
  | { kind: 'income'; data: Income };

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const incomes = useLiveQuery(() => db.income.toArray(), []) || [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const { showToast } = useToast();

  const [loadingBillIds, setLoadingBillIds] = useState<Set<string>>(new Set());
  const [loadingIncomeIds, setLoadingIncomeIds] = useState<Set<string>>(new Set());

  // Suporte a ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Build notifications list
  const notifications: NotifEntry[] = [];

  // 1. Overdue bills (highest priority)
  accounts
    .filter(a => (a.type as string) !== 'income' && a.status === 'pending' && AccountService.isAccountOverdue(a))
    .forEach(a => notifications.push({ kind: 'account', data: a }));

  // 2. Bills due today
  accounts
    .filter(a => (a.type as string) !== 'income' && a.status === 'pending' && a.due_date === today && !AccountService.isAccountOverdue(a))
    .forEach(a => notifications.push({ kind: 'account', data: a }));

  // 3. Bills due tomorrow
  accounts
    .filter(a => (a.type as string) !== 'income' && a.status === 'pending' && a.due_date === tomorrow)
    .forEach(a => notifications.push({ kind: 'account', data: a }));

  // 4. Pending income due today / past-due
  incomes
    .filter(inc => inc.status === 'pending' && inc.expected_date <= today)
    .forEach(inc => notifications.push({ kind: 'income', data: inc }));

  const handlePayBill = async (id: string) => {
    if (loadingBillIds.has(id)) return;
    setLoadingBillIds(prev => new Set(prev).add(id));
    try {
      await AccountRepository.markAsPaid(id);
      showToast('Conta paga com sucesso!', 'success');
    } catch {
      showToast('Erro ao pagar a conta. Tente novamente.', 'error');
    } finally {
      setLoadingBillIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReceiveIncome = async (id: string) => {
    if (loadingIncomeIds.has(id)) return;
    setLoadingIncomeIds(prev => new Set(prev).add(id));
    try {
      await IncomeRepository.markAsReceived(id);
      showToast('Receita recebida com sucesso!', 'success');
    } catch {
      showToast('Erro ao registrar a receita. Tente novamente.', 'error');
    } finally {
      setLoadingIncomeIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getAccountLabel = (a: Account) => {
    const isOverdue = AccountService.isAccountOverdue(a);
    if (isOverdue) return { icon: '🔴', badge: 'ATRASADA', badgeColor: 'bg-red-100 text-red-700' };
    if (a.due_date === today) return { icon: '🟡', badge: 'HOJE', badgeColor: 'bg-yellow-100 text-yellow-700' };
    return { icon: '🔵', badge: 'AMANHÃ', badgeColor: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Notificações"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900">Notificações</h2>
            {notifications.length > 0 && (
              <p className="text-xs text-gray-400">{notifications.length} pendente{notifications.length > 1 ? 's' : ''}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <BellOff className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 font-bold text-sm">Nenhuma notificação</p>
              <p className="text-gray-300 text-xs mt-1">Suas finanças estão em dia! 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif, i) => {
                if (notif.kind === 'account') {
                  const a = notif.data;
                  const { icon, badge, badgeColor } = getAccountLabel(a);
                  const fmtAmt = `${formatBRLFromCents(a.amount_cents)}`;
                  const dueDateLabel = format(new Date(a.due_date + 'T00:00:00'), "d 'de' MMM", { locale: ptBR });
                  return (
                    <div key={`acc-${a.id}-${i}`} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                            {a.debtId && (
                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                 💳 Parcela {a.installment_current}/{a.installment_total}
                               </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-gray-900 truncate">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Vence {dueDateLabel} · <span className="font-bold text-gray-700">{fmtAmt}</span></p>
                          <button
                            onClick={() => handlePayBill(a.id!)}
                            disabled={a.id != null && loadingBillIds.has(a.id!)}
                            className="mt-3 w-full bg-red-600 text-white font-black py-2.5 px-4 rounded-xl text-xs hover:bg-red-700 active:scale-[.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {a.id != null && loadingBillIds.has(a.id!) ? 'Pagando…' : '✓ PAGAR AGORA'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const inc = notif.data;
                  const fmtAmt = `${formatBRLFromCents(inc.amount_cents)}`;
                  const expectedLabel = inc.expected_date <= format(new Date(), 'yyyy-MM-dd')
                    ? 'Esperada hoje ou antes'
                    : format(new Date(inc.expected_date + 'T00:00:00'), "d 'de' MMM", { locale: ptBR });
                  return (
                    <div key={`inc-${inc.id}-${i}`} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">💰</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">RECEITA</span>
                          </div>
                          <p className="font-bold text-sm text-gray-900 truncate">{inc.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{expectedLabel} · <span className="font-bold text-gray-700">{fmtAmt}</span></p>
                          <button
                            onClick={() => handleReceiveIncome(inc.id!)}
                            disabled={inc.id != null && loadingIncomeIds.has(inc.id!)}
                            className="mt-3 w-full bg-green-600 text-white font-black py-2.5 px-4 rounded-xl text-xs hover:bg-green-700 active:scale-[.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {inc.id != null && loadingIncomeIds.has(inc.id!) ? 'Recebendo…' : '✓ RECEBI ESTE VALOR'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 p-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCheck className="w-4 h-4" />
              <span>Marque como pago ou recebido para atualizar o saldo.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
