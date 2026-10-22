import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  CalendarCheck,
  ClockAlert,
  Hourglass,
  Utensils,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { dataStorage } from '../../services/dataStorage';
import { formatPercent, formatMinutesToHHMM } from '../../utils/calculations';

interface DashboardViewProps {
  selectedYearMonth: string;
  onNavigate: (module: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ selectedYearMonth, onNavigate }) => {
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const employees = dataStorage.getEmployees();
  const config = dataStorage.getConfig();
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);

  // Filtros
  const sectors = useMemo(() => Array.from(new Set(employees.map((e) => e.sector))).filter(Boolean), [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (selectedSector !== 'all' && e.sector !== selectedSector && e.team !== selectedSector) return false;
      return true;
    });
  }, [employees, selectedSector]);

  // Cálculos consolidados para o período selecionado
  const {
    activeEmployeesCount,
    ieeiResults,
    avgIEEI,
    avgAttendance,
    avgPunctuality,
    avgLunchCompliance,
    totalDelays,
    totalDelayMinutes,
    totalLunchExcessMinutes,
    pendingAbsencesCount,
    totalHourBankMinutes
  } = useMemo(() => {
    const active = filteredEmployees.filter((e) => e.status === 'active');
    const results = active.map((e) => dataStorage.calculateEmployeeIEEI(e.id, selectedYearMonth));

    const validIEEI = results.filter((r) => r.ieeiScore !== null).map((r) => r.ieeiScore as number);
    const avgScore = validIEEI.length > 0 ? validIEEI.reduce((a, b) => a + b, 0) / validIEEI.length : null;

    let attSum = 0;
    let attCount = 0;
    let punctSum = 0;
    let punctCount = 0;
    let lunchSum = 0;
    let lunchCount = 0;
    let delaysM = 0;
    let lunchExcessM = 0;

    results.forEach((r) => {
      if (r.attendance !== null) {
        attSum += r.attendance;
        attCount++;
      }
      if (r.punctuality !== null) {
        punctSum += r.punctuality;
        punctCount++;
      }
      if (r.lunchCompliance !== null) {
        lunchSum += r.lunchCompliance;
        lunchCount++;
      }
      delaysM += r.totalDelayMinutes || 0;
      lunchExcessM += r.totalLunchExcessMinutes || 0;
    });

    const avgAtt = attCount > 0 ? attSum / attCount : null;
    const avgPunct = punctCount > 0 ? punctSum / punctCount : null;
    const avgLunch = lunchCount > 0 ? lunchSum / lunchCount : null;

    const delays = dataStorage
      .getDelayOccurrences()
      .filter((d) => d.date.startsWith(selectedYearMonth) && active.some((e) => e.id === d.employeeId)).length;

    const pendingAbs = dataStorage.getAbsenceRequests().filter((r) => r.status === 'pending').length;

    const totalHB = active.reduce((acc, e) => acc + dataStorage.getEmployeeHourBankBalance(e.id), 0);

    return {
      activeEmployeesCount: active.length,
      ieeiResults: results,
      avgIEEI: avgScore,
      avgAttendance: avgAtt,
      avgPunctuality: avgPunct,
      avgLunchCompliance: avgLunch,
      totalDelays: delays,
      totalDelayMinutes: delaysM,
      totalLunchExcessMinutes: lunchExcessM,
      pendingAbsencesCount: pendingAbs,
      totalHourBankMinutes: totalHB
    };
  }, [filteredEmployees, selectedYearMonth]);

  // Dados para Gráfico de Desempenho por Setor
  const sectorComparisonData = useMemo(() => {
    return sectors.map((sectorName) => {
      const sectorEmps = employees.filter((e) => (e.sector === sectorName || e.team === sectorName) && e.status === 'active');
      const scores = sectorEmps
        .map((e) => dataStorage.calculateEmployeeIEEI(e.id, selectedYearMonth).ieeiScore)
        .filter((s): s is number => s !== null);

      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100 : 0;
      return {
        sector: sectorName,
        score: Number(avg.toFixed(1)),
        target: Number((config.combinedTarget * 100).toFixed(1))
      };
    });
  }, [sectors, employees, selectedYearMonth, config]);

  // Ranking Top Colaboradores
  const sortedRanking = useMemo(() => {
    return [...ieeiResults]
      .filter((r) => r.ieeiScore !== null)
      .sort((a, b) => (b.ieeiScore || 0) - (a.ieeiScore || 0));
  }, [ieeiResults]);

  // Dados de Tendência Histórica (Últimos 4 meses)
  const evolutionData = [
    { month: 'Jul/26', ieei: 90.5, meta: 93.1 },
    { month: 'Ago/26', ieei: 91.8, meta: 93.1 },
    { month: 'Set/26', ieei: 92.4, meta: 93.1 },
    { month: 'Out/26', ieei: avgIEEI ? Number((avgIEEI * 100).toFixed(1)) : 93.5, meta: 93.1 }
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Status do Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Geral Executivo</h1>
            {isMonthClosed ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                Período Fechado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Período em Aberto
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento em tempo real dos indicadores de jornada, pontualidade, frequência e regularidade operacional.
          </p>
        </div>

        {/* Filtro por Setor */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filtro por Setor:</span>
          </div>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Todos os Setores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cartões Principais (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* IEEI Médio */}
        <div
          onClick={() => onNavigate('ieei')}
          className="p-4 rounded-xl bg-gradient-to-br from-[#0B192C] to-[#1E3E62] text-white shadow-md cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span className="font-semibold">IEEI Médio</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-400">
            {formatPercent(avgIEEI)}
          </div>
          <div className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
            Meta: {formatPercent(config.combinedTarget)}
            {avgIEEI && avgIEEI >= config.combinedTarget ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
            )}
          </div>
        </div>

        {/* Colaboradores Ativos */}
        <div
          onClick={() => onNavigate('employees')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-500 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Colaboradores</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {activeEmployeesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Efetivo Operacional Ativo</div>
        </div>

        {/* Assiduidade / Frequência */}
        <div
          onClick={() => onNavigate('attendance')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Frequência Geral</span>
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPercent(avgAttendance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Meta: {formatPercent(config.attendanceTarget)}</div>
        </div>

        {/* Pontualidade Operacional */}
        <div
          onClick={() => onNavigate('delays')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Pontualidade</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPercent(avgPunctuality)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Meta: {formatPercent(config.punctualityTarget)}</div>
        </div>

        {/* Regularidade Almoço */}
        <div
          onClick={() => onNavigate('lunch')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-teal-500 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Intervalo Almoço</span>
            <Utensils className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPercent(avgLunchCompliance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Meta: {formatPercent(config.lunchComplianceTarget)}</div>
        </div>

        {/* Banco de Horas Acumulado */}
        <div
          onClick={() => onNavigate('hour_bank')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-500 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Banco de Horas</span>
            <Hourglass className="w-4 h-4 text-amber-600" />
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              totalHourBankMinutes < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatMinutesToHHMM(totalHourBankMinutes, true)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Saldo Líquido Total</div>
        </div>
      </div>

      {/* Alertas e Pendências Rápidas */}
      {(pendingAbsencesCount > 0 || totalDelays > 0 || totalLunchExcessMinutes > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pendingAbsencesCount > 0 && (
            <div
              onClick={() => onNavigate('absence')}
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {pendingAbsencesCount} Solicitação(ões) de Ausência Pendente(s)
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Aguardando análise de atestados e liberação gerencial.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 underline">
                Ver Fila &rarr;
              </span>
            </div>
          )}

          {totalDelays > 0 && (
            <div
              onClick={() => onNavigate('delays')}
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 transition"
            >
              <div className="flex items-center gap-3">
                <ClockAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {totalDelays} Atraso(s) Registrado(s) no Período
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Total de {totalDelayMinutes} min de atraso acumulados.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 underline">
                Detalhes &rarr;
              </span>
            </div>
          )}

          {totalLunchExcessMinutes > 0 && (
            <div
              onClick={() => onNavigate('lunch')}
              className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-between cursor-pointer hover:bg-orange-100/60 transition"
            >
              <div className="flex items-center gap-3">
                <Utensils className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-orange-900 dark:text-orange-200">
                    {totalLunchExcessMinutes} Minutos Excedentes de Almoço
                  </h4>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300">
                    Intervalos estendidos além do padrão permitido.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400 underline">
                Ver Intervalos &rarr;
              </span>
            </div>
          )}
        </div>
      )}

      {/* Seção Central de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução Histórica do IEEI */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução Mensal do Índice IEEI
              </h3>
              <p className="text-xs text-slate-500">Média geral ponderada vs Meta {formatPercent(config.combinedTarget)}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Tendência Semestral
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorIeei" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Índice']}
                  contentStyle={{ backgroundColor: '#0B192C', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ieei" stroke="#10B981" strokeWidth={3} fill="url(#colorIeei)" name="IEEI Real" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Comparação de Desempenho por Setor */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Desempenho IEEI por Setor
              </h3>
              <p className="text-xs text-slate-500">Comparativo contra a meta de referência</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Meta: {formatPercent(config.combinedTarget)}
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="sector" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Média Setor']}
                  contentStyle={{ backgroundColor: '#0B192C', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} name="IEEI Setor">
                  {sectorComparisonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.score >= entry.target ? '#10B981' : entry.score >= 80 ? '#F59E0B' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Resumo do Ranking Individual no Período */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ranking Individual de Eficiência e Eficácia (Top Colaboradores)
            </h3>
            <p className="text-xs text-slate-500">
              Cálculo individual = Frequência (Assiduidade) &times; Pontualidade &times; Regularidade de Almoço
            </p>
          </div>
          <button
            onClick={() => onNavigate('ieei')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver Módulo IEEI Completo &rarr;
          </button>
        </div>

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
                <th className="p-3 text-right">Índice IEEI</th>
                <th className="p-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {sortedRanking.slice(0, 5).map((r, idx) => (
                <tr key={r.employeeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-slate-500 font-sans">#{idx + 1}</td>
                  <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{r.registrationNumber}</td>
                  <td className="p-3 font-sans font-medium text-slate-900 dark:text-slate-200">{r.employeeName}</td>
                  <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{r.sector || r.team}</td>
                  <td className="p-3">{formatPercent(r.attendance)}</td>
                  <td className="p-3">{formatPercent(r.punctuality)}</td>
                  <td className="p-3">{formatPercent(r.lunchCompliance)}</td>
                  <td className="p-3">{r.totalDelayMinutes || 0} min</td>
                  <td className={`p-3 font-bold ${(r.hourBankBalanceMinutes || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatMinutesToHHMM(r.hourBankBalanceMinutes || 0, true)}
                  </td>
                  <td className="p-3 text-right font-bold text-xs text-slate-900 dark:text-white">
                    {formatPercent(r.ieeiScore)}
                  </td>
                  <td className="p-3 text-center font-sans">
                    {r.isGoalMet ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Atingida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                        Abaixo da Meta
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
