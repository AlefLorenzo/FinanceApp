import { Eye, EyeOff, Menu, Bell } from 'lucide-react';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

interface Props {
  onMenuClick: () => void;
  onNotificationClick: () => void;
  notificationCount: number;
}

export function TopHeader({ onMenuClick, onNotificationClick, notificationCount }: Props) {
  const summary = useFinancialSummary();
  const settings = useLiveQuery(() => db.settings.toArray(), [])?.[0];

  const handleTogglePrivacy = async () => {
    if (settings) {
      await db.settings.update(settings.id, { hide_values: !settings.hide_values });
    } else {
      await db.settings.add({
        id: 'default',
        hide_values: true,
        theme: 'light',
        minimum_reserve_cents: 0,
        salary_cents: 0,
        salary_day: 5,
        created_at: new Date()
      });
    }
  };

  const isHidden = settings?.hide_values ?? false;

  const formatted = isHidden
    ? '••••••'
    : (summary.currentBalanceCents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return (
    <header className="bg-blue-600 text-white sticky top-0 z-30 shadow-md md:hidden select-none"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto w-full">
        {/* Left: Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center hover:bg-blue-700 rounded-full transition focus:outline-none shrink-0"
          aria-label="Abrir Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Center: Title / Balance info */}
        <div className="flex flex-col items-center min-w-0">
          <div className="text-[10px] text-blue-200 uppercase font-black tracking-widest leading-none mb-1">
            Saldo disponível
          </div>
          <div className="text-xl font-black tracking-tight leading-none truncate max-w-[150px] flex items-baseline gap-0.5">
            <span className="text-xs font-normal opacity-85">R$</span> {formatted}
          </div>
        </div>

        {/* Right: Actions (Privacy + Notifications) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Privacy Eye Toggle */}
          <button
            onClick={handleTogglePrivacy}
            className="w-10 h-10 flex items-center justify-center hover:bg-blue-700 rounded-full transition focus:outline-none"
            aria-label={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {isHidden ? <EyeOff className="w-5 h-5 text-blue-100" /> : <Eye className="w-5 h-5 text-blue-100" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onNotificationClick}
            className="w-10 h-10 flex items-center justify-center hover:bg-blue-700 rounded-full transition focus:outline-none relative"
            aria-label="Ver Notificações"
          >
            <Bell className="w-5 h-5 text-blue-100" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-[10px] font-black text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-blue-600 animate-pulse">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
