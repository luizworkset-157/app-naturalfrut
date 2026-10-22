import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Sliders,
  Users2,
  Award,
  ArrowRight,
  ShieldAlert,
  Percent,
  Clock,
  CalendarCheck,
  Utensils,
  Hourglass
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { IEEICalculationResult } from '../../types';
import {
  formatPercent,
  formatMinutesToHHMM,
  calculateIEEI,
  calculateFinalResult
} from '../../utils/calculations';
import { generateIndividualPDFReport, generateConsolidatedPDFReport } from '../../services/pdfService';
import { exportToExcel } from '../../services/excelService';

interface IEEIViewProps {
  selectedYearMonth: string;
}

export const IEEIView: React.FC<IEEIViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterGoalStatus, setFilterGoalStatus] = useState<'all' | 'met' | 'unmet' | 'pending'>('all');
  const [selectedResult, setSelectedResult] = useState<IEEICalculationResult | null>(null);

  // Simulador What-If State (3 Fatores)
  const [simAtt, setSimAtt] = useState<number>(100);
  const [simPunct, setSimPunct] = useState<number>(95);
  const [simLunch, setSimLunch] = useState<number>(98);
  const [showSimulator, setShowSimulator] = useState(false);

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const config = dataStorage.getConfig();
  const currentUser = dataStorage.getCurrentUser();

  const sectors = useMemo(() => Array.from(new Set(employees.map((e) => e.sector || e.team))).filter(Boolean), [employees]);

  // Cálculos completos do IEEI de todos os colaboradores ativos
  const allResults: IEEICalculationResult[] = useMemo(() => {
    return employees.map((emp) => dataStorage.calculateEmployeeIEEI(emp.id, selectedYearMonth));
  }, [employees, selectedYearMonth, config]);

  const filteredResults = useMemo(() => {
    return allResults.filter((r) => {
      if (searchTerm) {
        const clean = searchTerm.toLowerCase();
        const matchName = r.employeeName.toLowerCase().includes(clean);
        const matchReg = r.registrationNumber.toLowerCase().includes(clean);
        if (!matchName && !matchReg) return false;
      }
      if (filterSector !== 'all' && (r.sector || r.team) !== filterSector) return false;
      if (filterGoalStatus === 'met' && !r.isGoalMet) return false;
      if (filterGoalStatus === 'unmet' && (r.isGoalMet || r.status === 'pending')) return false;
      if (filterGoalStatus === 'pending' && r.status !== 'pending') return false;
      return true;
    });
  }, [allResults, searchTerm, filterSector, filterGoalStatus]);

  // Colaborador ativo para detalhamento
  const currentSelected = useMemo(() => {
    if (selectedResult) {
      return allResults.find((r) => r.employeeId === selectedResult.employeeId) || allResults[0];
    }
    return allResults[0] || null;
  }, [selectedResult, allResults]);

  // Abrir simulador com os dados do colaborador selecionado
  const handleOpenSimulator = (res: IEEICalculationResult) => {
    setSimAtt(res.attendance !== null ? Math.round(res.attendance * 100) : 100);
    setSimPunct(res.punctuality !== null ? Math.round(res.punctuality * 100) : 95);
    setSimLunch(res.lunchCompliance !== null ? Math.round(res.lunchCompliance * 100) : 98);
    setShowSimulator(true);
  };

  // Cálculo do simulador
  const simulatedCalc = useMemo(() => {
    return calculateIEEI(
      simAtt / 100,
      simPunct / 100,
      simLunch / 100,
      config
    );
  }, [simAtt, simPunct, simLunch, config]);

  const simulatedFinalResult = useMemo(() => {
    return calculateFinalResult(
      simulatedCalc.ieeiScore,
      0.95, // referência coletiva padrão
      config.individualWeight,
      config.collectiveWeight
    );
  }, [simulatedCalc, config]);

  const handleExportConsolidatedPDF = () => {
    generateConsolidatedPDFReport(selectedYearMonth, filteredResults, currentUser.name);
  };

  const handleExportConsolidatedExcel = () => {
    const exportData = filteredResults.map((r, idx) => ({
      'Ranking': `#${idx + 1}`,
      'Matrícula': r.registrationNumber,
      'Colaborador': r.employeeName,
      'Setor': r.sector || r.team,
      'Frequência': formatPercent(r.attendance),
      'Pontualidade': formatPercent(r.punctuality),
      'Regularidade Almoço': formatPercent(r.lunchCompliance),
      'Atrasos (minutos)': r.totalDelayMinutes || 0,
      'Excesso Almoço (minutos)': r.totalLunchExcessMinutes || 0,
      'Banco de Horas': formatMinutesToHHMM(r.hourBankBalanceMinutes || 0, true),
      'IEEI Individual': r.status === 'complete' ? formatPercent(r.ieeiScore) : 'Pendente',
      'Meta Combinada 93,10%': r.isGoalMet ? 'Atingida' : 'Abaixo da Meta',
      'Índice Coletivo': r.collectiveScore !== undefined ? formatPercent(r.collectiveScore) : '-',
      'Resultado Final Ponderado (70/30)': r.finalWeightedScore !== undefined ? formatPercent(r.finalWeightedScore) : '-'
    }));

    exportToExcel(exportData, `IEEI_Consolidado_${selectedYearMonth}`);
  };

  const handleExportSinglePDF = (res: IEEICalculationResult) => {
    const emp = dataStorage.getEmployeeById(res.employeeId);
    if (emp) {
      generateIndividualPDFReport(res, emp, currentUser.name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Índice IEEI &ndash; Gestão de Eficiência e Eficácia Individual
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fórmula operacional: <strong className="font-semibold text-slate-700 dark:text-slate-300">Frequência &times; Pontualidade &times; Regularidade no Almoço</strong>. Meta de referência: <strong className="text-emerald-600 font-bold">{formatPercent(config.combinedTarget)}</strong>.
          </p>
        </div>

        {/* Botões de Ação Executiva */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showSimulator ? 'Ocultar Simulador' : 'Simulador What-If'}
          </button>

          <button
            onClick={handleExportConsolidatedPDF}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition"
            title="Download PDF Geral"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            PDF Mensal
          </button>

          <button
            onClick={handleExportConsolidatedExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-xs"
            title="Exportar XLSX"
          >
            <Award className="w-3.5 h-3.5" />
            Exportar XLSX
          </button>
        </div>
      </div>

      {/* Simulador What-If Interativo */}
      {showSimulator && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-xl border border-indigo-900/60 transition-all">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-200">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Simulador Operacional de Cenários What-If
              </h3>
              <p className="text-xs text-indigo-300/80">
                Ajuste os 3 fatores operacionais para projetar o impacto direto no IEEI e no resultado final ponderado.
              </p>
            </div>
            <button
              onClick={() => setShowSimulator(false)}
              className="text-xs text-indigo-300 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Slider 1: Frequência */}
            <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" /> Frequência / Presença:
                </span>
                <span className="font-bold text-emerald-400 font-mono">{simAtt}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={simAtt}
                onChange={(e) => setSimAtt(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Meta: {formatPercent(config.attendanceTarget)}</span>
            </div>

            {/* Slider 2: Pontualidade */}
            <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Pontualidade (Sem Atrasos):
                </span>
                <span className="font-bold text-emerald-400 font-mono">{simPunct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={simPunct}
                onChange={(e) => setSimPunct(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Meta: {formatPercent(config.punctualityTarget)}</span>
            </div>

            {/* Slider 3: Conformidade de Almoço */}
            <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-teal-400" /> Regularidade de Almoço:
                </span>
                <span className="font-bold text-emerald-400 font-mono">{simLunch}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={simLunch}
                onChange={(e) => setSimLunch(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Meta: {formatPercent(config.lunchComplianceTarget)}</span>
            </div>
          </div>

          {/* Resultado Projetado da Simulação */}
          <div className="mt-4 pt-4 border-t border-indigo-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[11px] text-indigo-300 block">IEEI Individual Projetado:</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {formatPercent(simulatedCalc.ieeiScore)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-indigo-300 block">Status vs Meta ({formatPercent(config.combinedTarget)}):</span>
                {simulatedCalc.isGoalMet ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Meta Atingida
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" /> Abaixo da Meta
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-indigo-300 block">Resultado Final (70% Ind + 30% Col):</span>
                <span className="text-lg font-bold font-mono text-slate-200">
                  {formatPercent(simulatedFinalResult)}
                </span>
              </div>
            </div>

            {simulatedCalc.bottleneckComponent && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Gargalo Projetado: <strong>{simulatedCalc.bottleneckComponent}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Painel do Colaborador em Foco */}
      {currentSelected && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Matrícula: {currentSelected.registrationNumber}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentSelected.employeeName}
                </h2>
                <span className="text-xs text-slate-500">({currentSelected.sector || currentSelected.team})</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Diagnóstico de desempenho de {selectedYearMonth} &bull; Cálculo transparente e auditável.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Índice IEEI</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {formatPercent(currentSelected.ieeiScore)}
                </span>
              </div>

              <button
                onClick={() => handleExportSinglePDF(currentSelected)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF do Colaborador
              </button>

              <button
                onClick={() => handleOpenSimulator(currentSelected)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Carregar no simulador"
              >
                Simular Ajustes
              </button>
            </div>
          </div>

          {/* Cards dos 3 Fatores Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Fator 1: Assiduidade */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  1. Assiduidade / Presença
                </span>
                {currentSelected.attendanceMet ? (
                  <span className="text-emerald-600 text-[10px] font-bold">Meta Atingida</span>
                ) : (
                  <span className="text-rose-600 text-[10px] font-bold">Abaixo</span>
                )}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatPercent(currentSelected.attendance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>Meta: {formatPercent(config.attendanceTarget)}</div>
                <div>Presenças: {currentSelected.presentDays || 0} dias</div>
                <div>Faltas: {currentSelected.absentDays || 0} | Justificadas: {currentSelected.justifiedDays || 0}</div>
              </div>
            </div>

            {/* Fator 2: Pontualidade */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  2. Pontualidade Operacional
                </span>
                {currentSelected.punctualityMet ? (
                  <span className="text-emerald-600 text-[10px] font-bold">Meta Atingida</span>
                ) : (
                  <span className="text-rose-600 text-[10px] font-bold">Abaixo</span>
                )}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatPercent(currentSelected.punctuality)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>Meta: {formatPercent(config.punctualityTarget)}</div>
                <div>Dias com atraso: {currentSelected.delayDays || 0} ocorrência(s)</div>
                <div>Minutos acumulados: {currentSelected.totalDelayMinutes || 0} min</div>
              </div>
            </div>

            {/* Fator 3: Regularidade de Almoço */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-teal-600" />
                  3. Regularidade no Almoço
                </span>
                {currentSelected.lunchComplianceMet ? (
                  <span className="text-emerald-600 text-[10px] font-bold">Meta Atingida</span>
                ) : (
                  <span className="text-rose-600 text-[10px] font-bold">Abaixo</span>
                )}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatPercent(currentSelected.lunchCompliance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>Meta: {formatPercent(config.lunchComplianceTarget)}</div>
                <div>Tolerância padrão: {config.defaultLunchMinutes} minutos</div>
                <div>Minutos excedentes: {currentSelected.totalLunchExcessMinutes || 0} min</div>
              </div>
            </div>
          </div>

          {/* Rodapé do Diagnóstico (Gargalo e Banco de Horas) */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-4">
              <span className="text-slate-500">
                Saldo no Banco de Horas:{' '}
                <strong
                  className={`font-mono ${(currentSelected.hourBankBalanceMinutes || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {formatMinutesToHHMM(currentSelected.hourBankBalanceMinutes || 0, true)}
                </strong>
              </span>

              {currentSelected.bottleneckComponent && (
                <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Gargalo: {currentSelected.bottleneckComponent}
                </span>
              )}
            </div>

            <div className="text-slate-500">
              Resultado Final (70/30):{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {formatPercent(currentSelected.finalWeightedScore)}
              </strong>{' '}
              (Coletivo Equipe: {formatPercent(currentSelected.collectiveScore)})
            </div>
          </div>
        </div>
      )}

      {/* Tabela do Ranking Geral com Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Barra de Filtros da Tabela */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador ou matrícula..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="all">Todos os Setores</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={filterGoalStatus}
              onChange={(e) => setFilterGoalStatus(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="all">Todos os Status</option>
              <option value="met">Meta Atingida (&ge; {formatPercent(config.combinedTarget)})</option>
              <option value="unmet">Abaixo da Meta</option>
              <option value="pending">Lançamento Pendente</option>
            </select>
          </div>
        </div>

        {/* Listagem Tabular */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Posição</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Assiduidade</th>
                <th className="p-3">Pontualidade</th>
                <th className="p-3">Reg. Almoço</th>
                <th className="p-3">Atrasos (min)</th>
                <th className="p-3">Banco de Horas</th>
                <th className="p-3 text-right">IEEI Individual</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r, idx) => {
                  const isSelected = currentSelected?.employeeId === r.employeeId;
                  return (
                    <tr
                      key={r.employeeId}
                      onClick={() => setSelectedResult(r)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-500 font-sans">#{idx + 1}</td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                        {r.registrationNumber}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900 dark:text-slate-200">
                        {r.employeeName}
                      </td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{r.sector || r.team}</td>
                      <td className="p-3">{formatPercent(r.attendance)}</td>
                      <td className="p-3">{formatPercent(r.punctuality)}</td>
                      <td className="p-3">{formatPercent(r.lunchCompliance)}</td>
                      <td className="p-3">{r.totalDelayMinutes || 0} min</td>
                      <td
                        className={`p-3 font-bold ${
                          (r.hourBankBalanceMinutes || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatMinutesToHHMM(r.hourBankBalanceMinutes || 0, true)}
                      </td>
                      <td className="p-3 text-right font-bold text-xs text-slate-900 dark:text-white">
                        {r.status === 'complete' ? formatPercent(r.ieeiScore) : 'Pendente'}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {r.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Pendente
                          </span>
                        ) : r.isGoalMet ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Atingida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            Abaixo
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSinglePDF(r);
                          }}
                          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
                          title="Gerar PDF"
                        >
                          PDF &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
