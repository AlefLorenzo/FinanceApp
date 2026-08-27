import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { DebtService } from '../services/DebtService';
import { DebtRepository } from '../repository/DebtRepository';
import type { Debt, DebtInstallment } from '../types';
import { format, parseISO } from 'date-fns';
import { CreditCard, Plus, ChevronRight, AlertTriangle, ChevronLeft, Calendar } from 'lucide-react';
import { getTodayISO } from '../utils/date';

export function DebtsView() {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  const debts = useLiveQuery(() => db.debts.toArray(), []) || [];
  const allInstallments = useLiveQuery(() => db.debt_installments.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];

  const today = getTodayISO();

  // ----- COMPUTED METRICS -----
  const activeDebts = debts.filter(d => d.status === 'active');
  const totalRemainingCents = useMemo(() => {
    return activeDebts.reduce((sum, d) => {
      const dInsts = allInstallments.filter(i => i.debt_id === d.id);
      return sum + DebtService.calculateDebtRemaining(dInsts);
    }, 0);
  }, [activeDebts, allInstallments]);

  const overdueCount = useMemo(() => {
    return allInstallments.filter(i => DebtService.isOverdue(i, today)).length;
  }, [allInstallments, today]);

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  // ----- RENDER -----
  if (activeView === 'create') {
    return <DebtCreateForm onBack={() => setActiveView('list')} categories={categories} />;
  }

  if (activeView === 'detail' && selectedDebtId) {
    const debt = debts.find(d => d.id === selectedDebtId);
    const insts = allInstallments.filter(i => i.debt_id === selectedDebtId).sort((a, b) => a.installment_number - b.installment_number);
    if (debt) {
      return <DebtDetail debt={debt} installments={insts} onBack={() => setActiveView('list')} />;
    }
  }

  // LIST VIEW
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-300" />
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-300">Minhas Dívidas</h2>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Restante</p>
          <h1 className="text-4xl font-black mb-6">{fmt(totalRemainingCents)}</h1>
          
          <div className="flex gap-4">
            <div className="bg-white/10 rounded-2xl p-4 flex-1 backdrop-blur-sm">
              <p className="text-2xl font-black">{activeDebts.length}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 mt-1">Em Andamento</p>
            </div>
            <div className={`rounded-2xl p-4 flex-1 backdrop-blur-sm ${overdueCount > 0 ? 'bg-red-500/20 text-red-100' : 'bg-white/10'}`}>
              <p className="text-2xl font-black">{overdueCount}</p>
              <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${overdueCount > 0 ? 'text-red-300' : 'text-indigo-300'}`}>Atrasadas</p>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setActiveView('create')}
        className="w-full bg-white text-indigo-600 font-black p-5 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        NOVA DÍVIDA
      </button>

      <div className="space-y-4">
        {activeDebts.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhuma dívida cadastrada.</p>
        ) : (
          activeDebts.map(debt => {
            const dInsts = allInstallments.filter(i => i.debt_id === debt.id);
            const remaining = DebtService.calculateDebtRemaining(dInsts);
            const paidCount = DebtService.countPaidInstallments(dInsts);
            const isDebtOverdue = dInsts.some(i => DebtService.isOverdue(i, today));
            const nextPending = dInsts.find(i => i.status !== 'paid');

            return (
              <div 
                key={debt.id} 
                onClick={() => { setSelectedDebtId(debt.id); setActiveView('detail'); }}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isDebtOverdue ? <span className="text-xs">🔴</span> : <span className="text-xs">🟡</span>}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDebtOverdue ? 'text-red-500' : 'text-yellow-600'}`}>
                        {isDebtOverdue ? 'Atrasada' : 'Em Andamento'}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900">{debt.title}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{fmt(remaining)}</p>
                    <p className="text-xs text-gray-400">restantes</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>{paidCount} de {debt.total_installments} parcelas pagas</span>
                  {nextPending && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Próx: {format(parseISO(nextPending.due_date), 'dd/MM')}
                    </span>
                  )}
                </div>

                <button className="w-full py-3 bg-gray-50 text-indigo-600 font-bold rounded-xl text-sm flex items-center justify-center gap-1">
                  VER DÍVIDA <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// DEBT DETAIL VIEW
// -----------------------------------------------------------------------------

function DebtDetail({ debt, installments, onBack }: { debt: Debt, installments: DebtInstallment[], onBack: () => void }) {
  const [payModal, setPayModal] = useState<{ isOpen: boolean, inst: DebtInstallment | null }>({ isOpen: false, inst: null });
  const [settleModal, setSettleModal] = useState(false);

  const today = getTodayISO();
  const paidCount = DebtService.countPaidInstallments(installments);
  const remainingCents = DebtService.calculateDebtRemaining(installments);
  const totalPaidCents = debt.original_amount_cents - remainingCents; // Approximation for UI
  const progressPct = Math.round((paidCount / debt.total_installments) * 100);

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  const handleSettle = async () => {
    await DebtRepository.settleDebt(debt.id, remainingCents);
    setSettleModal(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-black text-gray-900 uppercase truncate">{debt.title}</h2>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">Original</p>
            <p className="font-bold text-sm">{fmt(debt.original_amount_cents)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Pago</p>
            <p className="font-bold text-sm text-green-600">{fmt(totalPaidCents)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Restante</p>
            <p className="font-black text-sm text-gray-900">{fmt(remainingCents)}</p>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-indigo-600">{progressPct}% pago</span>
            <span className="text-gray-400">{debt.total_installments - paidCount} parcelas restantes</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Action: Settle */}
      {debt.status === 'active' && (
        <button 
          onClick={() => setSettleModal(true)}
          className="w-full bg-indigo-50 text-indigo-700 font-black p-4 rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-transform"
        >
          QUITAR DÍVIDA
        </button>
      )}

      {/* Installments List */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Parcelas</h3>
        <div className="space-y-3">
          {installments.map(inst => {
            const status = DebtService.getInstallmentStatus(inst, today);
            const remaining = DebtService.remainingCents(inst);
            
            let statusColor = 'bg-white border-gray-100 text-gray-900';
            let badge = '';
            
            if (status === 'paid') {
              statusColor = 'bg-gray-50 border-gray-100 opacity-60';
              badge = '✅ PAGA';
            } else if (status === 'overdue') {
              statusColor = 'bg-red-50 border-red-200';
              badge = '🔴 ATRASADA';
            } else if (status === 'partial') {
              statusColor = 'bg-yellow-50 border-yellow-200';
              badge = '🟡 PARCIAL';
            }

            return (
              <div key={inst.id} className={`rounded-2xl p-4 border shadow-sm ${statusColor}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">
                        {format(parseISO(inst.due_date), 'dd/MM')}
                      </span>
                      {badge && <span className="text-[10px] font-black uppercase tracking-wider">{badge}</span>}
                    </div>
                    <p className="text-xs text-gray-500">Parcela {inst.installment_number}/{debt.total_installments}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{fmt(inst.amount_cents)}</p>
                  </div>
                </div>

                {status === 'partial' && (
                  <div className="bg-white/60 rounded-xl p-3 mb-3 text-xs flex justify-between border border-yellow-100">
                    <div>
                      <span className="text-gray-500 block mb-1">Pago:</span>
                      <span className="font-bold text-green-600">{fmt(inst.paid_amount_cents)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 block mb-1">Restante:</span>
                      <span className="font-bold text-gray-900">{fmt(remaining)}</span>
                    </div>
                  </div>
                )}

                {status !== 'paid' && (
                  <button 
                    onClick={() => setPayModal({ isOpen: true, inst })}
                    className="w-full mt-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
                  >
                    {status === 'partial' ? 'PAGAR RESTANTE' : 'PAGAR PARCELA'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pay Modal */}
      {payModal.isOpen && payModal.inst && (
        <PayInstallmentModal 
          inst={payModal.inst} 
          onClose={() => setPayModal({ isOpen: false, inst: null })} 
        />
      )}

      {/* Settle Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-lg font-black text-center mb-6">QUITAR DÍVIDA</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Saldo atual</span>
                <span className="font-bold">{fmt(remainingCents)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Parcelas restantes</span>
                <span className="font-bold">{debt.total_installments - paidCount}</span>
              </div>
              <div className="flex justify-between py-3 bg-gray-50 rounded-xl px-4">
                <span className="text-gray-900 font-bold">Valor para quitação</span>
                <span className="font-black text-indigo-600 text-lg">{fmt(remainingCents)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-xs font-medium flex gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600" />
              <p>⚠️ Essa ação registrará a quitação antecipada da dívida e debitará o valor do seu saldo atual.</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSettleModal(false)}
                className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleSettle}
                className="flex-1 py-4 font-black text-white bg-indigo-600 rounded-xl"
              >
                QUITAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// PAY INSTALLMENT MODAL
// -----------------------------------------------------------------------------

function PayInstallmentModal({ inst, onClose }: { inst: DebtInstallment, onClose: () => void }) {
  const remaining = DebtService.remainingCents(inst);
  const [payAmountStr, setPayAmountStr] = useState((remaining / 100).toFixed(2).replace('.', ','));

  const parseAmount = (val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const handlePay = async () => {
    let amountCents = parseAmount(payAmountStr);
    if (amountCents <= 0) return;
    
    // Cap visually to avoid confusion, though repo already caps it
    if (amountCents > remaining) amountCents = remaining;

    await DebtRepository.payInstallment(inst.id, amountCents);
    onClose();
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-8">
        <h3 className="text-lg font-black text-center mb-6">PAGAR PARCELA</h3>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Valor da parcela</span>
            <span className="font-bold">{fmt(inst.amount_cents)}</span>
          </div>
          {inst.paid_amount_cents > 0 && (
            <div className="flex justify-between py-2 text-green-600">
              <span>Já pago</span>
              <span className="font-bold">{fmt(inst.paid_amount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t border-gray-100 pt-3">
            <span className="text-gray-900 font-bold">Restante</span>
            <span className="font-black text-gray-900">{fmt(remaining)}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">VALOR A PAGAR AGORA (R$)</label>
          <input 
            type="text" 
            inputMode="decimal"
            value={payAmountStr}
            onChange={e => setPayAmountStr(e.target.value.replace(/[^0-9,]/g, ''))}
            className="w-full text-center text-4xl font-black text-indigo-600 bg-gray-50 rounded-2xl py-4 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none"
          />
          <p className="text-center text-xs text-gray-400 mt-2">
            Pode ser parcial. O saldo será atualizado na hora.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl">CANCELAR</button>
          <button onClick={handlePay} className="flex-1 py-4 font-black text-white bg-indigo-600 rounded-xl">REGISTRAR</button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CREATE DEBT FORM
// -----------------------------------------------------------------------------

function DebtCreateForm({ onBack, categories }: { onBack: () => void, categories: any[] }) {
  const [title, setTitle] = useState('');
  const [creditor, setCreditor] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [installments, setInstallments] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [firstDate, setFirstDate] = useState(getTodayISO());
  const [categoryId, setCategoryId] = useState('');

  // Use the state if valid, otherwise fallback to the first available category, or 'default'
  const effectiveCategoryId = categories.find(c => c.id === categoryId) 
    ? categoryId 
    : (categories[0]?.id || 'default');

  const parseAmount = (val: string) => {
    const num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await DebtRepository.create({
      title,
      creditor,
      category_id: effectiveCategoryId,
      original_amount_cents: parseAmount(originalAmount),
      total_installments: parseInt(installments, 10),
      installment_amount_cents: parseAmount(installmentAmount),
      first_due_date: firstDate
    });
    onBack();
  };

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-black text-gray-900 uppercase">NOVA DÍVIDA</h2>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">TÍTULO</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Empréstimo Banco" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">CREDOR (BANCO/INSTITUIÇÃO)</label>
            <input required value={creditor} onChange={e => setCreditor(e.target.value)} placeholder="Ex: Nubank" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">CATEGORIA</label>
            <select required value={effectiveCategoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none">
              {categories.length === 0 && <option value="default">Geral</option>}
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">VALOR ORIGINAL TOTAL (R$)</label>
            <input required value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} placeholder="5000,00" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Nº PARCELAS</label>
              <input required type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">VALOR PARCELA</label>
              <input required value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} placeholder="480,00" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">1º VENCIMENTO</label>
            <input required type="date" value={firstDate} onChange={e => setFirstDate(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-sm active:scale-95 transition-transform">
          CRIAR DÍVIDA E GERAR PARCELAS
        </button>
      </form>
    </div>
  );
}
