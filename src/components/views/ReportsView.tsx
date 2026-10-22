import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Printer,
  CalendarCheck,
  Hourglass
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { generateIndividualPDFReport, generateConsolidatedPDFReport } from '../../services/pdfService';
import { exportToExcel } from '../../services/excelService';
import { formatPercent, formatMinutesToHHMM, formatDateBR } from '../../utils/calculations';

interface ReportsViewProps {
  selectedYearMonth: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ selectedYearMonth }) => {
  const [selectedReportType, setSelectedReportType] = useState('individual');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const employees = dataStorage.getEmployees().filter((e) => e.status === 'active');
  const currentUser = dataStorage.getCurrentUser();

  const handleGenerateReport = () => {
    switch (selectedReportType) {
      case 'individual': {
        const empId = selectedEmployeeId || employees[0]?.id;
        const emp = dataStorage.getEmployeeById(empId);
        if (!emp) return alert('Selecione um colaborador.');
        const result = dataStorage.calculateEmployeeIEEI(emp.id, selectedYearMonth);
        generateIndividualPDFReport(result, emp, currentUser.name);
        break;
      }
      case 'consolidated_pdf': {
        const results = employees.map((e) => dataStorage.calculateEmployeeIEEI(e.id, selectedYearMonth));
        generateConsolidatedPDFReport(selectedYearMonth, results, currentUser.name);
        break;
      }
      case 'consolidated_excel': {
        const results = employees.map((e, idx) => {
          const r = dataStorage.calculateEmployeeIEEI(e.id, selectedYearMonth);
          return {
            'Ranking': `#${idx + 1}`,
            'Matrícula': r.registrationNumber,
            'Colaborador': r.employeeName,
            'Setor': r.sector || r.team,
            'Assiduidade / Frequência': formatPercent(r.attendance),
            'Pontualidade': formatPercent(r.punctuality),
            'Regularidade Almoço': formatPercent(r.lunchCompliance),
            'Atrasos (minutos)': r.totalDelayMinutes || 0,
            'Excesso Almoço (minutos)': r.totalLunchExcessMinutes || 0,
            'Banco de Horas': formatMinutesToHHMM(r.hourBankBalanceMinutes || 0, true),
            'IEEI Individual': r.status === 'complete' ? formatPercent(r.ieeiScore) : 'Pendente',
            'Meta 93,10%': r.isGoalMet ? 'Atingida' : 'Abaixo da Meta',
            'Resultado Final Ponderado (70/30)': r.finalWeightedScore !== undefined ? formatPercent(r.finalWeightedScore) : '-'
          };
        });
        exportToExcel(results, `IEEI_Consolidado_${selectedYearMonth}`);
        break;
      }
      case 'attendance_excel': {
        const results = employees.map((e) => {
          const att = dataStorage.getAttendance(e.id, selectedYearMonth);
          const r = dataStorage.calculateEmployeeIEEI(e.id, selectedYearMonth);
          return {
            'Matrícula': e.registrationNumber,
            'Colaborador': e.name,
            'Setor': e.sector || e.team,
            'Dias Presentes': r.presentDays || 0,
            'Faltas': r.absentDays || 0,
            'Atrasos': r.delayDays || 0,
            'Saídas Antecipadas': r.earlyExitDays || 0,
            'Faltas Justificadas': r.justifiedDays || 0,
            'Frequência (%)': formatPercent(r.attendance)
          };
        });
        exportToExcel(results, `IEEI_Assiduidade_${selectedYearMonth}`);
        break;
      }
      case 'hour_bank': {
        const hbs = dataStorage
          .getHourBankTransactions()
          .filter((t) => t.date.startsWith(selectedYearMonth))
          .map((t) => ({
            'Data': formatDateBR(t.date),
            'Matrícula': t.registrationNumber,
            'Colaborador': t.employeeName,
            'Tipo': t.type,
            'Minutos': t.minutes,
            'Tempo (HH:MM)': formatMinutesToHHMM(t.minutes, true),
            'Justificativa': t.justification,
            'Situação': t.status
          }));
        exportToExcel(hbs, `IEEI_Banco_Horas_${selectedYearMonth}`);
        break;
      }
    }
  };

  const reportOptions = [
    {
      id: 'individual',
      title: 'Relatório Individual Completo do Colaborador (PDF)',
      desc: 'Dossiê executivo contendo o IEEI do mês, decomposição dos 3 fatores (Assiduidade, Pontualidade, Almoço), saldo do banco de horas e linhas para assinatura.',
      format: 'PDF Oficial',
      icon: FileText
    },
    {
      id: 'consolidated_pdf',
      title: 'Relatório Consolidado Mensal IEEI (PDF)',
      desc: 'Visão executiva em modo paisagem com ranking geral, pontuações individuais e resumo de conformidade da organização.',
      format: 'PDF Executivo',
      icon: FileText
    },
    {
      id: 'consolidated_excel',
      title: 'Planilha Consolidada IEEI & Resultado Coletivo (Excel)',
      desc: 'Exportação tabular de todos os colaboradores, metas, IEEI e resultado ponderado 70/30 para análise externa e auditoria.',
      format: 'XLSX Planilha',
      icon: FileSpreadsheet
    },
    {
      id: 'attendance_excel',
      title: 'Espelho Consolidado de Frequência & Assiduidade (Excel)',
      desc: 'Consolidação de presenças, faltas integrais, saídas antecipadas, atrasos e justificativas de cada colaborador.',
      format: 'XLSX Planilha',
      icon: CalendarCheck
    },
    {
      id: 'hour_bank',
      title: 'Extrato Geral de Banco de Horas (Excel)',
      desc: 'Livro de movimentações de horas extras, compensações, ocorrências e saldos acumulados de todos os colaboradores.',
      format: 'XLSX Planilha',
      icon: Hourglass
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> Central de Relatórios &amp; Exportações
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Geração de relatórios oficiais em formato PDF com layout corporativo para impressão e planilhas Excel (.xlsx) completas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seletor do Tipo de Relatório */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Selecione o Modelo de Relatório</h3>

          <div className="space-y-3">
            {reportOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedReportType === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedReportType(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-600'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{opt.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {opt.format}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel de Parâmetros e Ação de Download */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Parâmetros de Emissão</h3>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Período de Referência:
              </label>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600">
                {selectedYearMonth}
              </div>
            </div>

            {selectedReportType === 'individual' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Colaborador:
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.registrationNumber} - {e.name} ({e.sector || e.team})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emitido Por:
              </label>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]">
                {currentUser.name} ({currentUser.role})
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerateReport}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <Download className="w-4 h-4" />
                Gerar &amp; Baixar Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
