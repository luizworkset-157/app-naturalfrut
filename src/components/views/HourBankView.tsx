import React, { useState, useMemo } from 'react';
import {
  Hourglass,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { HourBankTransaction, HourBankType } from '../../types';
import { formatMinutesToHHMM, formatDateBR } from '../../utils/calculations';
import { exportToExcel } from '../../services/excelService';

interface HourBankViewProps {
  selectedYearMonth: string;
}

export const TRANSACTION_TYPES: Record<HourBankType, { label: string; isCredit: boolean }> = {
  initial_balance: { label: 'Saldo Inicial de Implantação', isCredit: true },
  credit: { label: 'Crédito de Horas Geral', isCredit: true },
  overtime: { label: 'Horas Extras de Produção', isCredit: true },
  compensation: { label: 'Compensação / Folga Programada', isCredit: false },
  debit: { label: 'Débito de Horas', isCredit: false },
  authorized_adjustment: { label: 'Ajuste Autorizado pela Diretoria', isCredit: true },
  occurrence_discount: { label: 'Desconto Automático (Atraso / Almoço)', isCredit: false }
};

export const HourBankView: React.FC<HourBankViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const transactions = dataStorage.getHourBankTransactions();
  const currentUser = dataStorage.getCurrentUser();
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);
  const canApprove = (currentUser.role === 'admin' || currentUser.role === 'manager') && !isMonthClosed;
  const canEdit = !isMonthClosed && currentUser.role !== 'operator';

  // Form State
  const [formData, setFormData] = useState({
    employeeId: employees[0]?.id || '',
    date: `${selectedYearMonth}-15`,
    type: 'overtime' as HourBankType,
    minutes: 120,
    justification: 'Horas extras na conclusão de lote prioritário',
    reporter: currentUser.name
  });

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.date.startsWith(selectedYearMonth) || t.type === 'initial_balance')
      .filter((t) => {
        if (searchTerm) {
          const clean = searchTerm.toLowerCase();
          const matchColab = t.employeeName.toLowerCase().includes(clean);
          const matchReg = t.registrationNumber.toLowerCase().includes(clean);
          const matchJust = t.justification.toLowerCase().includes(clean);
          if (!matchColab && !matchReg && !matchJust) return false;
        }
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterEmployeeId !== 'all' && t.employeeId !== filterEmployeeId) return false;
        return true;
      });
  }, [transactions, selectedYearMonth, searchTerm, filterType, filterEmployeeId]);

  // Resumo de saldos por colaborador
  const employeeBalances = useMemo(() => {
    return employees.map((emp) => {
      const balance = dataStorage.getEmployeeHourBankBalance(emp.id);
      return {
        ...emp,
        balance
      };
    });
  }, [employees, transactions]);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: employees[0]?.id || '',
      date: `${selectedYearMonth}-15`,
      type: 'overtime',
      minutes: 120,
      justification: 'Horas extras autorizadas',
      reporter: currentUser.name
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = dataStorage.getEmployeeById(formData.employeeId);
      if (!emp) throw new Error('Selecione um colaborador.');

      const isDebitType = !TRANSACTION_TYPES[formData.type].isCredit;
      const signedMinutes = isDebitType ? -Math.abs(formData.minutes) : Math.abs(formData.minutes);

      dataStorage.addHourBankTransaction({
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        date: formData.date,
        type: formData.type,
        minutes: signedMinutes,
        justification: formData.justification,
        reporter: formData.reporter,
        status: canApprove ? 'approved' : 'pending',
        approvedBy: canApprove ? currentUser.name : undefined,
        approvedAt: canApprove ? new Date().toISOString() : undefined
      });

      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprove = (id: string) => {
    try {
      dataStorage.approveHourBankTransaction(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((t) => ({
      'Data': formatDateBR(t.date),
      'Matrícula': t.registrationNumber,
      'Colaborador': t.employeeName,
      'Tipo': TRANSACTION_TYPES[t.type].label,
      'Minutos': t.minutes,
      'Tempo (HH:MM)': formatMinutesToHHMM(t.minutes, true),
      'Justificativa': t.justification,
      'Lançador': t.reporter,
      'Situação': t.status === 'approved' ? 'Aprovado' : t.status === 'rejected' ? 'Rejeitado' : 'Pendente'
    }));
    exportToExcel(data, `IEEI_Banco_Horas_${selectedYearMonth}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-amber-600" /> Livro de Movimentações do Banco de Horas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fórmula corporativa: Saldo Atual = Saldo Inicial + Créditos Aprovados - Débitos Aprovados. Formatação em HH:MM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Extrato
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Novo Lançamento
            </button>
          )}
        </div>
      </div>

      {/* Grid de Saldos Consolidados por Colaborador */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Demonstrativo de Saldos Acumulados
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {employeeBalances.map((emp) => {
            const isNegative = emp.balance < 0;
            return (
              <div
                key={emp.id}
                onClick={() => setFilterEmployeeId(filterEmployeeId === emp.id ? 'all' : emp.id)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  filterEmployeeId === emp.id
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{emp.registrationNumber}</span>
                  {isNegative ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5" title={emp.name}>
                  {emp.name.split(' ')[0]} {emp.name.split(' ')[1] || ''}
                </p>
                <div
                  className={`text-base font-extrabold font-mono mt-1 ${
                    isNegative ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatMinutesToHHMM(emp.balance, true)}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">{emp.balance} min totais</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador, justificativa..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Tipos de Movimentação</option>
          {Object.entries(TRANSACTION_TYPES).map(([type, data]) => (
            <option key={type} value={type}>
              {data.label}
            </option>
          ))}
        </select>

        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Colaboradores</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.registrationNumber} - {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Tipo de Lançamento</th>
                <th className="p-3 text-right">Minutos</th>
                <th className="p-3 text-right">Tempo (HH:MM)</th>
                <th className="p-3">Justificativa</th>
                <th className="p-3 text-center">Situação</th>
                {canApprove && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Nenhuma movimentação de banco de horas encontrada no período.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const typeInfo = TRANSACTION_TYPES[t.type] || { label: t.type, isCredit: t.minutes >= 0 };
                  const isPositive = t.minutes >= 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 whitespace-nowrap">{formatDateBR(t.date)}</td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{t.registrationNumber}</td>
                      <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-200">{t.employeeName}</td>
                      <td className="p-3 font-sans text-slate-700 dark:text-slate-300">{typeInfo.label}</td>
                      <td className={`p-3 text-right font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? `+${t.minutes}` : t.minutes}
                      </td>
                      <td className={`p-3 text-right font-bold text-xs ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatMinutesToHHMM(t.minutes, true)}
                      </td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400 max-w-xs truncate" title={t.justification}>
                        {t.justification}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {t.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="w-3 h-3" /> Aprovado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </td>
                      {canApprove && (
                        <td className="p-3 text-center font-sans">
                          {t.status === 'pending' ? (
                            <button
                              onClick={() => handleApprove(t.id)}
                              className="px-2 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 mx-auto"
                            >
                              <Check className="w-3 h-3" /> Aprovar
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Lançar no Banco de Horas
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Colaborador:</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.registrationNumber} - {emp.name} ({emp.sector || emp.team})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Movimentação:</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as HourBankType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {Object.entries(TRANSACTION_TYPES).map(([type, data]) => (
                      <option key={type} value={type}>
                        {data.label} ({data.isCredit ? '+ Crédito' : '- Débito'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantidade de Minutos:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minutes}
                    onChange={(e) => setFormData({ ...formData, minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Equivalente em Horas:</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {formatMinutesToHHMM(formData.minutes)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Motivo:</label>
                <textarea
                  rows={2}
                  required
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Ex: Horas extras na montagem da Linha 01 no sábado..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
