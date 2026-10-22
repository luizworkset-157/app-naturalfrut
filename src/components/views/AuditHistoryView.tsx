import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { AuditLog } from '../../types';
import { exportToExcel } from '../../services/excelService';
import { formatDateTimeBR } from '../../utils/calculations';

export const AuditHistoryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const auditLogs = dataStorage.getAuditLogs();

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      if (searchTerm) {
        const clean = searchTerm.toLowerCase();
        const matchUser = log.userName.toLowerCase().includes(clean);
        const matchEntity = log.entity.toLowerCase().includes(clean);
        const matchDetails = log.details.toLowerCase().includes(clean);
        if (!matchUser && !matchEntity && !matchDetails) return false;
      }
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      return true;
    });
  }, [auditLogs, searchTerm, filterAction]);

  const handleExportExcel = () => {
    const data = filtered.map((l) => ({
      'Data / Hora': formatDateTimeBR(l.timestamp),
      'Usuário': l.userName,
      'Perfil': l.userRole,
      'Ação': l.action,
      'Entidade': l.entity,
      'ID Registro': l.entityId,
      'Detalhamento': l.details
    }));
    exportToExcel(data, `IEEI_Trilha_Auditoria_${new Date().toISOString().split('T')[0]}`);
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'create':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Criação</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Atualização</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Exclusão</span>;
      case 'approve':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Aprovação</span>;
      case 'reject':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Rejeição</span>;
      case 'close_month':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">Fechamento Mês</span>;
      case 'reopen_month':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Reabertura Mês</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" /> Trilha de Auditoria & Histórico de Movimentações
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro imutável de todas as ações executadas no sistema para conformidade, LGPD e governança corporativa.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Auditoria
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por usuário, entidade ou detalhe..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todas as Ações</option>
          <option value="create">Criação</option>
          <option value="update">Atualização</option>
          <option value="delete">Exclusão</option>
          <option value="approve">Aprovação</option>
          <option value="reject">Rejeição</option>
          <option value="close_month">Fechamento de Mês</option>
          <option value="reopen_month">Reabertura de Mês</option>
          <option value="config_change">Alteração de Configuração</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data & Hora</th>
                <th className="p-3">Usuário Responsável</th>
                <th className="p-3">Perfil RBAC</th>
                <th className="p-3 text-center">Tipo de Ação</th>
                <th className="p-3">Entidade Afetada</th>
                <th className="p-3">Detalhamento da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Nenhum registro de auditoria corresponde aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatDateTimeBR(log.timestamp)}
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-3 font-sans text-slate-500 uppercase text-[10px]">
                      {log.userRole}
                    </td>
                    <td className="p-3 text-center font-sans">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {log.entity}
                    </td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
