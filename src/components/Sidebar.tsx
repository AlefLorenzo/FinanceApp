import React, { useState } from 'react';
import AppDownloadButton from './AppDownloadButton';
import { 
  Home, ClipboardList, Calendar, CreditCard, LifeBuoy, 
  TrendingUp, Target, BarChart3, History, Database, X, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { APP_VERSION } from '../config/version';
import { MoneyInput } from './ui/MoneyInput';
import { formatBRLFromCents, parseBRLToCents } from '../utils/currency';

type SidebarProps = {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ activeView, onViewChange, isOpen, onClose }: SidebarProps) {
  const summary = useFinancialSummary();
  const settings = useLiveQuery(() => db.settings.toArray(), [])?.[0];
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');

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

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(newBalance);
    const now = new Date();
    
    if (wallets.length > 0) {
      await db.wallets.update(wallets[0].id, { balance_cents: cents, updated_at: now });
    } else {
      await db.wallets.add({
        id: 'default',
        name: 'Minha Conta',
        balance_cents: cents,
        created_at: now,
        updated_at: now
      });
    }
    
    setIsEditingBalance(false);
    setNewBalance('');
  };

  const isHidden = settings?.hide_values ?? false;

  const menuItems = [
    { id: 'home', label: 'InÃ­cio', icon: Home },
    { id: 'accounts', label: 'Contas', icon: ClipboardList },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'debts', label: 'DÃ­vidas', icon: CreditCard },
    { id: 'reserves', label: 'Reserva', icon: LifeBuoy },
    { id: 'invest', label: 'Investimentos', icon: TrendingUp },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'reports', label: 'RelatÃ³rios', icon: BarChart3 },
    { id: 'history', label: 'HistÃ³rico', icon: History },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  const handleNav = (id: string) => {
    onViewChange(id);
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 p-6">
      {/* Header / Logo */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
          <span>â˜°</span> Finance
        </h1>
        {/* Mobile close button */}
        <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-50 rounded-xl transition">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Saldo DisponÃ­vel Block */}
      <div className="bg-gray-50 rounded-[1.5rem] p-4 mb-6 border border-gray-100 shrink-0">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider">Saldo disponÃ­vel</span>
          <button onClick={handleTogglePrivacy} className="p-1 hover:text-gray-900 transition">
            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        
        {isEditingBalance ? (
          <form onSubmit={handleSaveBalance} className="flex items-center gap-2 mt-1">
            <MoneyInput
              autoFocus
              valueCents={parseBRLToCents(newBalance) || summary.currentBalanceCents}
              onChangeCents={c => setNewBalance(c.toString())}
              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-blue-500"
              allowNegative={true}
            />
            <button type="submit" className="text-green-600 bg-green-50 p-1.5 rounded-lg hover:bg-green-100">
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setIsEditingBalance(false)} className="text-gray-500 bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div 
            onClick={() => {
              setNewBalance(summary.currentBalanceCents.toString());
              setIsEditingBalance(true);
            }}
            className="text-xl font-black text-gray-950 truncate amount-text cursor-pointer hover:text-blue-600 transition"
            title="Clique para editar o saldo"
          >
            {isHidden ? 'R$ â€¢â€¢â€¢â€¢â€¢â€¢' : formatBRLFromCents(summary.currentBalanceCents)}
          </div>
        )}
      </div>

      {/* Menu List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      
<div className="mt-auto p-3">
  <AppDownloadButton />
</div>
</nav>

      {/* App Install Section */}
      <div className="mt-6 pt-6 border-t border-gray-100 shrink-0">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          ðŸ“± Aplicativo
        </h3>
        
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-black text-gray-900">Finance App</p>
              <p className="text-xs font-bold text-gray-500">v{APP_VERSION}</p>
            </div>
            {/* @ts-ignore */}
            {window.cordova && (
              <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded-lg">INSTALADO</span>
            )}
          </div>

          {/* @ts-ignore */}
          {!window.cordova && (
            <div className="space-y-2">
              <button 
                onClick={() => onViewChange('android_app')}
                className="w-full bg-indigo-600 text-white text-xs font-black py-2.5 rounded-xl shadow-sm active:scale-95 transition flex items-center justify-center gap-2"
              >
                <span>â†“</span> BAIXAR APK
              </button>
              <button 
                onClick={() => onViewChange('android_app_info')}
                className="w-full bg-white text-gray-600 border border-gray-200 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition"
              >
                â„¹ï¸ Como instalar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-72 h-screen sticky top-0 shrink-0 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Slide-over */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

          {/* Drawer content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white focus:outline-none animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}


