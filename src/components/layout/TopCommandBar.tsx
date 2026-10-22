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
  ChevronRight,
  Clock
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';

interface TopCommandBarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
}

export interface ModuleCategory {
  id: string;
  name: string;
  icon: any;
  modules: {
    id: string;
    label: string;
    shortLabel: string;
    icon: any;
    highlight?: boolean;
    restricted?: boolean;
    badge?: string;
  }[];
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({ currentModule, onNavigate }) => {
  const currentUser = dataStorage.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const categories: ModuleCategory[] = [
    {
      id: 'overview',
      name: '1. Visão Geral & IEEI',
      icon: TrendingUp,
      modules: [
        { id: 'dashboard', label: 'Dashboard Geral', shortLabel: 'Dashboard', icon: LayoutDashboard },
        { id: 'ieei', label: 'Índice IEEI (Frequência, Pontualidade & Almoço)', shortLabel: 'Índice IEEI', icon: TrendingUp, highlight: true },
        { id: 'reports', label: 'Relatórios (PDF / Excel)', shortLabel: 'Relatórios', icon: FileText }
      ]
    },
    {
      id: 'attendance_suite',
      name: '2. Frequência & Banco de Horas',
      icon: Clock,
      modules: [
        { id: 'attendance', label: 'Folha de Assiduidade', shortLabel: 'Assiduidade', icon: CalendarCheck },
        { id: 'absence', label: 'Ocorrências de Faltas', shortLabel: 'Faltas', icon: UserX },
        { id: 'delays', label: 'Ocorrências de Atrasos', shortLabel: 'Atrasos', icon: ClockAlert },
        { id: 'lunch', label: 'Controle de Almoço', shortLabel: 'Almoço', icon: Utensils },
        { id: 'hour_bank', label: 'Banco de Horas', shortLabel: 'Banco de Horas', icon: Hourglass }
      ]
    },
    {
      id: 'governance',
      name: '3. Administração & Cadastros',
      icon: ShieldCheck,
      modules: [
        { id: 'employees', label: 'Cadastro de Colaboradores', shortLabel: 'Colaboradores', icon: Users },
        { id: 'audit', label: 'Histórico de Movimentações', shortLabel: 'Auditoria', icon: History, restricted: !isManagerOrAdmin },
        { id: 'settings', label: 'Configurações de Metas', shortLabel: 'Configurações', icon: Settings, restricted: !isAdmin },
        { id: 'users', label: 'Gestão de Usuários RBAC', shortLabel: 'Usuários', icon: ShieldCheck, restricted: !isAdmin }
      ]
    }
  ];

  // Identificar categoria ativa
  const activeCategory = categories.find((cat) =>
    cat.modules.some((m) => m.id === currentModule)
  ) || categories[0];

  const activeModuleItem = activeCategory.modules.find((m) => m.id === currentModule) || activeCategory.modules[0];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs mb-4">
      {/* Nível 1: Categorias Operacionais em Abas Superiores */}
      <div className="px-4 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-2">
          {categories.map((cat) => {
            const isCatActive = cat.id === activeCategory.id;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  // Navega para o primeiro módulo da categoria
                  const firstAllowed = cat.modules.find((m) => !m.restricted) || cat.modules[0];
                  onNavigate(firstAllowed.id);
                }}
                className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                  isCatActive
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                <CatIcon className={`w-4 h-4 ${isCatActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Breadcrumb Contextual */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium shrink-0">
          <span>IEEI Gestão</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-600 dark:text-slate-300 font-semibold">{activeCategory.name}</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeModuleItem?.label}</span>
        </div>
      </div>

      {/* Nível 2: Pílulas dos Módulos Específicos da Categoria Ativa */}
      <div className="px-4 sm:px-6 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 hidden sm:inline">
          Módulos:
        </span>
        {activeCategory.modules.map((m) => {
          if (m.restricted) return null;

          const Icon = m.icon;
          const isCurrent = m.id === currentModule;

          return (
            <button
              key={m.id}
              onClick={() => onNavigate(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 shadow-xs ${
                isCurrent
                  ? 'bg-[#0B192C] text-white shadow-sm ring-1 ring-emerald-500/50'
                  : m.highlight
                  ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{m.label}</span>
              {m.highlight && !isCurrent && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
