import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  Calendar as CalendarIcon,
  Table as TableIcon,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  ClockAlert,
  LogOut,
  FileCheck,
  CheckCircle,
  Percent
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { AttendanceCode } from '../../types';
import { calculateAssiduity, formatPercent } from '../../utils/calculations';
import { exportToExcel } from '../../services/excelService';

interface AttendanceViewProps {
  selectedYearMonth: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar'>('matrix');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);
  const currentUser = dataStorage.getCurrentUser();
  const canEdit = !isMonthClosed && currentUser.role !== 'operator';

  // Determinar quantidade de dias no mês
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const sectors = useMemo(() => Array.from(new Set(employees.map((e) => e.sector))).filter(Boolean), [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (searchTerm) {
        const clean = searchTerm.toLowerCase();
        const matchName = e.name.toLowerCase().includes(clean);
        const matchReg = e.registrationNumber.toLowerCase().includes(clean);
        if (!matchName && !matchReg) return false;
      }
      if (filterSector !== 'all' && e.sector !== filterSector) return false;
      return true;
    });
  }, [employees, searchTerm, filterSector]);

  // Totais Gerais do Período para os Cards de Destaque Superior
  const overallStats = useMemo(() => {
    let totalP = 0;
    let totalF = 0;
    let totalA = 0;
    let totalS = 0;
    let totalJ = 0;
    let sumFrequency = 0;
    let countFrequency = 0;

    filteredEmployees.forEach((emp) => {
      const att = dataStorage.getAttendance(emp.id, selectedYearMonth);
      const s = calculateAssiduity(att?.dailyCodes);
      totalP += s.present;
      totalF += s.absent;
      totalA += s.delayed;
      totalS += s.earlyExit;
      totalJ += s.justified;
      if (s.frequencyPercent !== null) {
        sumFrequency += s.frequencyPercent;
        countFrequency++;
      }
    });

    const avgFreq = countFrequency > 0 ? sumFrequency / countFrequency : null;

    return {
      present: totalP,
      absent: totalF,
      delayed: totalA,
      earlyExit: totalS,
      justified: totalJ,
      avgFrequency: avgFreq
    };
  }, [filteredEmployees, selectedYearMonth]);

  // Se for visualização em calendário, seleciona o primeiro se nenhum selecionado
  const activeCalendarEmp = useMemo(() => {
    if (selectedEmployeeId) {
      return employees.find((e) => e.id === selectedEmployeeId) || filteredEmployees[0];
    }
    return filteredEmployees[0];
  }, [selectedEmployeeId, employees, filteredEmployees]);

  const handleCodeChange = (empId: string, day: number, code: AttendanceCode) => {
    if (!canEdit) return;
    try {
      dataStorage.setAttendanceCode(empId, selectedYearMonth, day, code);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkFillPresent = (empId: string) => {
    if (!canEdit) return;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Dias úteis
        dataStorage.setAttendanceCode(empId, selectedYearMonth, day, 'P');
      }
    }
  };

  const getCodeColorClass = (code: AttendanceCode) => {
    switch (code) {
      case 'P':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold';
      case 'F':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold';
      case 'A':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold';
      case 'S':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold';
      case 'J':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 font-bold';
      default:
        return 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 hover:bg-slate-100';
    }
  };

  const handleExportExcel = () => {
    const data = filteredEmployees.map((emp) => {
      const att = dataStorage.getAttendance(emp.id, selectedYearMonth);
      const stats = calculateAssiduity(att?.dailyCodes);
      const row: any = {
        'Matrícula': emp.registrationNumber,
        'Colaborador': emp.name,
        'Setor': emp.sector,
        'Frequência %': formatPercent(stats.frequencyPercent),
        'Presentes (P)': stats.present,
        'Faltas (F)': stats.absent,
        'Atrasos (A)': stats.delayed,
        'Saídas Antecipadas (S)': stats.earlyExit,
        'Justificadas (J)': stats.justified
      };
      daysArray.forEach((d) => {
        row[`Dia ${d}`] = att?.dailyCodes?.[d] || '';
      });
      return row;
    });
    exportToExcel(data, `IEEI_Assiduidade_${selectedYearMonth}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" /> Folha de Presença &amp; Assiduidade
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento diário com cálculo automático de frequência e resumo consolidado em destaque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Visão Matriz / Calendário */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Matriz Mensal
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendário Individual
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Planilha
          </button>
        </div>
      </div>

      {/* PAINEL DE CARDS DESTACADOS COM OS TOTAIS DE FREQ.%, P, F, A, S, J */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Freq. Média */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xs border border-indigo-800/60">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-1">
            <span className="font-bold">Freq. Média</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatPercent(overallStats.avgFrequency)}
          </div>
          <div className="text-[10px] text-indigo-200 mt-1">Geral do Período</div>
        </div>

        {/* Presentes (P) */}
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 mb-1">
            <span className="font-bold">Presentes (P)</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
            {overallStats.present}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Dias trabalhados</div>
        </div>

        {/* Faltas (F) */}
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 mb-1">
            <span className="font-bold">Faltas (F)</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300">
            {overallStats.absent}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">Não justificadas</div>
        </div>

        {/* Atrasos (A) */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 mb-1">
            <span className="font-bold">Atrasos (A)</span>
            <ClockAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
            {overallStats.delayed}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Ocorrências</div>
        </div>

        {/* Saídas Antecipadas (S) */}
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 mb-1">
            <span className="font-bold">Saídas (S)</span>
            <LogOut className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
            {overallStats.earlyExit}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Antes do término</div>
        </div>

        {/* Justificadas (J) */}
        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 mb-1">
            <span className="font-bold">Justificadas (J)</span>
            <FileCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
            {overallStats.justified}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">Com atestado/abono</div>
        </div>
      </div>

      {/* Filtros e Legenda */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome ou matrícula..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Setores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 justify-end flex-wrap">
          <span className="font-semibold text-slate-500 mr-1">Códigos:</span>
          <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">P: Presente</span>
          <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">F: Falta</span>
          <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">A: Atraso</span>
          <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">S: Saída</span>
          <span className="px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">J: Justificada</span>
        </div>
      </div>

      {/* VISÃO 1: MATRIZ COMPLETA MENSAL COM BLOCO DE RESUMO DESTACADO */}
      {viewMode === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Linha 1 de Cabeçalho: Agrupamento Visual */}
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700">
                    IDENTIFICAÇÃO
                  </th>
                  <th
                    colSpan={6}
                    className="p-2 text-center bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-r-2 border-indigo-300 dark:border-indigo-700 font-extrabold uppercase tracking-wider text-[11px]"
                  >
                    Resumo do Período (Freq.% e Ocorrências)
                  </th>
                  <th
                    colSpan={daysInMonth}
                    className="p-2 text-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]"
                  >
                    Dias do Mês ({selectedYearMonth})
                  </th>
                </tr>

                {/* Linha 2 de Cabeçalho: Colunas Detalhadas */}
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="p-2.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 min-w-[200px] border-r border-slate-300 dark:border-slate-700">
                    Colaborador / Setor
                  </th>

                  {/* COLUNA 1: FREQ. % DESTACADA */}
                  <th className="p-2 text-center bg-indigo-50 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300 min-w-[100px] border-r border-indigo-200 dark:border-indigo-800">
                    FREQ. %
                  </th>

                  {/* COLUNA 2: P (PRESENÇAS) */}
                  <th
                    className="p-2 text-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold min-w-[48px] border-r border-emerald-200 dark:border-emerald-800/60"
                    title="Total de Presenças (P)"
                  >
                    P
                  </th>

                  {/* COLUNA 3: F (FALTAS) */}
                  <th
                    className="p-2 text-center bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-bold min-w-[48px] border-r border-rose-200 dark:border-rose-800/60"
                    title="Total de Faltas Não Justificadas (F)"
                  >
                    F
                  </th>

                  {/* COLUNA 4: A (ATRASOS) */}
                  <th
                    className="p-2 text-center bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-bold min-w-[48px] border-r border-amber-200 dark:border-amber-800/60"
                    title="Total de Atrasos Registrados (A)"
                  >
                    A
                  </th>

                  {/* COLUNA 5: S (SAÍDAS ANTECIPADAS) */}
                  <th
                    className="p-2 text-center bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-bold min-w-[48px] border-r border-blue-200 dark:border-blue-800/60"
                    title="Saídas Antecipadas (S)"
                  >
                    S
                  </th>

                  {/* COLUNA 6: J (JUSTIFICADAS) */}
                  <th
                    className="p-2 text-center bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 font-bold min-w-[48px] border-r-2 border-indigo-400 dark:border-indigo-600 shadow-sm"
                    title="Faltas Justificadas com Atestado/Abono (J)"
                  >
                    J
                  </th>

                  {/* Dias 1 ao fim do mês */}
                  {daysArray.map((d) => {
                    const dayOfWeek = new Date(year, month - 1, d).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    return (
                      <th
                        key={d}
                        className={`p-1 text-center font-mono text-[10px] min-w-[28px] border-l border-slate-200 dark:border-slate-800 ${
                          isWeekend ? 'bg-slate-100/80 dark:bg-slate-950/40 text-slate-400' : ''
                        }`}
                      >
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {filteredEmployees.map((emp) => {
                  const att = dataStorage.getAttendance(emp.id, selectedYearMonth);
                  const stats = calculateAssiduity(att?.dailyCodes);
                  const freq = stats.frequencyPercent;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition">
                      {/* Identificação do Colaborador (Sticky) */}
                      <td className="p-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 shadow-xs">
                        <div className="font-sans font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[190px]">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {emp.registrationNumber}
                          </span>
                          <span className="font-sans text-slate-400 truncate max-w-[80px]">{emp.sector}</span>
                          {canEdit && (
                            <button
                              onClick={() => handleBulkFillPresent(emp.id)}
                              className="text-emerald-600 hover:underline font-sans text-[9px] flex items-center gap-0.5 ml-1"
                              title="Preencher todos os dias úteis como Presente (P)"
                            >
                              <Sparkles className="w-2.5 h-2.5" /> Úteis
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 1. FREQUÊNCIA % COM BADGE COLORIDO DE ALTO CONTRASTE */}
                      <td className="p-2 text-center bg-indigo-50/50 dark:bg-indigo-950/20 border-r border-indigo-200 dark:border-indigo-800">
                        {freq === null ? (
                          <span className="text-[10px] text-slate-400 font-sans font-medium">Sem dados</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-xs font-mono shadow-xs border ${
                                freq >= 0.95
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : freq >= 0.85
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/90 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/90 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              }`}
                            >
                              {formatPercent(freq)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 2. P (PRESENÇAS) COM CHIP ESMERALDA */}
                      <td className="p-1.5 text-center bg-emerald-50/30 dark:bg-emerald-950/10 border-r border-emerald-200 dark:border-emerald-800/60">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          {stats.present}
                        </span>
                      </td>

                      {/* 3. F (FALTAS) COM DESTAQUE EM VERMELHO SE > 0 */}
                      <td className="p-1.5 text-center bg-rose-50/30 dark:bg-rose-950/10 border-r border-rose-200 dark:border-rose-800/60">
                        {stats.absent > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs text-rose-700 dark:text-rose-200 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 shadow-xs">
                            {stats.absent}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* 4. A (ATRASOS) COM DESTAQUE EM ÂMBAR SE > 0 */}
                      <td className="p-1.5 text-center bg-amber-50/30 dark:bg-amber-950/10 border-r border-amber-200 dark:border-amber-800/60">
                        {stats.delayed > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 shadow-xs">
                            {stats.delayed}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* 5. S (SAÍDAS ANTECIPADAS) */}
                      <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 border-r border-blue-200 dark:border-blue-800/60">
                        {stats.earlyExit > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 shadow-xs">
                            {stats.earlyExit}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* 6. J (JUSTIFICADAS) COM BORDA SEPARADORA FORTE */}
                      <td className="p-1.5 text-center bg-purple-50/30 dark:bg-purple-950/10 border-r-2 border-indigo-400 dark:border-indigo-600 shadow-sm">
                        {stats.justified > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-700 shadow-xs">
                            {stats.justified}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* Células dos dias 1..31 com seletor interativo */}
                      {daysArray.map((day) => {
                        const code = att?.dailyCodes?.[day] || '';
                        const dayOfWeek = new Date(year, month - 1, day).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        return (
                          <td
                            key={day}
                            className={`p-0.5 text-center border-l border-slate-200 dark:border-slate-800 ${
                              isWeekend ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''
                            }`}
                          >
                            <select
                              value={code}
                              disabled={!canEdit}
                              onChange={(e) => handleCodeChange(emp.id, day, e.target.value as AttendanceCode)}
                              className={`w-6 h-6 text-center text-[10px] rounded focus:outline-hidden transition cursor-pointer appearance-none ${getCodeColorClass(
                                code
                              )}`}
                            >
                              <option value="">-</option>
                              <option value="P">P</option>
                              <option value="F">F</option>
                              <option value="A">A</option>
                              <option value="S">S</option>
                              <option value="J">J</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO 2: CALENDÁRIO INDIVIDUAL MENSAL */}
      {viewMode === 'calendar' && activeCalendarEmp && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Visualizando Colaborador:
              </label>
              <select
                value={activeCalendarEmp.id}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="text-sm font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.registrationNumber} - {e.name} ({e.sector})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const att = dataStorage.getAttendance(activeCalendarEmp.id, selectedYearMonth);
              const stats = calculateAssiduity(att?.dailyCodes);
              return (
                <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-bold border border-indigo-200">
                    Frequência: {formatPercent(stats.frequencyPercent)}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    {stats.present} P
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                    {stats.absent} F
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                    {stats.delayed} A
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                    {stats.earlyExit} S
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                    {stats.justified} J
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Grid do Calendário Mensal */}
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName) => (
              <div key={dayName} className="p-2 text-center text-xs font-bold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                {dayName}
              </div>
            ))}

            {/* Espaços vazios até o primeiro dia da semana */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-20 bg-slate-50/30 dark:bg-slate-900/20 rounded-lg" />
            ))}

            {/* Dias do mês */}
            {daysArray.map((day) => {
              const att = dataStorage.getAttendance(activeCalendarEmp.id, selectedYearMonth);
              const code = att?.dailyCodes?.[day] || '';

              return (
                <div
                  key={day}
                  className={`min-h-20 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition ${
                    code ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{day}</span>

                  <select
                    value={code}
                    disabled={!canEdit}
                    onChange={(e) => handleCodeChange(activeCalendarEmp.id, day, e.target.value as AttendanceCode)}
                    className={`w-full py-1 text-center font-bold text-xs rounded-md border focus:outline-hidden cursor-pointer ${getCodeColorClass(
                      code
                    )}`}
                  >
                    <option value="">Sem registro</option>
                    <option value="P">P - Presente</option>
                    <option value="F">F - Falta</option>
                    <option value="A">A - Atraso</option>
                    <option value="S">S - Saída Antecipada</option>
                    <option value="J">J - Falta Justificada</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
