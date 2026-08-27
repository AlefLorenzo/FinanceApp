import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder, Account } from '../types';
import { Plus, X, CheckCircle2, Circle, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, addDays, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccounts } from '../hooks/useAccounts';
import { AccountService } from '../services/AccountService';
import { AccountRepository } from '../repository/AccountRepository';

const CATEGORIES = [
  { id: 'personal', label: 'Pessoal', color: 'bg-purple-100 text-purple-700' },
  { id: 'work', label: 'Trabalho', color: 'bg-blue-100 text-blue-700' },
  { id: 'health', label: 'Saúde', color: 'bg-green-100 text-green-700' },
  { id: 'study', label: 'Estudos', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'financial', label: 'Financeiro', color: 'bg-red-100 text-red-700' },
];

function ReminderForm({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || '');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Reminder['category']>('personal');
  const [repeat, setRepeat] = useState<Reminder['repeat']>('none');

  const handleSave = async () => {
    if (!title || !date) return;
    await db.reminders.add({
      id: uuidv4(),
      title, date, time: time || undefined, description: description || undefined,
      category, completed: false, repeat: repeat || 'none',
      created_at: new Date()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-[2rem] w-full max-w-md p-6 pb-10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">Novo Compromisso</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Horário (opcional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id as Reminder['category'])}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition border-2 ${category === cat.id ? `border-blue-500 ${cat.color}` : 'border-transparent bg-gray-100 text-gray-500'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">Repetir</label>
            <select value={repeat} onChange={e => setRepeat(e.target.value as Reminder['repeat'])}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400">
              <option value="none">Não repetir</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
            </select>
          </div>

          <textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />

          <button onClick={handleSave} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition text-base">
            Salvar Compromisso
          </button>
        </div>
      </div>
    </div>
  );
}

/** Horizontal day picker — shows a scrollable week strip */
function WeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll so selected day is visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
    const btn = el.children[idx] as HTMLElement | undefined;
    btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [selectedDate]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide py-1 px-1">
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd');
          const isSelected = iso === format(selectedDate, 'yyyy-MM-dd');
          const todayDay = isToday(day);
          return (
            <button
              key={iso}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center min-w-[44px] py-2 px-1 rounded-2xl transition font-medium text-xs
                ${isSelected ? 'bg-blue-600 text-white shadow-md' :
                  todayDay ? 'bg-blue-50 text-blue-600 font-black' :
                    'text-gray-500 hover:bg-gray-100'}`}
            >
              <span className="text-[10px] uppercase font-bold opacity-80 mb-0.5">
                {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
              <span className={`text-base leading-none ${isSelected ? 'font-black' : ''}`}>
                {format(day, 'd')}
              </span>
              {todayDay && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgendaView() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [creating, setCreating] = useState(false);
  const { accounts } = useAccounts();

  const reminders = useLiveQuery(() => db.reminders.toArray(), []) || [];
  const selectedISO = format(selectedDate, 'yyyy-MM-dd');

  const toggleReminder = async (id: string, current: boolean) => {
    await db.reminders.update(id, { completed: !current });
  };
  const deleteReminder = async (id: string) => {
    if (confirm('Excluir este compromisso?')) await db.reminders.delete(id);
  };

  const handlePayBill = async (id: string) => {
    await AccountRepository.markAsPaid(id);
  };

  // Financial events for selected day (due date or overdue if today is selected)
  const financialForDay = (accounts as Account[]).filter(a => {
    if ((a.type as string) === 'income' || a.status !== 'pending') return false;
    if (a.due_date === selectedISO) return true;
    // Show overdue on "today" view
    if (format(today, 'yyyy-MM-dd') === selectedISO && AccountService.isAccountOverdue(a)) return true;
    return false;
  });

  const remindersForDay = reminders.filter(r => r.date === selectedISO);

  // Upcoming reminders (next 14 days, not on selected day)
  const upcoming = reminders
    .filter(r => r.date > selectedISO && !r.completed)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const getCatStyle = (cat: string) => CATEGORIES.find(c => c.id === cat)?.color || 'bg-gray-100 text-gray-500';

  const todayLabel = isToday(selectedDate)
    ? 'Hoje'
    : isTomorrow(selectedDate)
    ? 'Amanhã'
    : format(selectedDate, "d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">{todayLabel}</h2>
            <p className="text-gray-400 text-sm font-medium capitalize">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-full text-sm hover:bg-blue-700 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>

        {/* Week strip */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 7))}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 overflow-hidden">
            <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 7))}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Jump to today */}
        {!isToday(selectedDate) && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs font-bold text-blue-500 hover:underline"
            >
              Voltar para Hoje
            </button>
          </div>
        )}
      </div>

      {/* Timeline for selected day */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
          {todayLabel === 'Hoje' ? 'Para Hoje' : `Dia ${format(selectedDate, 'd/MM')}`}
        </h3>

        {(financialForDay.length === 0 && remindersForDay.length === 0) ? (
          <div className="text-center p-8 bg-white rounded-[2rem] border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm font-medium mb-2">Nada agendado neste dia</p>
            <button onClick={() => setCreating(true)} className="text-blue-500 font-bold text-sm hover:underline">
              + Adicionar compromisso
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Financial bills */}
            {financialForDay.map(a => {
              const isOverdue = AccountService.isAccountOverdue(a);
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl bg-white flex items-center gap-3 shadow-sm border-l-4 ${isOverdue ? 'border-red-500' : 'border-yellow-500'}`}
                >
                  <span className="text-lg shrink-0">{isOverdue ? '🔴' : '🟡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{a.title}</div>
                    <div className="text-xs text-gray-400">
                      {isOverdue ? '⚠️ Atrasada' : 'Vence hoje'} · R$ {(a.amount_cents / 100).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayBill(a.id!)}
                    className="shrink-0 bg-green-500 text-white text-xs font-black px-3 py-1.5 rounded-xl hover:bg-green-600 transition"
                  >
                    ✓ PAGAR
                  </button>
                </div>
              );
            })}

            {/* Personal reminders */}
            {remindersForDay.map(r => (
              <div key={r.id} className={`p-4 rounded-2xl bg-white flex items-center justify-between shadow-sm border ${r.completed ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleReminder(r.id, r.completed)} className="shrink-0">
                    {r.completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-gray-300" />}
                  </button>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm truncate ${r.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{r.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {r.time && <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> {r.time}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getCatStyle(r.category)}`}>
                        {CATEGORIES.find(c => c.id === r.category)?.label}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteReminder(r.id)} className="p-2 hover:bg-red-50 rounded-full text-gray-300 hover:text-red-400 transition shrink-0 ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Reminders */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Próximos Compromissos</h3>
          <div className="space-y-3">
            {upcoming.map(r => {
              const d = parseISO(r.date);
              const label = isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, "d 'de' MMM", { locale: ptBR });
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedDate(d)}
                  className="w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-50 rounded-xl px-3 py-2 text-center min-w-[50px] shrink-0">
                      <div className="text-blue-600 font-black text-sm">{format(d, 'd')}</div>
                      <div className="text-blue-400 text-[10px] font-bold uppercase">{format(d, 'MMM', { locale: ptBR })}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-gray-900 truncate">{r.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 shrink-0">{label}</span>
                        {r.time && <span className="text-xs text-gray-400 shrink-0">· {r.time}</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {creating && <ReminderForm onClose={() => setCreating(false)} defaultDate={selectedISO} />}
    </div>
  );
}
