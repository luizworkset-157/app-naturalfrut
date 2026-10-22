import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Lock,
  Unlock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Database,
  Download,
  Upload,
  RefreshCw,
  FileCode,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { IndicatorConfig } from '../../types';
import { runAutomatedSelfTest, SelfTestResult, formatPercent, formatDateBR } from '../../utils/calculations';

interface SettingsViewProps {
  selectedYearMonth: string;
  onOpenFirebaseModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  selectedYearMonth,
  onOpenFirebaseModal
}) => {
  const config = dataStorage.getConfig();
  const monthlyClosings = dataStorage.getMonthlyClosings();
  const currentUser = dataStorage.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  // State de edição de metas
  const [formData, setFormData] = useState<IndicatorConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State de reabertura de mês com justificativa
  const [reopenModalMonth, setReopenModalMonth] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // State dos testes automatizados de regras de negócio
  const [testResults, setTestResults] = useState<SelfTestResult[] | null>(null);
  const [testing, setTesting] = useState(false);

  // Backup state
  const [restoreJson, setRestoreJson] = useState('');

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert('Apenas administradores podem alterar as metas do sistema.');

    dataStorage.updateConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToggleCloseMonth = (ym: string, currentlyClosed: boolean) => {
    if (!isAdmin) return alert('Apenas administradores têm permissão para fechar ou reabrir períodos.');

    if (currentlyClosed) {
      // Reabrir: exige justificativa
      setReopenModalMonth(ym);
      setReopenReason('');
    } else {
      if (confirm(`Deseja formalmente FECHAR o período ${ym}? Nenhuma edição de assiduidade, atrasos, almoço ou banco de horas será permitida sem autorização especial.`)) {
        dataStorage.closeMonth(ym);
      }
    }
  };

  const confirmReopen = () => {
    if (!reopenModalMonth) return;
    try {
      dataStorage.reopenMonth(reopenModalMonth, reopenReason);
      setReopenModalMonth(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRunSelfTest = () => {
    setTesting(true);
    setTimeout(() => {
      const results = runAutomatedSelfTest();
      setTestResults(results);
      setTesting(false);
    }, 400);
  };

  const handleDownloadBackup = () => {
    const json = dataStorage.exportFullBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IEEI_Backup_Completo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = () => {
    if (!isAdmin) return alert('Apenas administradores podem restaurar backups.');
    if (!restoreJson.trim()) return alert('Cole o conteúdo do arquivo JSON de backup.');
    if (confirm('Tem certeza? A restauração substituirá os dados atuais pelo backup.')) {
      try {
        dataStorage.importBackupJSON(restoreJson);
        alert('Backup restaurado com sucesso!');
        setRestoreJson('');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleResetDemo = () => {
    if (!isAdmin) return alert('Apenas administradores podem reiniciar os dados de teste.');
    if (confirm('Deseja redefinir todo o sistema para os dados de demonstração originais da empresa?')) {
      dataStorage.resetAllToDemo();
      alert('Dados de demonstração restaurados.');
    }
  };

  // Cálculo ao vivo da meta combinada durante edição
  const liveCombined = (
    formData.attendanceTarget *
    formData.punctualityTarget *
    formData.lunchComplianceTarget
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" /> Configurações &amp; Parâmetros do Sistema
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ajuste de metas operacionais, fechamento mensal com bloqueio de edições, testes de integridade e backups.
          </p>
        </div>

        <button
          onClick={onOpenFirebaseModal}
          className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 transition"
        >
          <Database className="w-3.5 h-3.5" /> Conexão Firebase / Nuvem
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Metas e Ponderações */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" /> Metas de Referência do IEEI
            </h3>
            <span className="text-[10px] text-slate-400">Exclusivo Administrador</span>
          </div>

          <form onSubmit={handleConfigSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta 1: Assiduidade:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  required
                  disabled={!isAdmin}
                  value={formData.attendanceTarget}
                  onChange={(e) => setFormData({ ...formData, attendanceTarget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 1,00 (100%)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta 2: Pontualidade:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  required
                  disabled={!isAdmin}
                  value={formData.punctualityTarget}
                  onChange={(e) => setFormData({ ...formData, punctualityTarget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 0,95 (95%)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta 3: Reg. Almoço:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  required
                  disabled={!isAdmin}
                  value={formData.lunchComplianceTarget}
                  onChange={(e) => setFormData({ ...formData, lunchComplianceTarget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 0,98 (98%)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duração Almoço (min):
                </label>
                <input
                  type="number"
                  step="5"
                  min="15"
                  max="120"
                  required
                  disabled={!isAdmin}
                  value={formData.defaultLunchMinutes}
                  onChange={(e) => setFormData({ ...formData, defaultLunchMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 60 min</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alerta Atraso (min):
                </label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="60"
                  required
                  disabled={!isAdmin}
                  value={formData.alertDelayThresholdMinutes}
                  onChange={(e) => setFormData({ ...formData, alertDelayThresholdMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 15 min</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alerta Reincidência:
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  required
                  disabled={!isAdmin}
                  value={formData.alertDelayMonthlyRecurrence}
                  onChange={(e) => setFormData({ ...formData, alertDelayMonthlyRecurrence: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400">Padrão: 3 vezes</span>
              </div>
            </div>

            {/* Ponderação Resultado Coletivo */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Pesos do Resultado Final (70% Individual + 30% Coletivo):
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500">Peso IEEI Individual:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    disabled={!isAdmin}
                    value={formData.individualWeight}
                    onChange={(e) => setFormData({ ...formData, individualWeight: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Peso Coletivo Equipe:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    disabled={!isAdmin}
                    value={formData.collectiveWeight}
                    onChange={(e) => setFormData({ ...formData, collectiveWeight: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Prévia da Meta Combinada Resultante */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Meta Combinada Resultante:
                </span>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Produto dos 3 fatores (Assiduidade &times; Pontualidade &times; Reg. Almoço)
                </p>
              </div>
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatPercent(liveCombined, 3)}
              </span>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  Salvar Novas Metas
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Fechamento Mensal e Bloqueio de Edições */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600" /> Fechamento Oficial &amp; Bloqueio Mensal
            </h3>
            <span className="text-[10px] text-slate-400">Auditoria &amp; Governança</span>
          </div>

          <p className="text-xs text-slate-500">
            O fechamento bloqueia novas inserções ou edições nos módulos de assiduidade, atrasos, almoço e banco de horas. Reaberturas exigem justificativa formal registrada na trilha de auditoria.
          </p>

          <div className="space-y-2">
            {['2026-10', '2026-09', '2026-08'].map((ym) => {
              const closing = monthlyClosings.find((c) => c.yearMonth === ym);
              const isClosed = closing?.isClosed || false;

              return (
                <div
                  key={ym}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    {isClosed ? (
                      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block font-mono">
                        Período {ym}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isClosed
                          ? `Fechado em ${formatDateBR(closing?.closedAt)} por ${closing?.closedBy}`
                          : 'Período aberto para lançamentos operacionais'}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleToggleCloseMonth(ym, isClosed)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isClosed
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {isClosed ? 'Reabrir Mês' : 'Fechar Período'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Testes Automatizados de Regras de Negócio */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-emerald-600" /> Testes Automatizados de Validação
                </h4>
                <p className="text-[10px] text-slate-400">
                  Verifica a conformidade das fórmulas, proteções de divisão por zero e arredondamentos.
                </p>
              </div>

              <button
                onClick={handleRunSelfTest}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition"
              >
                {testing ? 'Executando...' : 'Rodar Testes'}
              </button>
            </div>

            {testResults && (
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                {testResults.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      {t.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {t.actual} (Esperado: {t.expected})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backup, Restauração e Demonstração */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" /> Backup Completo, Restauração &amp; Reset Demo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Download Backup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Exportar Backup em JSON
              </span>
              <p className="text-[11px] text-slate-500">
                Baixa um arquivo JSON seguro com todos os colaboradores, assiduidade, ocorrências, banco de horas e trilha de auditoria.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Backup JSON
            </button>
          </div>

          {/* Restaurar Backup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Restaurar a partir de JSON
              </span>
              <textarea
                rows={2}
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                placeholder="Cole o JSON de backup aqui..."
                className="w-full p-2 text-[10px] font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <button
              onClick={handleRestoreBackup}
              disabled={!isAdmin}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> Restaurar Banco de Dados
            </button>
          </div>

          {/* Reset Demo */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col justify-between">
            <div>
              <span className="font-bold text-rose-900 dark:text-rose-200 block mb-1">
                Restaurar Demonstração Original
              </span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Limpa modificações locais e recarrega os colaboradores, presenças e histórico do banco de horas demonstrativo.
              </p>
            </div>
            <button
              onClick={handleResetDemo}
              disabled={!isAdmin}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reiniciar Dados Demo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Reabertura com Justificativa */}
      {reopenModalMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Justificativa Obrigatória de Reabertura ({reopenModalMonth})
            </h3>
            <p className="text-slate-500 text-[11px]">
              Para reabrir o período formalmente fechado, insira o motivo legal ou corporativo. Esta justificativa será gravada de forma imutável na trilha de auditoria.
            </p>
            <textarea
              required
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Ex: Correção de atestados médicos retroativos autorizada pela diretoria."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReopenModalMonth(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReopen}
                disabled={!reopenReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
