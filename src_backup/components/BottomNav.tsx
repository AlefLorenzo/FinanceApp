import { Home, ClipboardList, Calendar, TrendingUp, Plus } from 'lucide-react';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlusClick: () => void;
}

export function BottomNav({ activeTab, onTabChange, onPlusClick }: Props) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'accounts', icon: ClipboardList, label: 'Contas' },
    { id: 'plus', icon: Plus, label: 'Adicionar', isSpecial: true },
    { id: 'agenda', icon: Calendar, label: 'Agenda' },
    { id: 'invest', icon: TrendingUp, label: 'Investir' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.06)] md:hidden select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-end h-16 max-w-md mx-auto relative px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={onPlusClick}
                className="flex flex-col items-center justify-center -translate-y-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200 focus:outline-none transition active:scale-[.90]"
                aria-label="Adicionar Novo"
              >
                <Plus className="w-8 h-8" strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors focus:outline-none h-full
                ${active ? 'text-blue-600' : 'text-gray-400 active:text-gray-700'}`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className="w-5 h-5 shrink-0"
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-bold leading-none mt-0.5 truncate w-full text-center px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
