import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './data/db';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { QuickAddMenu } from './components/QuickAddMenu';

// Views
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

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadNotificationsCount = useLiveQuery(
    () => db.notifications.filter(n => !n.read).count(),
    []
  ) || 0;

  const handleQuickAddAction = (action: string) => {
    if (action === 'expense' || action === 'income') {
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
      
      {/* Sidebar - Persistent on Desktop, Drawer on Mobile */}
      <Sidebar 
        activeView={activeTab} 
        onViewChange={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Top Header (hidden on Desktop) */}
        <TopHeader 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onNotificationClick={() => setIsNotificationOpen(true)}
          notificationCount={unreadNotificationsCount}
        />

        {/* Main Scroll Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-24 md:pb-6">
          <div className="max-w-2xl mx-auto px-4 pt-6 w-full">
            {activeTab === 'home' && <Dashboard onNavigate={setActiveTab} />}

            {activeTab === 'accounts' && (
              <div className="space-y-6 animate-page">
                <AccountForm />
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Minhas Contas</h2>
                </div>
                <AccountList />
              </div>
            )}

            {activeTab === 'agenda' && <AgendaView />}
            {activeTab === 'debts' && <DebtsView />}
            {activeTab === 'reserves' && <ReservesView />}
            {activeTab === 'invest' && <InvestmentsView />}
            {activeTab === 'monthly_plan' && <MonthlyPlanView />}
            {activeTab === 'android_app' && <AndroidAppView mode="download" />}
            {activeTab === 'android_app_info' && <AndroidAppView mode="info" />}
            
            {/* Fallbacks for menu links */}
            {activeTab === 'goals' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Minhas Metas</h2>
                <p className="text-gray-500 text-sm">Planejamento de objetivos de longo prazo.</p>
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Relatórios Financeiros</h2>
                <p className="text-gray-500 text-sm">Módulo de análise gráfica de despesas.</p>
              </div>
            )}
            {activeTab === 'history' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Histórico de Transações</h2>
                <p className="text-gray-500 text-sm">Logs e extratos detalhados.</p>
              </div>
            )}
            {activeTab === 'backup' && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Backup de Dados</h2>
                <p className="text-gray-500 text-sm">Importação e exportação de banco JSON.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on Desktop) */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onPlusClick={() => setIsQuickAddOpen(true)} 
      />

      {/* Bottom Sheet Quick Add */}
      <QuickAddMenu 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
        onSelectAction={handleQuickAddAction} 
      />

      {/* Notification Center Modal */}
      {isNotificationOpen && (
        <NotificationCenter 
          onClose={() => setIsNotificationOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;
