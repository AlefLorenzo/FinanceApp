import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, ChevronRight, Circle, Trash2 } from 'lucide-react';
import { db } from '../data/db';
import { useAccounts } from '../hooks/useAccounts';
import { AccountService } from '../services/AccountService';
import { IncomeRepository } from '../repository/IncomeRepository';
import type { Account, Income } from '../types';
import { formatBRLFromCents } from '../utils/currency';
import { useToast } from './ui/ToastContext';

interface AccountListProps {
  limit?: number;
  hidePaid?: boolean;
  type?: 'expense' | 'income';
}

export function AccountList({
  limit,
  hidePaid = false,
  type = 'expense'
}: AccountListProps) {
  const { accounts, togglePaid, deleteAccount } = useAccounts();
  const { showToast } = useToast();

  const incomes = useLiveQuery(
    () => db.income.toArray(),
    []
  );

  const [page, setPage] = useState(0);
  const pageSize = limit || 10;
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleSoftDelete = (id: string, title: string) => {
    setDeletedIds(prev => new Set(prev).add(id));
    
    const timeoutId = setTimeout(async () => {
      setDeletedIds(current => {
        if (current.has(id)) {
          deleteAccount(id).catch(() => {
            showToast('Erro ao excluir a despesa definitivamente.', 'error');
          });
          const next = new Set(current);
          next.delete(id);
          return next;
        }
        return current;
      });
    }, 6000);

    showToast(`Despesa "${title}" excluída.`, 'info', {
      label: 'Desfazer',
      onClick: () => {
        clearTimeout(timeoutId);
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredItems = useMemo(() => {
    if (type === 'income') {
      const receivedIncomes = ((incomes || []) as Income[])
        .filter(income => income.status === 'received')
        .map(income => ({
          id: income.id,
          title: income.title,
          amount_cents: income.amount_cents,
          date: income.received_date || income.expected_date,
          status: 'received' as const,
          kind: 'income' as const,
          original: income
        }));

      return receivedIncomes.sort((a, b) =>
        b.date.localeCompare(a.date)
      );
    }

    let expenses = (accounts as Account[])
      .filter(account => account.type === 'expense' && account.id && !deletedIds.has(account.id));

    if (hidePaid) {
      expenses = expenses.filter(account => account.status !== 'paid');
    }

    return expenses.map(account => ({
      id: account.id,
      title: account.title,
      amount_cents: account.amount_cents,
      date: account.due_date,
      status: account.status,
      kind: 'expense' as const,
      original: account
    })).sort((a, b) => {
      const aPaid = a.status === 'paid';
      const bPaid = b.status === 'paid';

      if (aPaid && !bPaid) return 1;
      if (!aPaid && bPaid) return -1;

      return a.date.localeCompare(b.date);
    });
  }, [accounts, incomes, type, hidePaid]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages - 1);

  const visibleItems = limit
    ? filteredItems.slice(0, limit)
    : filteredItems.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
      );

  const handleIncomePending = async (id: string, title: string) => {
    try {
      await IncomeRepository.markAsPending(id);
      showToast(`Recebimento de "${title}" desfeito.`, 'info');
    } catch {
      showToast('Erro ao desfazer recebimento.', 'error');
    }
  };

  const [loadingExpenseIds, setLoadingExpenseIds] = useState<Set<string>>(new Set());

  const handleExpenseToggle = async (account: Account) => {
    if (!account.id || loadingExpenseIds.has(account.id)) return;
    const wasPaid = account.status === 'paid';
    setLoadingExpenseIds(prev => new Set(prev).add(account.id!));
    try {
      await togglePaid(account.id, wasPaid);
      if (!wasPaid) {
        showToast(`Pagamento registrado. ${formatBRLFromCents(account.amount_cents)} saíram do seu saldo.`, 'success');
      } else {
        showToast(`Pagamento desfeito.`, 'info');
      }
    } catch {
      showToast('Erro ao atualizar a conta. Tente novamente.', 'error');
    } finally {
      setLoadingExpenseIds(prev => {
        const next = new Set(prev);
        next.delete(account.id!);
        return next;
      });
    }
  };

  if (filteredItems.length === 0) {
    return (
      <div className="rounded-[2rem] border border-gray-100 bg-white p-8 md:p-12 text-center shadow-sm">
        <div className="text-4xl md:text-5xl mb-4">
          {type === 'income' ? '🌿' : '🍃'}
        </div>
        <h3 className="text-lg font-black text-gray-800 mb-2">
          {type === 'income' ? 'Nenhuma receita por enquanto' : 'Tudo tranquilo por aqui'}
        </h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
          {type === 'income'
            ? 'Você ainda não registrou nenhum recebimento.'
            : 'Você ainda não registrou nenhuma despesa. Quando a próxima chegar, você pode adicioná-la por aqui.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleItems.map(item => {
        const isIncome = item.kind === 'income';
        const isPaid = !isIncome && item.status === 'paid';

        const originalAccount = !isIncome
          ? item.original as Account
          : null;

        const isOverdue =
          !isIncome &&
          originalAccount &&
          AccountService.isAccountOverdue(originalAccount);

        const isToday =
          item.date === today;

        return (
          <div
            key={`${item.kind}-${item.id}`}
            className={`group flex items-center gap-3 rounded-2xl border bg-white p-4 transition-all ${
              isPaid
                ? 'border-gray-100 opacity-60'
                : isIncome
                  ? 'border-green-100'
                  : isOverdue
                    ? 'border-red-200'
                    : 'border-gray-100'
            }`}
          >
            <button
              type="button"
              disabled={!isIncome && item.id != null && loadingExpenseIds.has(item.id)}
              onClick={() =>
                isIncome
                  ? item.id && handleIncomePending(item.id, item.title)
                  : handleExpenseToggle(item.original as Account)
              }
              className="shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={
                isIncome
                  ? `Desfazer recebimento de ${item.title}`
                  : isPaid
                    ? `Desfazer pagamento de ${item.title}`
                    : `Marcar ${item.title} como pago`
              }
              title={
                isIncome
                  ? 'Marcar como não recebida'
                  : isPaid
                    ? 'Marcar como pendente'
                    : 'Marcar como pago'
              }
            >
              {!isIncome && item.id != null && loadingExpenseIds.has(item.id) ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-400 animate-pulse">
                  <Circle size={20} />
                </div>
              ) : isIncome ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check size={18} strokeWidth={3} />
                </div>
              ) : isPaid ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Check size={18} strokeWidth={3} />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <Circle size={20} />
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`truncate text-sm font-bold ${
                    isPaid
                      ? 'text-gray-400 line-through'
                      : isIncome
                        ? 'text-gray-900'
                        : 'text-gray-900'
                  }`}
                >
                  {item.title}
                </p>

                {isIncome && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    RECEBIDA
                  </span>
                )}

                {!isIncome && isPaid && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    PAGO
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {isIncome ? 'Recebido em' : 'Vencimento'}{' '}
                  {item.date.split('-').reverse().join('/')}
                </span>

                {!isIncome && isOverdue && !isPaid && (
                  <span className="text-[10px] font-bold text-red-500">
                    ATRASADA
                  </span>
                )}

                {!isIncome && isToday && !isPaid && !isOverdue && (
                  <span className="text-[10px] font-bold text-orange-500">
                    HOJE
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p
                className={`text-sm font-black ${
                  isIncome
                    ? 'text-green-600'
                    : isPaid
                      ? 'text-gray-400'
                      : 'text-red-600'
                }`}
              >
                {isIncome ? '+' : '-'}
                {formatBRLFromCents(item.amount_cents)}
              </p>

              {isIncome && (
                <button
                  type="button"
                  onClick={() => item.id && handleIncomePending(item.id, item.title)}
                  className="mt-1 text-[10px] font-bold text-gray-400 hover:text-gray-600"
                >
                  Desfazer recebimento
                </button>
              )}
            </div>

            {!isIncome && (
              <button
                type="button"
                onClick={() => item.id && handleSoftDelete(item.id, item.title)}
                className="shrink-0 rounded-lg p-2.5 md:p-2 text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500"
                aria-label={`Excluir despesa ${item.title}`}
                title="Excluir"
              >
                <Trash2 size={18} className="md:w-4 md:h-4" />
              </button>
            )}
          </div>
        );
      })}

      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <span className="text-xs text-gray-400">
            Página {currentPage + 1} de {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() =>
              setPage(p => Math.min(totalPages - 1, p + 1))
            }
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-30"
          >
            Próxima
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

