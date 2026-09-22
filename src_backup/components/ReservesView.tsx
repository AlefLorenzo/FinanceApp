import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { v4 as uuidv4 } from 'uuid';
import type { Reserve } from '../types';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { 
  LifeBuoy, Plus, ChevronRight, Target, 
  X, PlusCircle, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoneyInput } from './ui/MoneyInput';
import { formatBRLFromCents } from '../utils/currency';

// Subcomponent: Reserve Detail Modal
function ReserveDetail({ reserve, onClose }: { reserve: Reserve; onClose: () => void }) {
  const contributions = useLiveQuery(
    () => db.reserve_contributions.where('reserve_id').equals(reserve.id).toArray(),
    [reserve.id]
  ) || [];

  const [amountCents, setAmountCents] = useState(0);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  const sorted = [...contributions].sort((a, b) => 
    new Date(b.contributed_at).getTime() - new Date(a.contributed_at).getTime()
  );

  const handleAdd = async () => {
    if (!amountCents) return;
    const id = uuidv4();
    await db.transaction('rw', db.reserves, db.reserve_contributions, async () => {
      await db.reserve_contributions.add({
        id,
        reserve_id: reserve.id,
        amount_cents: amountCents,
        note: note || undefined,
        contributed_at: new Date(),
        created_at: new Date()
      });
      await db.reserves.update(reserve.id, {
        current_cents: reserve.current_cents + amountCents,
        updated_at: new Date()
      });
    });
    setAmountCents(0);
    setNote('');
    setAdding(false);
  };

  const percent = Math.min(100, Math.round((reserve.current_cents / reserve.target_cents) * 100));
  const remaining = reserve.target_cents - reserve.current_cents;
  const monthsLeft = reserve.contribution_cents > 0 
    ? Math.ceil(remaining / reserve.contribution_cents) 
    : null;

  const isComplete = reserve.current_cents >= reserve.target_cents;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-t-[2rem] w-full max-w-md p-6 pb-10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{reserve.icon}</span>
            <div>
              <h2 className="text-xl font-black text-gray-900">{reserve.name}</h2>
              {isComplete && <span className="text-sm font-bold text-green-600">🎉 Meta Concluída!</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
          <div className="flex justify-between mb-3 gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate block">Acumulado</span>
              <div className="text-xl sm:text-2xl font-black text-gray-900 amount-text">
                R$ {formatBRLFromCents(reserve.current_cents).replace("R$ ", "")}
              </div>
            </div>
            <div className="text-right min-w-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate block">Meta</span>
              <div className="text-xl sm:text-2xl font-black text-gray-400 amount-text">
                R$ {formatBRLFromCents(reserve.target_cents).replace("R$ ", "")}
              </div>
            </div>
          </div>
          
          <div className="h-5 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner mb-3">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} 
              style={{ width: `${percent}%` }} 
            />
          </div>
          
          <div className="flex justify-between text-sm font-bold">
            <span className="text-blue-600">{percent}% concluído</span>
            {!isComplete && (
              <span className="text-gray-500">
                Faltam R$ {formatBRLFromCents(remaining).replace("R$ ", "")}
              </span>
            )}
          </div>
        </div>

        {/* Forecast */}
        {!isComplete && monthsLeft && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700 font-medium">
              Com R$ {(reserve.contribution_cents / 100).toLocaleString("pt-BR")}/mês, você atinge sua meta em aproximadamente <strong>{monthsLeft} {monthsLeft === 1 ? 'mês' : 'meses'}</strong>.
            </p>
          </div>
        )}

        {/* Add Contribution */}
        {adding ? (
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-200 space-y-3">
            <h3 className="font-bold text-gray-800">Adicionar Aporte</h3>
            <MoneyInput
              valueCents={amountCents}
              onChangeCents={setAmountCents}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
              autoFocus
            />
            <input
              type="text" placeholder="Observação (opcional)"
              value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition">Confirmar</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition mb-6"
          >
            <PlusCircle className="w-5 h-5" /> Adicionar Aporte
          </button>
        )}

        {/* Timeline */}
        <div>
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">Histórico de Aportes</h3>
          {sorted.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nenhum aporte registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {format(new Date(c.contributed_at), "d 'de' MMMM", { locale: ptBR })}
                      </div>
                      {c.note && <div className="text-xs text-gray-400">{c.note}</div>}
                    </div>
                  </div>
                  <span className="font-black text-green-600 text-sm">
                    + R$ {formatBRLFromCents(c.amount_cents).replace("R$ ", "")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent: New Reserve Form
function NewReserveForm({ onClose }: { onClose: () => void }) {
  const icons = ['🛟', '✈️', '💻', '🏠', '🚗', '🎓', '❤️', '🎯', '💰', '🌟'];
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetCents, setTargetCents] = useState(0);
  const [contributionCents, setContributionCents] = useState(0);
  const [day, setDay] = useState('5');

  const handleCreate = async () => {
    if (!name || !targetCents) return;
    await db.reserves.add({
      id: uuidv4(),
      name,
      icon,
      color: '#3b82f6',
      target_cents: targetCents,
      current_cents: 0,
      contribution_cents: contributionCents,
      contribution_frequency: 'monthly',
      contribution_day: parseInt(day),
      created_at: new Date(),
      updated_at: new Date()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-t-[2rem] w-full max-w-md p-6 pb-10 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">Nova Reserva</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`text-2xl p-2 rounded-xl border-2 transition ${icon === i ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Nome da Reserva</label>
            <input
              type="text" placeholder="Ex: Viagem para Europa"
              value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Meta</label>
              <MoneyInput
                valueCents={targetCents}
                onChangeCents={setTargetCents}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Aporte Mensal</label>
              <MoneyInput
                valueCents={contributionCents}
                onChangeCents={setContributionCents}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Dia do Aporte</label>
            <input
              type="number" min="1" max="31" placeholder="Dia 1-31"
              value={day} onChange={e => setDay(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <button
            onClick={handleCreate}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-sm text-base"
          >
            Criar Reserva
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ReservesView() {
  const reserves = useLiveQuery(() => db.reserves.toArray(), []) || [];
  const plan = useFinancialSummary();
  const [selected, setSelected] = useState<Reserve | null>(null);
  const [creating, setCreating] = useState(false);

  const totalCurrent = reserves.reduce((s, r) => s + r.current_cents, 0);
  const totalTarget = reserves.reduce((s, r) => s + r.target_cents, 0);
  const globalPercent = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Overview */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[2rem] shadow-md text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-blue-200 font-black mb-1 uppercase tracking-widest text-[10px] truncate">Reserva Total</h2>
          <div className="text-3xl sm:text-4xl font-black mb-1 tracking-tight amount-text">
            R$ {formatBRLFromCents(totalCurrent).replace("R$ ", "")}
          </div>
          <p className="text-blue-200 text-xs sm:text-sm mb-4 truncate">de R$ {formatBRLFromCents(totalTarget).replace("R$ ", "")} planejados</p>
          
          <div className="h-3 w-full bg-blue-800/50 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${globalPercent}%` }} />
          </div>

          {plan.suggestedReserveCents > 0 && (
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-blue-50 font-medium">
                💡 Sugestão: Aportar <strong>R$ {formatBRLFromCents(plan.suggestedReserveCents).replace("R$ ", "")}</strong> este mês.
              </p>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <LifeBuoy className="w-40 h-40" />
        </div>
      </div>

      {/* Reserves List */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-gray-800">Minhas Reservas</h3>
        <button 
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {reserves.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-[2rem] border border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm mb-4">Nenhuma reserva criada ainda.</p>
          <button onClick={() => setCreating(true)} className="text-blue-600 font-bold text-sm hover:underline">
            Criar minha primeira reserva →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reserves.map(reserve => {
            const pct = Math.min(100, Math.round((reserve.current_cents / reserve.target_cents) * 100));
            const isDone = reserve.current_cents >= reserve.target_cents;
            return (
              <button
                key={reserve.id}
                onClick={() => setSelected(reserve)}
                className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition text-left"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reserve.icon}</span>
                    <div>
                      <h4 className="font-bold text-gray-900">{reserve.name}</h4>
                      {isDone && <span className="text-xs font-bold text-green-600">🎉 Concluída!</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>

                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gray-400 gap-2">
                  <span className="truncate">R$ {formatBRLFromCents(reserve.current_cents).replace("R$ ", "")} guardados</span>
                  <span className="truncate whitespace-nowrap shrink-0">{pct}% de R$ {formatBRLFromCents(reserve.target_cents).replace("R$ ", "")}</span>
                </div>

                {reserve.contribution_cents > 0 && (
                  <div className="mt-2 text-xs text-gray-400 font-medium">
                    📅 Aporte: R$ {(reserve.contribution_cents / 100).toLocaleString("pt-BR")}/mês · Dia {reserve.contribution_day}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && <ReserveDetail reserve={selected} onClose={() => setSelected(null)} />}
      {creating && <NewReserveForm onClose={() => setCreating(false)} />}
    </div>
  );
}


