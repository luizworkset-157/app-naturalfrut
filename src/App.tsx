import React, { useState, useEffect } from 'react';
import { Header, LayoutMode } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { DashboardView } from './components/views/DashboardView';
import { EmployeesView } from './components/views/EmployeesView';
import { AttendanceView } from './components/views/AttendanceView';
import { AbsenceRequestsView } from './components/views/AbsenceRequestsView';
import { DelayOccurrencesView } from './components/views/DelayOccurrencesView';
import { LunchControlView } from './components/views/LunchControlView';
import { HourBankView } from './components/views/HourBankView';
import { IEEIView } from './components/views/IEEIView';
import { ReportsView } from './components/views/ReportsView';
import { AuditHistoryView } from './components/views/AuditHistoryView';
import { SettingsView } from './components/views/SettingsView';
import { UsersView } from './components/views/UsersView';
import { FirebaseSetupModal } from './components/modals/FirebaseSetupModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { dataStorage } from './services/dataStorage';

export default function App() {
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('2026-10');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ieei_theme') === 'dark';
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('ieei_layout_mode') as LayoutMode) || 'topbar';
  });
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [, setTick] = useState(0);

  // Assinar atualizações de estado do serviço de dados
  useEffect(() => {
    const unsubscribe = dataStorage.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  // Atalho de teclado global Ctrl+K / Cmd+K para busca rápida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Efeito para alternar classe dark no elemento raiz
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('ieei_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('ieei_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('ieei_layout_mode', mode);
  };

  const renderCurrentModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardView selectedYearMonth={selectedYearMonth} onNavigate={setCurrentModule} />;
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
        return <AttendanceView selectedYearMonth={selectedYearMonth} />;
      case 'absence':
        return <AbsenceRequestsView selectedYearMonth={selectedYearMonth} />;
      case 'delays':
        return <DelayOccurrencesView selectedYearMonth={selectedYearMonth} />;
      case 'lunch':
        return <LunchControlView selectedYearMonth={selectedYearMonth} />;
      case 'hour_bank':
        return <HourBankView selectedYearMonth={selectedYearMonth} />;
      case 'ieei':
        return <IEEIView selectedYearMonth={selectedYearMonth} />;
      case 'reports':
        return <ReportsView selectedYearMonth={selectedYearMonth} />;
      case 'audit':
        return <AuditHistoryView />;
      case 'settings':
        return (
          <SettingsView
            selectedYearMonth={selectedYearMonth}
            onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          />
        );
      case 'users':
        return <UsersView />;
      default:
        return <DashboardView selectedYearMonth={selectedYearMonth} onNavigate={setCurrentModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Cabeçalho Corporativo */}
      <Header
        selectedYearMonth={selectedYearMonth}
        onYearMonthChange={setSelectedYearMonth}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNavigate={setCurrentModule}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        layoutMode={layoutMode}
        onChangeLayoutMode={handleLayoutChange}
      />

      {/* Se o Layout for Topbar (Centro de Comando Horizontal), renderiza a barra superior */}
      {layoutMode === 'topbar' && (
        <TopCommandBar
          currentModule={currentModule}
          onNavigate={setCurrentModule}
        />
      )}

      {/* Corpo com Barra Lateral (se modo sidebar ou rail) e Área de Trabalho */}
      <div className="flex-1 flex overflow-hidden">
        {layoutMode !== 'topbar' && (
          <Sidebar
            currentModule={currentModule}
            onNavigate={setCurrentModule}
            isOpen={sidebarOpen}
            layoutMode={layoutMode}
          />
        )}

        {/* Área Operacional com Scroll Independente e Espaço Otimizado */}
        <main className={`flex-1 overflow-y-auto ${layoutMode === 'topbar' ? 'p-4 sm:p-6 lg:p-8 pt-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          <div className="max-w-7xl mx-auto">
            {renderCurrentModule()}
          </div>
        </main>
      </div>

      {/* Modal de Conexão com Firebase */}
      <FirebaseSetupModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      {/* Modal de Busca Rápida e Comandos (Ctrl + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentModule}
      />
    </div>
  );
}
