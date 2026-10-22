/**
 * Gerador de Relatórios Oficiais em PDF
 * Utiliza jsPDF e jspdf-autotable para relatórios formais de IEEI, setores e auditoria.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IEEICalculationResult, Employee } from '../types';
import { formatPercent, formatMinutesToHHMM, formatDateBR } from '../utils/calculations';

export function generateIndividualPDFReport(
  result: IEEICalculationResult,
  employee: Employee,
  issuerName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryDark = [11, 25, 44]; // #0B192C

  // Top header bar
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, 210, 26, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('IEEI GESTÃO - RELATÓRIO INDIVIDUAL DE DESEMPENHO', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Período de Referência: ${result.yearMonth} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} por ${issuerName}`,
    14,
    19
  );

  // Employee Card Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 182, 30, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Colaborador: ${employee.name}`, 18, 40);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Matrícula: ${employee.registrationNumber}`, 18, 46);
  doc.text(`Função: ${employee.role}`, 18, 52);
  doc.text(`Setor: ${employee.sector || employee.team}`, 18, 58);

  doc.text(`Turno: ${employee.shift}`, 105, 46);
  doc.text(`Admissão: ${formatDateBR(employee.admissionDate)}`, 105, 52);
  doc.text(`Situação: ${employee.status.toUpperCase()}`, 105, 58);

  // Score Highlights
  const scoreY = 68;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, scoreY, 88, 22, 2, 2, 'FD');
  doc.roundedRect(108, scoreY, 88, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ÍNDICE IEEI INDIVIDUAL', 18, scoreY + 6);
  doc.text('RESULTADO FINAL (70% IND + 30% COL)', 112, scoreY + 6);

  doc.setFontSize(14);
  const isGoalMet = result.isGoalMet;
  doc.setTextColor(isGoalMet ? 16 : 220, isGoalMet ? 185 : 38, isGoalMet ? 129 : 38);
  doc.text(
    result.status === 'complete' ? formatPercent(result.ieeiScore) : 'CÁLCULO PENDENTE',
    18,
    scoreY + 16
  );

  doc.setTextColor(15, 23, 42);
  doc.text(
    result.finalWeightedScore !== undefined ? formatPercent(result.finalWeightedScore) : 'Não consolidado',
    112,
    scoreY + 16
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Meta de Referência: ${formatPercent(result.targetScore)}`, 55, scoreY + 16);
  if (result.collectiveScore !== undefined) {
    doc.text(`Coletivo Equipe: ${formatPercent(result.collectiveScore)}`, 155, scoreY + 16);
  }

  // Table of 3 Pillars
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Composição dos Fatores do IEEI Individual', 14, 98);

  const tableBody = [
    [
      'Assiduidade / Frequência',
      '100,00%',
      formatPercent(result.attendance),
      result.attendanceMet ? 'Meta Atingida' : 'Abaixo da Meta',
      `${result.presentDays || 0} presenças / ${result.absentDays || 0} faltas / ${result.justifiedDays || 0} justificadas`
    ],
    [
      'Pontualidade Operacional',
      '95,00%',
      formatPercent(result.punctuality),
      result.punctualityMet ? 'Meta Atingida' : 'Abaixo da Meta',
      `${result.delayDays || 0} atrasos (${result.totalDelayMinutes || 0} min acumulados)`
    ],
    [
      'Regularidade no Almoço',
      '98,00%',
      formatPercent(result.lunchCompliance),
      result.lunchComplianceMet ? 'Meta Atingida' : 'Abaixo da Meta',
      `${result.totalLunchExcessMinutes || 0} minutos excedentes registrados`
    ]
  ];

  autoTable(doc, {
    startY: 102,
    head: [['Componente', 'Referência', 'Resultado', 'Situação', 'Detalhamento Operacional']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 25, 44],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { fontStyle: 'bold' }
    }
  });

  // Additional Operational Summary
  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Indicadores Complementares', 14, finalY + 10);

  const hbStr = formatMinutesToHHMM(result.hourBankBalanceMinutes || 0, true);

  const compData = [
    ['Saldo no Banco de Horas Acumulado', `${hbStr} (${result.hourBankBalanceMinutes || 0} minutos totais)`],
    ['Gargalo Identificado no Período', result.bottleneckComponent ? `${result.bottleneckComponent} (Maior desvio)` : 'Nenhum desvio crítico detectado'],
    ['Componentes Pendentes de Lançamento', result.missingComponents.length > 0 ? result.missingComponents.join(', ') : 'Todos os dados computados']
  ];

  autoTable(doc, {
    startY: finalY + 14,
    body: compData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 }
    }
  });

  // Footer & Signature lines
  const sigY = 250;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, sigY, 90, sigY);
  doc.line(120, sigY, 190, sigY);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura do Colaborador', 35, sigY + 5);
  doc.text('Assinatura do Gestor / Supervisor', 133, sigY + 5);

  doc.text('Sistema IEEI Gestão - Documento oficial para acompanhamento de desempenho.', 14, 285);

  doc.save(`IEEI_Individual_${employee.registrationNumber}_${result.yearMonth}.pdf`);
}

export function generateConsolidatedPDFReport(
  yearMonth: string,
  results: IEEICalculationResult[],
  issuerName: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Top header bar
  doc.setFillColor(11, 25, 44);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('IEEI GESTÃO - RELATÓRIO CONSOLIDADO DE DESEMPENHO', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Mês de Apuração: ${yearMonth} | Total de Colaboradores: ${results.length} | Emitido por: ${issuerName} em ${new Date().toLocaleDateString('pt-BR')}`,
    14,
    18
  );

  const tableData = results.map((r, idx) => [
    `#${idx + 1}`,
    r.registrationNumber,
    r.employeeName,
    r.sector || r.team,
    formatPercent(r.attendance),
    formatPercent(r.punctuality),
    formatPercent(r.lunchCompliance),
    `${r.totalDelayMinutes || 0} min`,
    formatMinutesToHHMM(r.hourBankBalanceMinutes || 0, true),
    r.status === 'complete' ? formatPercent(r.ieeiScore) : 'Pendente',
    r.finalWeightedScore !== undefined ? formatPercent(r.finalWeightedScore) : '-',
    r.isGoalMet ? 'Atingida' : 'Abaixo da Meta'
  ]);

  autoTable(doc, {
    startY: 30,
    head: [
      [
        'Pos.',
        'Matrícula',
        'Colaborador',
        'Setor',
        'Frequência',
        'Pontualidade',
        'Reg. Almoço',
        'Atrasos',
        'Banco de Horas',
        'IEEI Individual',
        'Res. Final (70/30)',
        'Situação'
      ]
    ],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 25, 44],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    }
  });

  doc.save(`IEEI_Consolidado_${yearMonth}.pdf`);
}
