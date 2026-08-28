import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './data/db';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { QuickAddMenu } from './components/QuickAddMenu';

import { Dashboard } from './components/Dashboard';
import { AccountForm } from './components/AccountForm';
import { AccountList } from './components/AccountList';
import { ReservesView } from './components/ReservesView';
import { AgendaView } from './components/AgendaView';
import { InvestmentsView } from './components/InvestmentsView';
import { DebtsView } from './components/DebtsView';
import { MonthlyPlanView } from './components/MonthlyPlanView';
import { NotificationCenter } from './components/NotificationCenter';
import { AndroidAppView } from './components/AndroidAppView';
import { SettingsView } from './components/SettingsView';
import { NativeNotificationService } from './services/NativeNotificationService';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [accountType, setAccountType] = useState<'expense' | 'income'>('expense');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadNotificationsCount = useLiveQuery(
    () => db.notifications.filter(n => !n.read).count(),
    []
  ) || 0;

  // Initialize native notifications (Cordova/Android only — no-op on PWA)
  useEffect(() => {
    const initNotifications = async () => {
      await NativeNotificationService.init();
      await NativeNotificationService.syncAllReminders();
    };

    if (typeof (window as any).cordova !== 'undefined') {
      // Wait for deviceready in Cordova
      document.addEventListener('deviceready', initNotifications, { once: true });
    } else {
      // PWA: init() and sync() are no-ops, safe to call directly
      initNotifications();
    }
  }, []);

  const handleQuickAddAction = (action: string) => {
    if (action === 'expense') {
      setAccountType('expense');
      setActiveTab('accounts');
    } else if (action === 'income') {
      setAccountType('income');
      setActiveTab('accounts');
    } else if (action === 'debt') {
      setActiveTab('debts');
    } else if (action === 'reserve') {
      setActiveTab('reserves');
    } else if (action === 'invest') {
      setActiveTab('invest');
    } else if (action === 'event' || action === 'reminder') {
      setActiveTab('agenda');
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-gray-900 font-sans flex flex-col md:flex-row overflow-x-hidden">

      <Sidebar
        activeView={activeTab}
        onViewChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">

        <TopHeader
          onMenuClick={() => setIsSidebarOpen(true)}
          onNotificationClick={() => setIsNotificationOpen(true)}
          notificationCount={unreadNotificationsCount}
        />

        <main className="w-full overflow-x-hidden pb-24 md:pb-8">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

            {activeTab === 'home' && (
              <Dashboard onNavigate={setActiveTab} />
            )}

            {activeTab === 'accounts' && (
              <section className="w-full max-w-5xl mx-auto">

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-3 sm:p-4 mb-6">
                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() => setAccountType('expense')}
                      className={`min-h-[56px] rounded-2xl font-black text-sm sm:text-base transition-all ${
                        accountType === 'expense'
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      🔴 Despesas
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('income')}
                      className={`min-h-[56px] rounded-2xl font-black text-sm sm:text-base transition-all ${
                        accountType === 'income'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      🟢 Receitas
                    </button>

                  </div>
                </div>

                <div className="space-y-6">

                  <AccountForm type={accountType} />

                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-800">
                        {accountType === 'expense'
                          ? 'Minhas Despesas'
                          : 'Minhas Receitas'}
                      </h2>

                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {accountType === 'expense'
                          ? 'Contas que você precisa pagar'
                          : 'Valores que você espera receber'}
                      </p>
                    </div>
                  </div>

                  <AccountList type={accountType} />

                </div>
              </section>
            )}

            {activeTab === 'agenda' && <AgendaView />}
            {activeTab === 'debts' && <DebtsView />}
            {activeTab === 'reserves' && <ReservesView />}
            {activeTab === 'invest' && <InvestmentsView />}
            {activeTab === 'monthly_plan' && <MonthlyPlanView />}

            {activeTab === 'android_app' && (
              <AndroidAppView mode="download" />
            )}

            {activeTab === 'android_app_info' && (
              <AndroidAppView mode="info" />
            )}

            {activeTab === 'goals' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Minhas Metas</h2>
                <p className="text-gray-500 text-sm">
                  Planejamento de objetivos de longo prazo.
                </p>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">
                  Relatórios Financeiros
                </h2>
                <p className="text-gray-500 text-sm">
                  Módulo de análise gráfica de despesas.
                </p>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">
                  Histórico de Transações
                </h2>
                <p className="text-gray-500 text-sm">
                  Logs e extratos detalhados.
                </p>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">
                  Backup de Dados
                </h2>
                <p className="text-gray-500 text-sm">
                  Importação e exportação de banco JSON.
                </p>
              </div>
            )}

            {activeTab === 'settings' && (
              <SettingsView />
            )}

          </div>
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPlusClick={() => setIsQuickAddOpen(true)}
      />

      <QuickAddMenu
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectAction={handleQuickAddAction}
      />

      {isNotificationOpen && (
        <NotificationCenter
          onClose={() => setIsNotificationOpen(false)}
        />
      )}

    </div>
  );
}

export default App;
