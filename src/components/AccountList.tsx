import { useEffect, useState } from 'react';
import { formatBRLFromCents } from '../utils/currency';
import { useAccounts } from '../hooks/useAccounts';
import { AccountService } from '../services/AccountService';
import { getTodayISO } from '../utils/date';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Account } from '../types';

interface Props {
  limit?: number;
  hidePaid?: boolean;
  type?: 'expense' | 'income';
}

const ITEMS_PER_PAGE = 4;

export function AccountList({ limit, hidePaid, type }: Props) {
  const { accounts, togglePaid } = useAccounts();
  const today = getTodayISO();

  const [currentPage, setCurrentPage] = useState(1);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'next':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'attention':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      default:
        return 'text-blue-700 bg-blue-100 border-blue-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'next':
        return 'Próximo';
      case 'attention':
        return 'Atenção';
      default:
        return 'Futura';
    }
  };

  const getSortScore = (account: Account) => {
    if (account.status === 'paid') return 999;

    if (AccountService.isAccountOverdue(account)) return 1;
    if (account.due_date === today) return 2;

    const priority = AccountService.calculatePriority(account);

    if (priority === 'next') return 3;
    if (priority === 'attention') return 4;

    return 5;
  };

  let filteredAccounts = [...accounts];

  if (type) {
    filteredAccounts = filteredAccounts.filter(
      account => account.type === type
    );
  }

  if (hidePaid) {
    filteredAccounts = filteredAccounts.filter(
      account => account.status !== 'paid'
    );
  }

  filteredAccounts.sort((a, b) => {
    const scoreA = getSortScore(a);
    const scoreB = getSortScore(b);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    return a.due_date.localeCompare(b.due_date);
  });

  /*
   * HOME
   * Quando o componente recebe "limit", mantém o comportamento antigo:
   * mostra somente a quantidade solicitada e não cria paginação.
   */
  if (limit) {
    filteredAccounts = filteredAccounts.slice(0, limit);
  }

  /*
   * PÁGINA CONTAS
   * Sem "limit", a lista completa é dividida em páginas de 4.
   */
  const totalPages = limit
    ? 1
    : Math.max(1, Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE));

  /*
   * Se filtros ou quantidade de contas mudarem e a página atual
   * deixar de existir, volta automaticamente para a última página válida.
   */
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  /*
   * Quando mudar o tipo ou esconder/mostrar contas pagas,
   * começa novamente na primeira página.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [type, hidePaid]);

  if (filteredAccounts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-300">
        {type === 'income'
          ? 'Nenhuma receita cadastrada.'
          : 'Nenhuma despesa cadastrada.'}
      </div>
    );
  }

  const startIndex = limit
    ? 0
    : (currentPage - 1) * ITEMS_PER_PAGE;

  const visibleAccounts = limit
    ? filteredAccounts
    : filteredAccounts.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
      );

  return (
    <div className="space-y-4 w-full">

      <div className="space-y-3 w-full">
        {visibleAccounts.map(account => {
          const priority = AccountService.calculatePriority(account);
          const isPaid = account.status === 'paid';
          const isOverdue = AccountService.isAccountOverdue(account);
          const isToday = account.due_date === today && !isPaid;

          return (
            <div
              key={account.id}
              className={`w-full p-4 rounded-2xl shadow-sm border-l-4 bg-white flex items-center justify-between transition-all gap-3 ${
                isPaid
                  ? 'border-gray-200 opacity-60'
                  : (account.type as string) === 'income'
                    ? 'border-green-500'
                    : isOverdue
                      ? 'border-red-600'
                      : isToday
                        ? 'border-yellow-500'
                        : 'border-blue-500'
              }`}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <h3
                  className={`font-bold text-base break-words whitespace-normal ${
                    isPaid
                      ? 'line-through text-gray-500'
                      : 'text-gray-900'
                  }`}
                >
                  {account.title}
                </h3>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 shrink-0">
                    {account.due_date.split('-').reverse().join('/')}
                  </span>

                  {!isPaid && (
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        isOverdue
                          ? 'text-red-700 bg-red-100 border-red-200'
                          : isToday
                            ? 'text-yellow-700 bg-yellow-100 border-yellow-200'
                            : getPriorityColor(priority)
                      }`}
                    >
                      {isOverdue
                        ? 'Atrasada'
                        : isToday
                          ? 'Vence Hoje'
                          : getPriorityLabel(priority)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">

                <span
                  className={`font-bold text-sm sm:text-base tracking-tight amount-text text-right whitespace-nowrap ${
                    isPaid
                      ? 'text-gray-400'
                      : account.type === 'expense'
                        ? 'text-red-600'
                        : 'text-green-600'
                  }`}
                >
                  {account.type === 'expense' ? '- ' : '+ '}
                  {formatBRLFromCents(account.amount_cents)}
                </span>

                <button
                  onClick={() => togglePaid(account.id, isPaid)}
                  className="p-1 rounded-full hover:bg-gray-100 transition focus:outline-none shrink-0"
                  aria-label={
                    isPaid
                      ? 'Marcar como pendente'
                      : 'Marcar como pago'
                  }
                >
                  {isPaid ? (
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300 hover:text-gray-400" />
                  )}
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">

          <button
            type="button"
            onClick={() =>
              setCurrentPage(page => Math.max(1, page - 1))
            }
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-white text-indigo-600 border border-gray-200 shadow-sm hover:bg-indigo-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage(page => Math.min(totalPages, page + 1))
            }
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-white text-indigo-600 border border-gray-200 shadow-sm hover:bg-indigo-50'
            }`}
          >
            Próxima
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      )}

      {!limit && totalPages > 1 && (
        <div className="text-center text-[10px] text-gray-400 font-medium">
          Mostrando {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)} de {filteredAccounts.length} contas
        </div>
      )}

    </div>
  );
}
