import React, { useState, useMemo } from 'react';
import {
  ClockAlert,
  Plus,
  Search,
  Filter,
  Trash2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Edit2,
  CalendarRange,
  RotateCcw
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { DelayOccurrence } from '../../types';
import { formatMinutesToHHMM, formatDateBR } from '../../utils/calculations';
import { exportToExcel } from '../../services/excelService';

interface DelayOccurrencesViewProps {
  selectedYearMonth: string;
}

export const DELAY_REASONS = [
  'Problemas de transporte / trânsito',
  'Problemas de saúde (sem afastamento integral)',
  'Problemas pessoais emergenciais',
  'Condições climáticas adversas',
  'Atraso justificado autorizado',
  'Atraso injustificado',
  'Atraso programado (dispensa prévia)'
];

export const DelayOccurrencesView: React.FC<DelayOccurrencesViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelay, setEditingDelay] = useState<DelayOccurrence | null>(null);

  // Filtro de Data em Modo Calendário (Do dia X ao dia X)
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const lastDayOfMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
  const defaultStartDate = `${selectedYearMonth}-01`;
  const defaultEndDate = `${selectedYearMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const delayOccurrences = dataStorage.getDelayOccurrences();
  const config = dataStorage.getConfig();
  const currentUser = dataStorage.getCurrentUser();
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);
  const canEdit = !isMonthClosed && currentUser.role !== 'operator';

  // Form State Novo
  const [formData, setFormData] = useState({
    date: `${selectedYearMonth}-15`,
    employeeId: employees[0]?.id || '',
    expectedTime: '06:00',
    actualTime: '06:25',
    reasonDescription: DELAY_REASONS[0],
    justification: '',
    reporter: currentUser.name
  });

  // Form State Edição
  const [editFormData, setEditFormData] = useState({
    date: '',
    employeeId: '',
    expectedTime: '06:00',
    actualTime: '06:25',
    reasonDescription: DELAY_REASONS[0],
    justification: '',
    reporter: ''
  });

  // Cálculo automático de minutos de atraso
  const calculateDelayMinutes = (expected: string, actual: string): number => {
    if (!expected || !actual) return 0;
    const [expH, expM] = expected.split(':').map(Number);
    const [actH, actM] = actual.split(':').map(Number);
    let totalExp = expH * 60 + expM;
    let totalAct = actH * 60 + actM;
    if (totalAct < totalExp) totalAct += 24 * 60; // virada de meia-noite
    return Math.max(0, totalAct - totalExp);
  };

  const previewMinutes = calculateDelayMinutes(formData.expectedTime, formData.actualTime);
  const editPreviewMinutes = calculateDelayMinutes(editFormData.expectedTime, editFormData.actualTime);

  // Filtragem combinando Busca textual e Filtro de Período Calendário ("Do dia X ao dia X")
  const filtered = useMemo(() => {
    return delayOccurrences
      .filter((d) => {
        // Filtro de data por período calendário
        if (startDate && d.date < startDate) return false;
        if (endDate && d.date > endDate) return false;

        // Se nenhum período estiver definido, filtra pelo mês selecionado
        if (!startDate && !endDate && !d.date.startsWith(selectedYearMonth)) return false;

        if (searchTerm) {
          const clean = searchTerm.toLowerCase();
          const matchColab = d.employeeName.toLowerCase().includes(clean);
          const matchReg = d.registrationNumber.toLowerCase().includes(clean);
          const matchReason = d.reasonDescription.toLowerCase().includes(clean);
          if (!matchColab && !matchReg && !matchReason) return false;
        }
        return true;
      });
  }, [delayOccurrences, selectedYearMonth, startDate, endDate, searchTerm]);

  // Estatísticas de Reincidência
  const recurrenceStats = useMemo(() => {
    const counts: Record<string, { employeeName: string; reg: string; count: number; totalMinutes: number }> = {};
    filtered.forEach((d) => {
      if (!counts[d.employeeId]) {
        counts[d.employeeId] = {
          employeeName: d.employeeName,
          reg: d.registrationNumber,
          count: 0,
          totalMinutes: 0
        };
      }
      counts[d.employeeId].count += 1;
      counts[d.employeeId].totalMinutes += d.delayMinutes;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Presets de Data
  const handlePresetMonth = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  };

  const handlePresetQuinzena1 = () => {
    setStartDate(`${selectedYearMonth}-01`);
    setEndDate(`${selectedYearMonth}-15`);
  };

  const handlePresetQuinzena2 = () => {
    setStartDate(`${selectedYearMonth}-16`);
    setEndDate(defaultEndDate);
  };

  const handleClearPeriod = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleOpenAdd = () => {
    setFormData({
      date: `${selectedYearMonth}-15`,
      employeeId: employees[0]?.id || '',
      expectedTime: '06:00',
      actualTime: '06:25',
      reasonDescription: DELAY_REASONS[0],
      justification: '',
      reporter: currentUser.name
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = dataStorage.getEmployeeById(formData.employeeId);
      if (!emp) throw new Error('Selecione um colaborador.');

      const delayMinutes = calculateDelayMinutes(formData.expectedTime, formData.actualTime);
      if (delayMinutes <= 0) throw new Error('O horário real deve ser posterior ao horário previsto.');

      dataStorage.addDelayOccurrence({
        date: formData.date,
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        reasonCode: 'ATR',
        reasonDescription: formData.reasonDescription,
        expectedTime: formData.expectedTime,
        actualTime: formData.actualTime,
        delayMinutes,
        justification: formData.justification,
        reporter: formData.reporter
      });

      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (d: DelayOccurrence) => {
    setEditingDelay(d);
    setEditFormData({
      date: d.date,
      employeeId: d.employeeId,
      expectedTime: d.expectedTime,
      actualTime: d.actualTime,
      reasonDescription: d.reasonDescription,
      justification: d.justification || '',
      reporter: d.reporter
    });
  };

  // Salvar Edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelay) return;
    try {
      const emp = dataStorage.getEmployeeById(editFormData.employeeId) || {
        id: editingDelay.employeeId,
        registrationNumber: editingDelay.registrationNumber,
        name: editingDelay.employeeName
      };

      const delayMinutes = calculateDelayMinutes(editFormData.expectedTime, editFormData.actualTime);
      if (delayMinutes <= 0) throw new Error('O horário real deve ser posterior ao horário previsto.');

      dataStorage.updateDelayOccurrence(editingDelay.id, {
        date: editFormData.date,
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        expectedTime: editFormData.expectedTime,
        actualTime: editFormData.actualTime,
        delayMinutes,
        reasonDescription: editFormData.reasonDescription,
        justification: editFormData.justification,
        reporter: editFormData.reporter
      });

      setEditingDelay(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir apontamento de atraso de ${name}?`)) {
      dataStorage.deleteDelayOccurrence(id);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((d) => ({
      'Data': formatDateBR(d.date),
      'Matrícula': d.registrationNumber,
      'Colaborador': d.employeeName,
      'Horário Previsto': d.expectedTime,
      'Horário Real': d.actualTime,
      'Minutos de Atraso': d.delayMinutes,
      'Duração (HH:MM)': formatMinutesToHHMM(d.delayMinutes),
      'Motivo': d.reasonDescription,
      'Reincidência no Mês': `${d.recurrenceCountInMonth || 1}ª vez`,
      'Justificativa': d.justification || '',
      'Responsável': d.reporter
    }));
    exportToExcel(data, `IEEI_Atrasos_${startDate || selectedYearMonth}_a_${endDate || selectedYearMonth}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClockAlert className="w-5 h-5 text-amber-600" /> Ocorrências & Controle de Atrasos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lançamentos editáveis, filtro de calendário por período (Do dia X ao dia X) e formato de data corporativo DD/MM/AAAA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Registrar Atraso
            </button>
          )}
        </div>
      </div>

      {/* Painel de Filtro de Calendário por Período */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Filtro de Data (Modo Calendário):
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {startDate && endDate ? (
                <>Do dia <strong className="text-amber-600 dark:text-amber-400">{formatDateBR(startDate)}</strong> ao dia <strong className="text-amber-600 dark:text-amber-400">{formatDateBR(endDate)}</strong></>
              ) : (
                'Todo o histórico disponível'
              )}
            </span>
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={handlePresetMonth}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px] font-medium"
            >
              Mês Completo
            </button>
            <button
              onClick={handlePresetQuinzena1}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px] font-medium"
            >
              1ª Quinzena (01-15)
            </button>
            <button
              onClick={handlePresetQuinzena2}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px] font-medium"
            >
              2ª Quinzena (16-fim)
            </button>
            <button
              onClick={handleClearPeriod}
              className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px]"
            >
              Limpar Período
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              De (Início):
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Até (Fim):
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador, matrícula ou motivo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Painel de Reincidência e Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total de Atrasos no Período</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{filtered.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Ocorrências registradas no intervalo selecionado</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tempo Total Atrasado</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {formatMinutesToHHMM(filtered.reduce((acc, d) => acc + d.delayMinutes, 0))}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Minutos não produtivos acumulados</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Alerta de Reincidência</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {recurrenceStats.filter((s) => s.count >= config.alertDelayMonthlyRecurrence).length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Colaboradores com {config.alertDelayMonthlyRecurrence}+ atrasos no período
          </p>
        </div>
      </div>

      {/* Tabela de Atrasos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Previsto</th>
                <th className="p-3">Real</th>
                <th className="p-3 text-right">Duração</th>
                <th className="p-3 text-center">Reincidência</th>
                <th className="p-3">Motivo / Justificativa</th>
                <th className="p-3">Registrado Por</th>
                {canEdit && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Nenhum atraso registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDateBR(d.date)}
                    </td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{d.registrationNumber}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-200">{d.employeeName}</td>
                    <td className="p-3">{d.expectedTime}</td>
                    <td className="p-3 text-rose-600 font-bold">{d.actualTime}</td>
                    <td className="p-3 text-right font-bold text-amber-600">
                      +{d.delayMinutes} min ({formatMinutesToHHMM(d.delayMinutes)})
                    </td>
                    <td className="p-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (d.recurrenceCountInMonth || 1) >= 3
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {d.recurrenceCountInMonth || 1}ª vez
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate" title={d.justification || d.reasonDescription}>
                      {d.reasonDescription} {d.justification ? `- ${d.justification}` : ''}
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{d.reporter}</td>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 transition"
                            title="Editar Apontamento de Atraso"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id, d.employeeName)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançamento de Atraso */}
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
              Registrar Ocorrência de Atraso
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
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada: {formatDateBR(formData.date)}</span>
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Horário Previsto (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={formData.expectedTime}
                    onChange={(e) => setFormData({ ...formData, expectedTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Horário Real de Entrada:</label>
                  <input
                    type="time"
                    required
                    value={formData.actualTime}
                    onChange={(e) => setFormData({ ...formData, actualTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Prévia do Cálculo de Minutos */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Cálculo Automático de Atraso:</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono font-bold text-sm">
                  +{previewMinutes} min ({formatMinutesToHHMM(previewMinutes)})
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo do Atraso:</label>
                <select
                  value={formData.reasonDescription}
                  onChange={(e) => setFormData({ ...formData, reasonDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {DELAY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Observações:</label>
                <textarea
                  rows={2}
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Ex: Pneu do ônibus estourou na rodovia..."
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
                  Confirmar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Apontamento de Atraso */}
      {editingDelay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setEditingDelay(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-600" /> Editar Apontamento de Atraso
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Colaborador: {editingDelay.employeeName} ({editingDelay.registrationNumber})
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data:</label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada: {formatDateBR(editFormData.date)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Colaborador:</label>
                  <select
                    value={editFormData.employeeId}
                    onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Horário Previsto (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={editFormData.expectedTime}
                    onChange={(e) => setEditFormData({ ...editFormData, expectedTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Horário Real de Entrada:</label>
                  <input
                    type="time"
                    required
                    value={editFormData.actualTime}
                    onChange={(e) => setEditFormData({ ...editFormData, actualTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Prévia do Cálculo de Minutos */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Cálculo Automático Recalculado:</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono font-bold text-sm">
                  +{editPreviewMinutes} min ({formatMinutesToHHMM(editPreviewMinutes)})
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo do Atraso:</label>
                <select
                  value={editFormData.reasonDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, reasonDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {DELAY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Observações:</label>
                <textarea
                  rows={2}
                  value={editFormData.justification}
                  onChange={(e) => setEditFormData({ ...editFormData, justification: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDelay(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
