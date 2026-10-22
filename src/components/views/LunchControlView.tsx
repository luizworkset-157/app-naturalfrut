import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Plus,
  Search,
  Filter,
  Trash2,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CalendarRange,
  Edit2
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { LunchInterval } from '../../types';
import { calculateLunchInterval, formatMinutesToHHMM, formatDateBR } from '../../utils/calculations';
import { exportToExcel } from '../../services/excelService';

interface LunchControlViewProps {
  selectedYearMonth: string;
}

export const LunchControlView: React.FC<LunchControlViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExcessOnly, setFilterExcessOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<LunchInterval | null>(null);

  // Filtro de Data em Modo Calendário (Do dia X ao dia X)
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const lastDayOfMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
  const defaultStartDate = `${selectedYearMonth}-01`;
  const defaultEndDate = `${selectedYearMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const lunchIntervals = dataStorage.getLunchIntervals();
  const config = dataStorage.getConfig();
  const currentUser = dataStorage.getCurrentUser();
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);
  const canEdit = !isMonthClosed && currentUser.role !== 'operator';

  // Form State Novo
  const [formData, setFormData] = useState({
    date: `${selectedYearMonth}-15`,
    employeeId: employees[0]?.id || '',
    exitTime: '12:00',
    returnTime: '13:00',
    allowedMinutes: config.defaultLunchMinutes || 60,
    justification: '',
    generatesOccurrence: false
  });

  // Form State Edição
  const [editFormData, setEditFormData] = useState({
    date: '',
    employeeId: '',
    exitTime: '12:00',
    returnTime: '13:00',
    allowedMinutes: config.defaultLunchMinutes || 60,
    justification: '',
    generatesOccurrence: false
  });

  const filtered = useMemo(() => {
    return lunchIntervals
      .filter((l) => {
        // Filtro de data em modo calendário por período
        if (startDate && l.date < startDate) return false;
        if (endDate && l.date > endDate) return false;

        // Se nenhum período estiver selecionado, filtra pelo mês
        if (!startDate && !endDate && !l.date.startsWith(selectedYearMonth)) return false;

        if (searchTerm) {
          const clean = searchTerm.toLowerCase();
          const matchColab = l.employeeName.toLowerCase().includes(clean);
          const matchReg = l.registrationNumber.toLowerCase().includes(clean);
          if (!matchColab && !matchReg) return false;
        }
        if (filterExcessOnly && l.excessMinutes <= 0) return false;
        return true;
      });
  }, [lunchIntervals, selectedYearMonth, startDate, endDate, searchTerm, filterExcessOnly]);

  const preview = calculateLunchInterval(formData.exitTime, formData.returnTime, formData.allowedMinutes);
  const editPreview = calculateLunchInterval(editFormData.exitTime, editFormData.returnTime, editFormData.allowedMinutes);

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
      exitTime: '12:00',
      returnTime: '13:00',
      allowedMinutes: config.defaultLunchMinutes || 60,
      justification: '',
      generatesOccurrence: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = dataStorage.getEmployeeById(formData.employeeId);
      if (!emp) throw new Error('Selecione um colaborador.');

      dataStorage.addLunchInterval({
        date: formData.date,
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        exitTime: formData.exitTime,
        returnTime: formData.returnTime,
        allowedMinutes: Number(formData.allowedMinutes),
        justification: formData.justification,
        generatesOccurrence: formData.generatesOccurrence
      });

      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (l: LunchInterval) => {
    setEditingInterval(l);
    setEditFormData({
      date: l.date,
      employeeId: l.employeeId,
      exitTime: l.exitTime,
      returnTime: l.returnTime,
      allowedMinutes: l.allowedMinutes || 60,
      justification: l.justification || '',
      generatesOccurrence: Boolean(l.generatesOccurrence)
    });
  };

  // Salvar Edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInterval) return;
    try {
      const emp = dataStorage.getEmployeeById(editFormData.employeeId) || {
        id: editingInterval.employeeId,
        registrationNumber: editingInterval.registrationNumber,
        name: editingInterval.employeeName
      };

      dataStorage.updateLunchInterval(editingInterval.id, {
        date: editFormData.date,
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        exitTime: editFormData.exitTime,
        returnTime: editFormData.returnTime,
        allowedMinutes: Number(editFormData.allowedMinutes),
        justification: editFormData.justification,
        generatesOccurrence: editFormData.generatesOccurrence
      });

      setEditingInterval(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir apontamento de almoço de ${name}?`)) {
      dataStorage.deleteLunchInterval(id);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((l) => ({
      'Data': formatDateBR(l.date),
      'Matrícula': l.registrationNumber,
      'Colaborador': l.employeeName,
      'Horário Saída': l.exitTime,
      'Horário Retorno': l.returnTime,
      'Intervalo Total': `${l.intervalMinutes} min (${formatMinutesToHHMM(l.intervalMinutes)})`,
      'Tempo Permitido': `${l.allowedMinutes} min`,
      'Excedente': l.excessMinutes > 0 ? `+${l.excessMinutes} min (${formatMinutesToHHMM(l.excessMinutes)})` : '00:00',
      'Justificativa': l.justification || ''
    }));
    exportToExcel(data, `IEEI_Controle_Almoco_${startDate || selectedYearMonth}_a_${endDate || selectedYearMonth}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-600" /> Controle de Intervalo de Almoço
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lançamentos editáveis, filtro de calendário por período (Do dia X ao dia X) e formato corporativo de data DD/MM/AAAA.
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
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Registrar Intervalo
            </button>
          )}
        </div>
      </div>

      {/* Painel de Filtro de Calendário por Período */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Filtro de Data (Modo Calendário):
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {startDate && endDate ? (
                <>Do dia <strong className="text-emerald-600 dark:text-emerald-400">{formatDateBR(startDate)}</strong> ao dia <strong className="text-emerald-600 dark:text-emerald-400">{formatDateBR(endDate)}</strong></>
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
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
              placeholder="Buscar colaborador ou matrícula..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={filterExcessOnly}
                onChange={(e) => setFilterExcessOnly(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Apenas com excedente</span>
            </label>
          </div>
        </div>
      </div>

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Intervalos Registrados no Período</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{filtered.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Apontamentos com horário de saída e retorno</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Ocorrências de Excesso</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {filtered.filter((l) => l.excessMinutes > 0).length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Almoços que ultrapassaram o tempo permitido</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tempo Total Excedido</span>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {formatMinutesToHHMM(filtered.reduce((acc, l) => acc + l.excessMinutes, 0))}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Minutos excedentes acumulados no período</p>
        </div>
      </div>

      {/* Tabela de Intervalos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Saída</th>
                <th className="p-3">Retorno</th>
                <th className="p-3 text-right">Duração Real</th>
                <th className="p-3 text-center">Permitido</th>
                <th className="p-3 text-right">Excedente</th>
                <th className="p-3">Justificativa</th>
                {canEdit && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Nenhum intervalo registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDateBR(l.date)}
                    </td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{l.registrationNumber}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-200">{l.employeeName}</td>
                    <td className="p-3">{l.exitTime}</td>
                    <td className="p-3">{l.returnTime}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatMinutesToHHMM(l.intervalMinutes)} ({l.intervalMinutes} min)
                    </td>
                    <td className="p-3 text-center font-sans text-slate-500">
                      {l.allowedMinutes} min
                    </td>
                    <td className="p-3 text-right font-bold">
                      {l.excessMinutes > 0 ? (
                        <span className="text-rose-600">
                          +{formatMinutesToHHMM(l.excessMinutes)} ({l.excessMinutes} min)
                        </span>
                      ) : (
                        <span className="text-emerald-600">00:00</span>
                      )}
                    </td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate" title={l.justification}>
                      {l.justification || '-'}
                    </td>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                            title="Editar Apontamento de Almoço"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(l.id, l.employeeName)}
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

      {/* Modal Novo Lançamento de Intervalo */}
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
              Registrar Intervalo de Almoço
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Saída (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={formData.exitTime}
                    onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Retorno (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={formData.returnTime}
                    onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Permitido (min):</label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    required
                    value={formData.allowedMinutes}
                    onChange={(e) => setFormData({ ...formData, allowedMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Prévia Automática */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Tempo Total Real:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatMinutesToHHMM(preview.intervalMinutes)} ({preview.intervalMinutes} min)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Excesso Detectado:</span>
                  <span className={`font-mono font-bold ${preview.excessMinutes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {preview.excessMinutes > 0 ? `+${formatMinutesToHHMM(preview.excessMinutes)} (${preview.excessMinutes} min)` : 'Nenhum (00:00)'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.generatesOccurrence}
                    onChange={(e) => setFormData({ ...formData, generatesOccurrence: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Lançar excesso automaticamente como Débito no Banco de Horas
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Motivo:</label>
                <textarea
                  rows={2}
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Ex: Fila no refeitório, atendimento de emergência pessoal..."
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
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  Salvar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Apontamento de Intervalo */}
      {editingInterval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setEditingInterval(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-600" /> Editar Intervalo de Almoço
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Colaborador: {editingInterval.employeeName} ({editingInterval.registrationNumber})
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Saída (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={editFormData.exitTime}
                    onChange={(e) => setEditFormData({ ...editFormData, exitTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Retorno (HH:MM):</label>
                  <input
                    type="time"
                    required
                    value={editFormData.returnTime}
                    onChange={(e) => setEditFormData({ ...editFormData, returnTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Permitido (min):</label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    required
                    value={editFormData.allowedMinutes}
                    onChange={(e) => setEditFormData({ ...editFormData, allowedMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Prévia Automática Recalculada */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Tempo Total Recalculado:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatMinutesToHHMM(editPreview.intervalMinutes)} ({editPreview.intervalMinutes} min)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Excesso Recalculado:</span>
                  <span className={`font-mono font-bold ${editPreview.excessMinutes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {editPreview.excessMinutes > 0 ? `+${formatMinutesToHHMM(editPreview.excessMinutes)} (${editPreview.excessMinutes} min)` : 'Nenhum (00:00)'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.generatesOccurrence}
                    onChange={(e) => setEditFormData({ ...editFormData, generatesOccurrence: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Lançar excesso automaticamente como Débito no Banco de Horas
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Motivo:</label>
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
                  onClick={() => setEditingInterval(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
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
