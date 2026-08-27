import { formatBRLFromCents } from '../utils/currency';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { AccountService } from '../services/AccountService';
import { AccountRepository } from '../repository/AccountRepository';
import { IncomeRepository } from '../repository/IncomeRepository';
import { FinancialEngine } from '../services/FinancialEngine';
import { 
  AlertTriangle, Target, TrendingUp, PartyPopper, CheckCircle, 
  ArrowUpRight, ArrowDownRight, ChevronRight 
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Dashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const summary = useFinancialSummary();
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const settings = useLiveQuery(() => db.settings.toArray(), [])?.[0];
  const score = FinancialEngine.calculateScore(summary);
  const isHidden = settings?.hide_values ?? false;

  const fmt = (cents: number) =>
    isHidden ? '••••••' : `${formatBRLFromCents(cents)}`;

  const handleNextActionClick = async () => {
    const action = summary.nextAction;
    if (!action?.entityId) return;
    if (action.type === 'receive') {
      await IncomeRepository.markAsReceived(action.entityId);
    } else if (action.type === 'pay') {
      await AccountRepository.markAsPaid(action.entityId);
    }
  };

  // Next 5 days of pending bills
  const today = format(new Date(), 'yyyy-MM-dd');
  const in7days = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const upcomingBills = accounts
    .filter(a => (a.type as string) !== 'income' && a.status === 'pending' && a.due_date >= today && a.due_date <= in7days)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  const getActionIcon = () => {
    switch (summary.nextAction?.type) {
      case 'pay': return <AlertTriangle className="w-8 h-8 text-red-400" />;
      case 'receive': return <TrendingUp className="w-8 h-8 text-green-400" />;
      case 'reserve': return <Target className="w-8 h-8 text-blue-400" />;
      case 'invest': return <TrendingUp className="w-8 h-8 text-purple-400" />;
      default: return <PartyPopper className="w-8 h-8 text-yellow-400" />;
    }
  };

  const getActionBadgeColor = () => {
    switch (summary.nextAction?.priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-600';
    }
  };

  const getActionLabel = () => {
    switch (summary.nextAction?.type) {
      case 'pay': return '✓ PAGAR';
      case 'receive': return '✓ RECEBI';
      case 'reserve': return '🛟 SEPARAR';
      case 'invest': return '📈 VER PLANO';
      default: return 'VER';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* 1. SALDO DISPONÍVEL - visible on desktop (TopHeader shows on mobile) */}
      <div className="hidden md:block bg-gradient-to-br from-blue-700 to-blue-800 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Saldo disponível</p>
          <h2 className="text-4xl font-black tracking-tight mb-3 amount-text">
            <span className="text-lg text-blue-300 mr-1">R$</span>
            {isHidden ? '••••••' : formatBRLFromCents(summary.currentBalanceCents).replace('R$ ', '')}
          </h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-300">
              <ArrowUpRight className="w-4 h-4" />
              <span>{fmt(summary.receivedIncomeCents)}</span>
              <span className="text-blue-300 text-xs">recebidos</span>
            </div>
            <div className="flex items-center gap-1 text-red-300">
              <ArrowDownRight className="w-4 h-4" />
              <span>{fmt(summary.paidExpensesCents)}</span>
              <span className="text-blue-300 text-xs">pagos</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-600/50 flex justify-between items-center">
            <span className="text-blue-200 text-xs">Saldo projetado</span>
            <span className="font-bold text-sm">{fmt(summary.projectedBalanceCents)}</span>
          </div>
        </div>
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
      </div>

      {/* 2. ATENÇÃO — Alerta de contas críticas */}
      {(summary.overdueCount > 0 || summary.isTight) && (
        <div className={`rounded-[2rem] p-5 border-l-4 ${summary.overdueCount > 0 ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{summary.overdueCount > 0 ? '🔴' : '⚠️'}</span>
            <div className="min-w-0">
              <h3 className={`font-black text-sm ${summary.overdueCount > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
                {summary.overdueCount > 0 ? `${summary.overdueCount} conta(s) atrasada(s)` : 'Orçamento Apertado'}
              </h3>
              <p className={`text-xs mt-0.5 ${summary.overdueCount > 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                {summary.overdueCount > 0 
                  ? `Total: ${fmt(summary.overdueExpensesCents)}`
                  : 'Suas contas superam a renda prevista neste mês.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. 🎯 PRÓXIMA MELHOR AÇÃO */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Próxima Ação</h3>
        <div className="bg-gray-900 p-5 rounded-[2rem] shadow-xl relative overflow-hidden text-white">
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-gray-800 rounded-2xl shrink-0">
              {getActionIcon()}
            </div>
            <div className="flex-1 min-w-0">
              {summary.nextAction && (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block ${getActionBadgeColor()}`}>
                  {summary.nextAction.priority === 'critical' ? '🔴 URGENTE' : summary.nextAction.priority === 'high' ? '🟠 IMPORTANTE' : '🟡 SUGESTÃO'}
                </span>
              )}
              <h4 className="text-base font-bold text-white mb-1">{summary.nextAction?.title ?? 'Tudo em Ordem!'}</h4>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{summary.nextAction?.description ?? 'Você está no controle das suas finanças.'}</p>
              {summary.nextAction?.amountCents && (
                <p className="text-xl font-black text-white mb-3">{fmt(summary.nextAction.amountCents)}</p>
              )}
              {summary.nextAction?.entityId && (
                <button
                  onClick={handleNextActionClick}
                  className="bg-white text-gray-900 font-black py-3 px-6 rounded-xl text-sm hover:bg-gray-100 active:scale-[.97] transition w-full md:w-auto text-center"
                >
                  {getActionLabel()}
                </button>
              )}
              {!summary.nextAction && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-bold">Nenhuma ação pendente</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* 4. RESUMO DO MÊS */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Resumo do Mês</h3>
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-base">💰</span>
              <span className="font-medium">Entradas</span>
            </div>
            <span className="font-black text-green-600">{fmt(summary.expectedIncomeCents)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-base">📋</span>
              <span className="font-medium">Despesas</span>
            </div>
            <span className="font-black text-red-500">{fmt(summary.totalExpensesCents)}</span>
          </div>
          {summary.suggestedReserveCents > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-base">🛟</span>
                <span className="font-medium">Reserva sugerida</span>
              </div>
              <span className="font-black text-blue-500">{fmt(summary.suggestedReserveCents)}</span>
            </div>
          )}
          <div className="pt-3 mt-1 border-t border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <span className="font-black text-gray-900">Saldo Projetado</span>
            </div>
            <span className={`font-black text-lg ${summary.projectedBalanceCents >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {fmt(summary.projectedBalanceCents)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-base">🏦</span>
              <span className="font-medium">Dinheiro livre</span>
            </div>
            <span className={`font-black ${summary.freeMoneyCents >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
              {fmt(summary.freeMoneyCents)}
            </span>
          </div>

          {/* Organization Score */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Organização</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${score > 70 ? 'text-green-500' : score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>{score}</span>
              <span className="text-xs font-bold text-gray-300">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. PRÓXIMOS DIAS */}
      {upcomingBills.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Próximos dias</h3>
            <button 
              onClick={() => onNavigate && onNavigate('accounts')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600"
            >
              Ver tudo <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {upcomingBills.map(bill => {
              const isOverdue = AccountService.isAccountOverdue(bill);
              const dateLabel = format(new Date(bill.due_date + 'T00:00:00'), "d MMM", { locale: ptBR });
              return (
                <div key={bill.id} className="flex items-center justify-between px-5 py-3.5 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{isOverdue ? '🔴' : '🔵'}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{bill.title}</p>
                      <p className="text-xs text-gray-400">{dateLabel}</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                    {fmt(bill.amount_cents)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

