import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
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
  ArrowRight,
  User,
  X
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const employees = dataStorage.getEmployees();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const modules = [
    { id: 'dashboard', name: 'Dashboard Geral Executivo', cat: 'Visão Geral', icon: LayoutDashboard },
    { id: 'ieei', name: 'Índice IEEI & Gargalos (Frequência, Pontualidade & Almoço)', cat: 'Visão Geral', icon: TrendingUp },
    { id: 'reports', name: 'Relatórios Oficiais (PDF & Excel)', cat: 'Visão Geral', icon: FileText },
    { id: 'attendance', name: 'Folha de Presença & Assiduidade', cat: 'Jornada & Frequência', icon: CalendarCheck },
    { id: 'absence', name: 'Solicitações de Faltas (COD01-COD07)', cat: 'Jornada & Frequência', icon: UserX },
    { id: 'delays', name: 'Ocorrências & Reincidência de Atrasos', cat: 'Jornada & Frequência', icon: ClockAlert },
    { id: 'lunch', name: 'Controle de Intervalo de Almoço', cat: 'Jornada & Frequência', icon: Utensils },
    { id: 'hour_bank', name: 'Livro de Movimentações do Banco de Horas', cat: 'Jornada & Frequência', icon: Hourglass },
    { id: 'employees', name: 'Cadastro Central de Colaboradores', cat: 'Administração', icon: Users },
    { id: 'audit', name: 'Trilha de Auditoria & Histórico', cat: 'Administração', icon: History },
    { id: 'settings', name: 'Configurações de Metas & Fechamento', cat: 'Administração', icon: Settings },
    { id: 'users', name: 'Gestão de Usuários e Perfis RBAC', cat: 'Administração', icon: ShieldCheck }
  ];

  const filteredModules = useMemo(() => {
    if (!query.trim()) return modules.slice(0, 8);
    const clean = query.toLowerCase();
    return modules.filter((m) => m.name.toLowerCase().includes(clean) || m.cat.toLowerCase().includes(clean));
  }, [query]);

  const filteredEmployees = useMemo(() => {
    if (!query.trim()) return [];
    const clean = query.toLowerCase();
    return employees
      .filter((e) => e.name.toLowerCase().includes(clean) || e.registrationNumber.toLowerCase().includes(clean))
      .slice(0, 5);
  }, [query, employees]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar módulos, colaboradores ou comandos..."
            className="w-full bg-transparent text-sm font-medium focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3">
          {/* Colaboradores encontrados */}
          {filteredEmployees.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                Colaboradores
              </p>
              <div className="space-y-1">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      onNavigate('employees');
                      onClose();
                    }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold font-mono text-[11px]">
                        {emp.registrationNumber.substring(0, 3)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Matrícula: {emp.registrationNumber} | {emp.sector || emp.team} | {emp.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      Ver Ficha <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Módulos do Sistema */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
              Módulos Operacionais ({filteredModules.length})
            </p>
            <div className="space-y-1">
              {filteredModules.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onNavigate(m.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {m.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">{m.cat}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Esc</kbd> para fechar</span>
          <span>IEEI Gestão - Acesso Rápido</span>
        </div>
      </div>
    </div>
  );
};
