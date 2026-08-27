import { useAccounts } from '../hooks/useAccounts';
import { AccountService } from '../services/AccountService';
import { getTodayISO } from '../utils/date';
import { CheckCircle2, Circle } from 'lucide-react';
import type { Account } from '../types';

interface Props {
  limit?: number;
  hidePaid?: boolean;
}

export function AccountList({ limit, hidePaid }: Props) {
  const { accounts, togglePaid } = useAccounts();
  const today = getTodayISO();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-100 border-red-200';
      case 'next': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'attention': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      default: return 'text-blue-700 bg-blue-100 border-blue-200'; // Futuras
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'next': return 'Próximo';
      case 'attention': return 'Atenção';
      default: return 'Futura';
    }
  };

  const getSortScore = (account: Account) => {
    if (account.status === 'paid') return 999; // Bottom
    
    if (AccountService.isAccountOverdue(account)) return 1; // Atrasada
    if (account.due_date === today) return 2; // Hoje
    
    const priority = AccountService.calculatePriority(account);
    if (priority === 'next') return 3; // 1-3 dias
    if (priority === 'attention') return 4; // 4-7 dias
    
    return 5; // > 7 dias
  };

  let filteredAccounts = [...accounts];
  
  if (hidePaid) {
    filteredAccounts = filteredAccounts.filter(a => a.status !== 'paid');
  }

  if (filteredAccounts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 bg-white rounded-2xl border border-dashed border-gray-300">
        Nenhuma conta por aqui.
      </div>
    );
  }

  // Ordena por prioridade inteligente e depois por data
  filteredAccounts.sort((a, b) => {
    const scoreA = getSortScore(a);
    const scoreB = getSortScore(b);
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    
    return a.due_date.localeCompare(b.due_date);
  });

  if (limit) {
    filteredAccounts = filteredAccounts.slice(0, limit);
  }

  return (
    <div className="space-y-3">
      {filteredAccounts.map(account => {
        const priority = AccountService.calculatePriority(account);
        const isPaid = account.status === 'paid';
        const isOverdue = AccountService.isAccountOverdue(account);
        const isToday = account.due_date === today && !isPaid;

        return (
          <div 
            key={account.id} 
            className={`p-4 rounded-2xl shadow-sm border-l-4 bg-white flex items-center justify-between transition-all gap-2 ${
              isPaid 
                ? 'border-gray-200 opacity-60' 
                : (account.type as string) === 'income' 
                  ? 'border-green-500' 
                  : isOverdue ? 'border-red-600' : isToday ? 'border-yellow-500' : 'border-blue-500'
            }`}
          >
            <div className="flex flex-col min-w-0">
              <h3 className={`font-bold text-base truncate ${isPaid ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {account.title}
              </h3>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium text-gray-500 shrink-0">{account.due_date.split('-').reverse().join('/')}</span>
                
                {!isPaid && (
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                    isOverdue ? 'text-red-700 bg-red-100 border-red-200' :
                    isToday ? 'text-yellow-700 bg-yellow-100 border-yellow-200' :
                    getPriorityColor(priority)
                  }`}>
                    {isOverdue ? 'Atrasada' : isToday ? 'Vence Hoje' : getPriorityLabel(priority)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-bold text-sm sm:text-base tracking-tight amount-text text-right max-w-[100px] sm:max-w-none ${
                isPaid ? 'text-gray-400' : account.type === 'expense' ? 'text-red-600' : 'text-green-600'
              }`}>
                {account.type === 'expense' ? '- ' : '+ '} 
                R$ {(account.amount_cents / 100).toFixed(2).replace('.', ',')}
              </span>
              
              <button 
                onClick={() => togglePaid(account.id, isPaid)}
                className="p-1 rounded-full hover:bg-gray-100 transition focus:outline-none shrink-0"
                aria-label={isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
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
  );
}
