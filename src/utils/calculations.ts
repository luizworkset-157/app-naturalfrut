/**
 * Funções puras de cálculo matemático e regras de negócio do IEEI
 * Foco em Frequência, Pontualidade, Controle de Almoço e Banco de Horas.
 * Protegidas contra divisões por zero e valores inválidos.
 */

import { AttendanceCode, IndicatorConfig } from '../types';

export const DEFAULT_CONFIG: IndicatorConfig = {
  id: 'default_config',
  attendanceTarget: 1.00, // 100% de frequência
  punctualityTarget: 0.95, // 95% de pontualidade
  lunchComplianceTarget: 0.98, // 98% de conformidade de intervalo de almoço
  combinedTarget: 0.931, // 1.00 * 0.95 * 0.98 = 93,1%
  individualWeight: 0.70, // 70% individual
  collectiveWeight: 0.30, // 30% coletivo
  defaultLunchMinutes: 60, // 1 hora
  alertDelayThresholdMinutes: 15,
  alertDelayMonthlyRecurrence: 3,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistema'
};

/**
 * Cálculo de Assiduidade e Frequência Digital
 * P: Presente, F: Falta, A: Atraso, S: Saída antecipada, J: Falta Justificada
 * Frequência = Presenças / (P + F + A + S + J)
 * Células sem lançamento não são consideradas automaticamente como falta.
 */
export function calculateAssiduity(dailyCodes: Record<number, AttendanceCode> | undefined) {
  if (!dailyCodes) {
    return {
      present: 0,
      absent: 0,
      delayed: 0,
      earlyExit: 0,
      justified: 0,
      totalEntries: 0,
      frequencyPercent: null
    };
  }

  let present = 0;
  let absent = 0;
  let delayed = 0;
  let earlyExit = 0;
  let justified = 0;

  for (const day in dailyCodes) {
    const code = dailyCodes[day];
    if (code === 'P') present++;
    else if (code === 'F') absent++;
    else if (code === 'A') delayed++;
    else if (code === 'S') earlyExit++;
    else if (code === 'J') justified++;
  }

  const totalEntries = present + absent + delayed + earlyExit + justified;
  const frequencyPercent = totalEntries > 0 ? Number((present / totalEntries).toFixed(5)) : null;

  return {
    present,
    absent,
    delayed,
    earlyExit,
    justified,
    totalEntries,
    frequencyPercent
  };
}

/**
 * Pontualidade: Taxa de dias trabalhados sem ocorrência de atraso
 */
export function calculatePunctuality(workedDays: number, delayCount: number): number | null {
  if (workedDays <= 0) return null;
  const onTimeDays = Math.max(0, workedDays - delayCount);
  return Number((onTimeDays / workedDays).toFixed(5));
}

/**
 * Conformidade de Almoço: Proporção de intervalos cumpridos dentro do tempo permitido
 */
export function calculateLunchCompliance(totalIntervals: number, excessCount: number): number | null {
  if (totalIntervals <= 0) return 1.0; // 100% caso não haja apontamento de excesso
  const compliantIntervals = Math.max(0, totalIntervals - excessCount);
  return Number((compliantIntervals / totalIntervals).toFixed(5));
}

/**
 * Cálculo de Intervalo de Almoço e Excedente
 * Suporta horários no formato "HH:MM" e travessia da meia-noite (ex: 23:45 até 00:45)
 */
export function calculateLunchInterval(
  exitTimeStr: string,
  returnTimeStr: string,
  allowedMinutes: number = 60
): { intervalMinutes: number; excessMinutes: number } {
  if (!exitTimeStr || !returnTimeStr) {
    return { intervalMinutes: 0, excessMinutes: 0 };
  }

  const [exitH, exitM] = exitTimeStr.split(':').map(Number);
  const [returnH, returnM] = returnTimeStr.split(':').map(Number);

  if (isNaN(exitH) || isNaN(exitM) || isNaN(returnH) || isNaN(returnM)) {
    return { intervalMinutes: 0, excessMinutes: 0 };
  }

  let exitTotal = exitH * 60 + exitM;
  let returnTotal = returnH * 60 + returnM;

  // Meia-noite transitória
  if (returnTotal < exitTotal) {
    returnTotal += 24 * 60; // dia seguinte
  }

  const intervalMinutes = returnTotal - exitTotal;
  const excessMinutes = Math.max(0, intervalMinutes - allowedMinutes);

  return { intervalMinutes, excessMinutes };
}

/**
 * Converte minutos inteiros para formato corporativo HH:MM (inclusive negativos)
 */
export function formatMinutesToHHMM(minutes: number, showSign: boolean = false): string {
  if (isNaN(minutes) || minutes === null || minutes === undefined) {
    return "00:00";
  }
  const isNegative = minutes < 0;
  const absMinutes = Math.abs(Math.round(minutes));
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;

  const paddedH = String(h).padStart(2, '0');
  const paddedM = String(m).padStart(2, '0');

  if (isNegative) {
    return `-${paddedH}:${paddedM}`;
  }
  if (showSign && minutes > 0) {
    return `+${paddedH}:${paddedM}`;
  }
  return `${paddedH}:${paddedM}`;
}

/**
 * Formata proporção numérica em porcentagem brasileira
 */
export function formatPercent(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "Não calculado";
  }
  return `${(val * 100).toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Converte data ISO ("YYYY-MM-DD" ou timestamp ISO) para formato brasileiro "DD/MM/AAAA"
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return clean;
}

/**
 * Converte timestamp ISO para formato brasileiro com hora "DD/MM/AAAA HH:MM"
 */
export function formatDateTimeBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).trim();
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    const h = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
  }
  return formatDateBR(dateStr);
}

/**
 * Cálculo do IEEI Individual
 * IEEI = Frequência / Assiduidade × Pontualidade × Conformidade de Almoço
 */
export function calculateIEEI(
  att: number | null,
  punct: number | null,
  lunchComp: number | null,
  config: IndicatorConfig = DEFAULT_CONFIG
) {
  const missing: string[] = [];

  if (att === null || att === undefined) missing.push('Frequência/Assiduidade');
  if (punct === null || punct === undefined) missing.push('Pontualidade');
  if (lunchComp === null || lunchComp === undefined) missing.push('Regularidade de Almoço');

  if (missing.length > 0) {
    return {
      status: 'pending' as const,
      ieeiScore: null,
      targetScore: config.combinedTarget,
      isGoalMet: false,
      missingComponents: missing,
      bottleneckComponent: undefined,
      attendanceMet: att !== null ? att >= config.attendanceTarget : false,
      punctualityMet: punct !== null ? punct >= config.punctualityTarget : false,
      lunchComplianceMet: lunchComp !== null ? lunchComp >= config.lunchComplianceTarget : false
    };
  }

  const a = att as number;
  const p = punct as number;
  const l = lunchComp as number;

  const rawScore = a * p * l;
  const ieeiScore = Number(rawScore.toFixed(5));
  const isGoalMet = ieeiScore >= config.combinedTarget;

  // Analisar gargalo
  const diffs = [
    { name: 'Frequência / Assiduidade', diff: a - config.attendanceTarget },
    { name: 'Pontualidade', diff: p - config.punctualityTarget },
    { name: 'Regularidade de Almoço', diff: l - config.lunchComplianceTarget }
  ];

  diffs.sort((x, y) => x.diff - y.diff);
  const bottleneck = diffs[0].diff < 0 ? diffs[0].name : undefined;

  return {
    status: 'complete' as const,
    ieeiScore,
    targetScore: config.combinedTarget,
    isGoalMet,
    missingComponents: [],
    bottleneckComponent: bottleneck,
    attendanceMet: a >= config.attendanceTarget,
    punctualityMet: p >= config.punctualityTarget,
    lunchComplianceMet: l >= config.lunchComplianceTarget
  };
}

/**
 * Resultado Final com Componente Coletivo
 * Resultado final = (IEEI individual × 0,70) + (Índice coletivo × 0,30)
 */
export function calculateFinalResult(
  ieeiScore: number | null,
  collectiveScore: number | null,
  individualWeight: number = 0.70,
  collectiveWeight: number = 0.30
): number | null {
  if (ieeiScore === null || collectiveScore === null) {
    return null;
  }
  const result = (ieeiScore * individualWeight) + (collectiveScore * collectiveWeight);
  return Number(result.toFixed(5));
}

/**
 * Bateria de Testes Automatizados para validação das regras de negócio
 */
export interface SelfTestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export function runAutomatedSelfTest(): SelfTestResult[] {
  const tests: SelfTestResult[] = [];

  // Teste 1: Meta combinada de referência
  const refAtt = 1.00;
  const refPunct = 0.95;
  const refLunch = 0.98;
  const combined = refAtt * refPunct * refLunch;
  const isCombinedAccurate = Math.abs(combined - 0.931) < 0.0001;
  tests.push({
    name: 'Cálculo de Meta Combinada de Referência (93,10%)',
    passed: isCombinedAccurate,
    expected: '0.93100 (93,10%)',
    actual: combined.toFixed(5)
  });

  // Teste 2: Almoço com travessia de meia-noite (23:45 às 00:50)
  const lunchMid = calculateLunchInterval('23:45', '00:50', 60);
  tests.push({
    name: 'Controle de Almoço com virada de meia-noite (65 min, 5 min excedentes)',
    passed: lunchMid.intervalMinutes === 65 && lunchMid.excessMinutes === 5,
    expected: 'Intervalo: 65m, Excedente: 5m',
    actual: `Intervalo: ${lunchMid.intervalMinutes}m, Excedente: ${lunchMid.excessMinutes}m`
  });

  // Teste 3: Formatação de horas negativas do Banco de Horas
  const formattedNegative = formatMinutesToHHMM(-135);
  tests.push({
    name: 'Formatação de Saldo Negativo de Banco de Horas (-135 min -> -02:15)',
    passed: formattedNegative === '-02:15',
    expected: '-02:15',
    actual: formattedNegative
  });

  // Teste 4: Formatação de horas positivas com sinal
  const formattedPositive = formatMinutesToHHMM(240, true);
  tests.push({
    name: 'Formatação de Saldo Positivo (+240 min -> +04:00)',
    passed: formattedPositive === '+04:00',
    expected: '+04:00',
    actual: formattedPositive
  });

  // Teste 5: Cálculo de Assiduidade
  const assiduity = calculateAssiduity({ 1: 'P', 2: 'P', 3: 'P', 4: 'A', 5: 'F' });
  // 3 presenças em 5 registros = 60%
  tests.push({
    name: 'Cálculo de Assiduidade (3P, 1A, 1F -> 60%)',
    passed: assiduity.frequencyPercent === 0.6,
    expected: '0.60000 (60,00%)',
    actual: String(assiduity.frequencyPercent)
  });

  // Teste 6: Pontualidade
  const punctuality = calculatePunctuality(20, 1); // 1 atraso em 20 dias trabalhados = 95%
  tests.push({
    name: 'Cálculo de Pontualidade (1 atraso em 20 dias -> 95%)',
    passed: punctuality === 0.95,
    expected: '0.95000 (95,00%)',
    actual: String(punctuality)
  });

  // Teste 7: Resultado final coletivo 70/30
  const finalResult = calculateFinalResult(0.90, 0.85, 0.70, 0.30);
  const expectedFinal = (0.90 * 0.70) + (0.85 * 0.30); // 0.63 + 0.255 = 0.885
  tests.push({
    name: 'Resultado Final Ponderado (70% Individual + 30% Coletivo)',
    passed: Math.abs((finalResult || 0) - expectedFinal) < 0.0001,
    expected: '0.88500',
    actual: String(finalResult)
  });

  return tests;
}
