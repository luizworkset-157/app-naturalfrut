import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserX,
  ClockAlert,
  Utensils,
  Hourglass,
  TrendingUp,
  FileText,
  History,
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { LayoutMode } from './Header';

interface SidebarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  isOpen: boolean;
  layoutMode: LayoutMode;
}

interface SidebarMenuItem {
  id: string;
  label: string;
  icon: any;
  highlight?: boolean;
  restricted?: boolean;
}

interface SidebarSection {
  group: string;
  items: SidebarMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onNavigate,
  isOpen,
  layoutMode
}) => {
  const currentUser = dataStorage.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const sections: SidebarSection[] = [
    {
      group: 'Visão Geral & Desempenho',
      items: [
        { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
        { id: 'ieei', label: 'Índice IEEI', icon: TrendingUp, highlight: true },
        { id: 'reports', label: 'Relatórios', icon: FileText }
      ]
    },
    {
      group: 'Frequência & Jornada',
      items: [
        { id: 'attendance', label: 'Assiduidade', icon: CalendarCheck },
        { id: 'absence', label: 'Ocorrências de Faltas', icon: UserX },
        { id: 'delays', label: 'Ocorrências de Atrasos', icon: ClockAlert },
        { id: 'lunch', label: 'Controle de Almoço', icon: Utensils },
        { id: 'hour_bank', label: 'Banco de Horas', icon: Hourglass }
      ]
    },
    {
      group: 'Administração & Governança',
      items: [
        { id: 'employees', label: 'Colaboradores', icon: Users },
        { id: 'audit', label: 'Histórico & Auditoria', icon: History, restricted: !isManagerOrAdmin },
        { id: 'settings', label: 'Configurações de Metas', icon: Settings, restricted: !isAdmin },
        { id: 'users', label: 'Administração RBAC', icon: ShieldCheck, restricted: !isAdmin }
      ]
    }
  ];

  const isRail = layoutMode === 'rail';

  return (
    <aside
      className={`fixed lg:static top-16 bottom-0 left-0 z-20 flex flex-col bg-[#0B192C] text-slate-300 border-r border-[#1E3E62] transition-all duration-300 ease-in-out shadow-xl lg:shadow-none ${
        isRail
          ? 'w-16 translate-x-0'
          : isOpen
          ? 'w-64 translate-x-0'
          : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0 overflow-hidden'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) => !item.restricted);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isRail && isOpen && (
                <p className="text-[10px] uppercase font-bold text-slate-400/90 px-3 py-1 tracking-wider">
                  {section.group}
                </p>
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                        : item.highlight
                        ? 'text-emerald-400 hover:bg-[#1E3E62] hover:text-white'
                        : 'text-slate-300 hover:bg-[#1E3E62] hover:text-white'
                    } ${isRail ? 'justify-center px-0' : ''}`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.highlight
                          ? 'text-emerald-400'
                          : 'text-slate-400 group-hover:text-emerald-400'
                      }`}
                    />

                    {!isRail && (
                      <span className={`truncate text-left flex-1 ${!isOpen ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>
                    )}

                    {!isRail && isActive && (
                      <ChevronRight className={`w-3.5 h-3.5 text-white/80 shrink-0 ${!isOpen ? 'lg:hidden' : ''}`} />
                    )}

                    {/* Tooltip flutuante para modo Rail */}
                    {isRail && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition whitespace-nowrap z-50 border border-slate-700">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer do Menu */}
      <div
        className={`p-3 border-t border-[#1E3E62] bg-[#07111e] text-[11px] text-slate-400 ${
          isRail ? 'text-center' : !isOpen ? 'lg:hidden' : ''
        }`}
      >
        {isRail ? (
          <span className="font-mono font-bold text-emerald-400 text-xs">IE</span>
        ) : (
          <div>
            <p className="font-semibold text-white">IEEI Gestão v2.5</p>
            <p className="text-[10px] text-slate-500">Padrão Manufatura / Indústria</p>
          </div>
        )}
      </div>
    </aside>
  );
};
