import { 
  ClipboardList, TrendingUp, CreditCard, LifeBuoy, BarChart3, Calendar, CheckSquare, Target, X
} from 'lucide-react';

type QuickAddMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
};

export function QuickAddMenu({ isOpen, onClose, onSelectAction }: QuickAddMenuProps) {
  if (!isOpen) return null;

  const actions = [
    { id: 'expense', label: 'Conta', icon: ClipboardList, color: 'bg-red-50 text-red-500' },
    { id: 'income', label: 'Receita', icon: TrendingUp, color: 'bg-green-50 text-green-500' },
    { id: 'debt', label: 'Dívida', icon: CreditCard, color: 'bg-purple-50 text-purple-500' },
    { id: 'reserve', label: 'Reserva', icon: LifeBuoy, color: 'bg-blue-50 text-blue-500' },
    { id: 'invest', label: 'Investimento', icon: BarChart3, color: 'bg-indigo-50 text-indigo-500' },
    { id: 'event', label: 'Compromisso', icon: Calendar, color: 'bg-orange-50 text-orange-500' },
    { id: 'reminder', label: 'Lembrete', icon: CheckSquare, color: 'bg-teal-50 text-teal-500' },
    { id: 'goal', label: 'Meta', icon: Target, color: 'bg-pink-50 text-pink-500' },
  ];

  const handleSelect = (id: string) => {
    onSelectAction(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Bottom Sheet Drawer */}
      <div className="relative w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
        {/* Drag indicator */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Title */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-gray-900">O que deseja adicionar?</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Grid Action List */}
        <div className="grid grid-cols-4 gap-4">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => handleSelect(act.id)}
                className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-2xl active:scale-[.95] transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl ${act.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-gray-600 text-center leading-tight truncate w-full">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
