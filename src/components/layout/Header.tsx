import React, { useState, useEffect } from 'react';
import {
  Bell,
  Database,
  Moon,
  Sun,
  Shield,
  UserCheck,
  Calendar,
  AlertCircle,
  Menu,
  ChevronDown,
  Search,
  Lock
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { UserRole } from '../../types';

export type LayoutMode = 'topbar' | 'sidebar' | 'rail';

interface HeaderProps {
  selectedYearMonth: string;
  onYearMonthChange: (ym: string) => void;
  onOpenFirebaseModal: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenCommandPalette: () => void;
  onNavigate: (module: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  layoutMode: LayoutMode;
  onChangeLayoutMode: (mode: LayoutMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedYearMonth,
  onYearMonthChange,
  onOpenFirebaseModal,
  onOpenCommandPalette,
  onNavigate,
  sidebarOpen,
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
  layoutMode,
  onChangeLayoutMode
}) => {
  const currentUser = dataStorage.getCurrentUser();
  const isDemo = dataStorage.getIsDemoMode();
  const notifications = dataStorage.getSystemNotifications();

  const [availablePeriods, setAvailablePeriods] = useState(() => dataStorage.getAvailablePeriods());

  useEffect(() => {
    const unsubStorage = dataStorage.subscribe(() => {
      setAvailablePeriods(dataStorage.getAvailablePeriods());
    });
    return () => {
      unsubStorage();
    };
  }, []);

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const currentPeriod = availablePeriods.find((p) => p.value === selectedYearMonth);
  const isCurrentMonthClosed = Boolean(currentPeriod?.isClosed);

  const handleRoleSelect = (role: UserRole) => {
    dataStorage.switchRole(role);
    setShowRoleMenu(false);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gestor de Produção';
      case 'supervisor':
        return 'Supervisora de Linha';
      case 'operator':
        return 'Operador';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B192C] text-white border-b border-[#1E3E62] px-4 flex items-center justify-between shadow-md">
      {/* Esquerda: Botão Menu + Logotipo */}
      <div className="flex items-center gap-3">
        {layoutMode !== 'topbar' && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-[#1E3E62] transition text-slate-300 hover:text-white"
            title="Alternar Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-slate-950 text-base shadow-sm">
            IE
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              IEEI <span className="text-emerald-400 font-semibold text-sm">Gestão</span>
            </span>
            <p className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase">Eficiência & Eficácia Individual</p>
          </div>
        </div>

        {/* Botão de Busca Rápida (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E3E62]/60 hover:bg-[#1E3E62] border border-slate-700/80 text-xs text-slate-300 hover:text-white transition ml-2"
          title="Abrir busca rápida (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>Buscar módulo ou funcionário...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#0B192C] text-[10px] font-mono text-slate-400 border border-slate-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Centro: Seletor Global de Período Mês/Ano */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
          isCurrentMonthClosed
            ? 'bg-rose-950/60 border-rose-600/70 text-rose-200'
            : 'bg-[#1E3E62]/80 border-slate-700 text-white'
        }`}
        title={isCurrentMonthClosed ? 'Período formalmente FECHADO para alterações' : 'Período ABERTO para lançamentos'}
      >
        {isCurrentMonthClosed ? (
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
        ) : (
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <select
          value={selectedYearMonth}
          onChange={(e) => onYearMonthChange(e.target.value)}
          className="bg-transparent text-xs font-semibold text-white focus:outline-hidden cursor-pointer"
        >
          {availablePeriods.map((m) => (
            <option key={m.value} value={m.value} className="bg-[#0B192C] text-white">
              {m.label}
            </option>
          ))}
        </select>
        {isCurrentMonthClosed && (
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white uppercase tracking-wider">
            Fechado
          </span>
        )}
      </div>

      {/* Direita: Seletor de Layout, Badges, Notificações, Perfil, Modo Escuro */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alternador de Tipo de Layout */}
        <div className="hidden xl:flex items-center bg-[#07111e] p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => onChangeLayoutMode('topbar')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
              layoutMode === 'topbar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Layout Superior: Máximo espaço horizontal para tabelas e matrizes"
          >
            Comando Superior
          </button>
          <button
            onClick={() => onChangeLayoutMode('sidebar')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
              layoutMode === 'sidebar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Layout Lateral: Menu lateral clássico agrupado"
          >
            Menu Lateral
          </button>
          <button
            onClick={() => onChangeLayoutMode('rail')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
              layoutMode === 'rail'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Layout Compacto: Barra fina de ícones"
          >
            Compacto
          </button>
        </div>

        {/* Badge Modo Demonstração vs Firebase */}
        <button
          onClick={onOpenFirebaseModal}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
          title="Clique para configurar o Firebase ou verificar a conexão"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          {isDemo ? 'MODO DEMO' : 'FIREBASE'}
          <Database className="w-3.5 h-3.5 text-amber-300 ml-0.5" />
        </button>



        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-lg hover:bg-[#1E3E62] transition text-slate-300 hover:text-white relative"
            title="Notificações do Sistema"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-slate-800 dark:text-slate-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notificações Operacionais
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {notifications.length} ativas
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum alerta pendente.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.linkModule) onNavigate(n.linkModule);
                        setShowNotifMenu(false);
                      }}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-left"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" /> {n.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alternador de Tema */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
            darkMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 hover:border-amber-400 hover:text-amber-200 shadow-sm'
              : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400 hover:text-indigo-200 shadow-sm'
          }`}
          title={darkMode ? 'Modo Escuro Ativo (Clique para alternar para Claro)' : 'Modo Claro Ativo (Clique para alternar para Escuro)'}
          aria-label={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
              <span className="text-[11px] font-bold text-amber-300 hidden md:inline">Escuro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-300 transition-transform duration-300 hover:-rotate-12" />
              <span className="text-[11px] font-bold text-indigo-300 hidden md:inline">Claro</span>
            </>
          )}
        </button>

        {/* Perfil & Seletor de Perfis RBAC */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg bg-[#1E3E62] hover:bg-[#274f7c] border border-slate-700 transition"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/40">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-white">{currentUser.name.split(' ')[0]}</p>
              <p className="text-[10px] text-emerald-400 font-mono leading-tight">{getRoleLabel(currentUser.role)}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-100">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
              </div>

              <div className="pt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">
                  Trocar Perfil RBAC (Simulação):
                </p>
                <button
                  onClick={() => handleRoleSelect('admin')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    currentUser.role === 'admin'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-blue-600" /> Administrador (Acesso Total)
                </button>
                <button
                  onClick={() => handleRoleSelect('manager')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    currentUser.role === 'manager'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Gestor (Aprovações & Relatórios)
                </button>
                <button
                  onClick={() => handleRoleSelect('supervisor')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    currentUser.role === 'supervisor'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Supervisora (Apontamentos)
                </button>
                <button
                  onClick={() => handleRoleSelect('operator')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    currentUser.role === 'operator'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Operador (Consulta Limitada)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
