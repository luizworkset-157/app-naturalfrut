import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Cloud,
  CloudCheck,
  CloudUpload,
  X
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { googleDriveSync } from '../../services/googleDriveSync';
import { IndicatorConfig } from '../../types';
import { runAutomatedSelfTest, SelfTestResult, formatPercent, formatDateBR } from '../../utils/calculations';

interface SettingsViewProps {
  selectedYearMonth: string;
  onOpenFirebaseModal: () => void;
  onOpenGoogleDriveModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  selectedYearMonth,
  onOpenFirebaseModal,
  onOpenGoogleDriveModal
}) => {
  const [config, setConfig] = useState<IndicatorConfig>(dataStorage.getConfig());
  const [monthlyClosings, setMonthlyClosings] = useState(dataStorage.getMonthlyClosings());
  const [currentUser, setCurrentUser] = useState(dataStorage.getCurrentUser());
  const [availablePeriods, setAvailablePeriods] = useState(() => dataStorage.getAvailablePeriods());
  const isAdmin = currentUser.role === 'admin';

  const [driveState, setDriveState] = useState(googleDriveSync.getSyncState());

  // Assinar atualizações do dataStorage e do GoogleDriveSync
  useEffect(() => {
    const unsubStorage = dataStorage.subscribe(() => {
      setMonthlyClosings(dataStorage.getMonthlyClosings());
      setCurrentUser(dataStorage.getCurrentUser());
      setConfig(dataStorage.getConfig());
      setAvailablePeriods(dataStorage.getAvailablePeriods());
    });

    const unsubDrive = googleDriveSync.subscribe(() => {
      setDriveState(googleDriveSync.getSyncState());
    });

    return () => {
      unsubStorage();
      unsubDrive();
    };
  }, []);

  // State de edição de metas
  const [formData, setFormData] = useState<IndicatorConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Feedback banner global para mensagens de sucesso/erro
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State de fechamento de mês (Modal sem window.confirm)
  const [closeModalMonth, setCloseModalMonth] = useState<string | null>(null);

  // State de reabertura de mês com justificativa
  const [reopenModalMonth, setReopenModalMonth] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState<string | null>(null);

  // State de confirmação para Reset Demo (sem window.confirm)
  const [showResetDemoModal, setShowResetDemoModal] = useState(false);

  // State dos testes automatizados de regras de negócio
  const [testResults, setTestResults] = useState<SelfTestResult[] | null>(null);
  const [testing, setTesting] = useState(false);

  // Backup state
  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Apenas administradores podem alterar as metas do sistema.' });
      return;
    }

    dataStorage.updateConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleOpenCloseMonth = (ym: string) => {
    setCloseModalMonth(ym);
  };

  const handleConfirmCloseMonth = () => {
    if (!closeModalMonth) return;
    try {
      dataStorage.closeMonth(closeModalMonth);
      setFeedback({ type: 'success', message: `Período ${closeModalMonth} foi FECHADO formalmente com sucesso!` });
      setCloseModalMonth(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao fechar período.' });
      setCloseModalMonth(null);
    }
  };

  const handleOpenReopenMonth = (ym: string) => {
    setReopenModalMonth(ym);
    setReopenReason('Reabertura formal autorizada pela diretoria para apuração de ponto.');
    setReopenError(null);
  };

  const confirmReopen = () => {
    if (!reopenModalMonth) return;
    const finalReason = reopenReason.trim() || 'Reabertura formal autorizada pela diretoria para apuração de ponto.';
    try {
      dataStorage.reopenMonth(reopenModalMonth, finalReason);
      setFeedback({ type: 'success', message: `Período ${reopenModalMonth} REABERTO com sucesso para lançamentos!` });
      setReopenModalMonth(null);
      setReopenReason('');
      setReopenError(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao reabrir período.' });
      setReopenModalMonth(null);
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
    setFeedback({ type: 'success', message: 'Arquivo de backup exportado com sucesso!' });
  };

  const handleConfirmRestore = () => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Apenas administradores podem restaurar backups.' });
      return;
    }
    if (!restoreJson.trim()) {
      setFeedback({ type: 'error', message: 'Cole o conteúdo do arquivo JSON de backup.' });
      return;
    }
    try {
      dataStorage.importBackupJSON(restoreJson);
      setShowRestoreModal(false);
      setRestoreJson('');
      setFeedback({ type: 'success', message: 'Backup restaurado com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao restaurar backup.' });
    }
  };

  const handleConfirmResetDemo = () => {
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'Apenas administradores podem reiniciar os dados de teste.' });
      return;
    }
    dataStorage.resetAllToDemo();
    setShowResetDemoModal(false);
    setFeedback({ type: 'success', message: 'Dados de demonstração restaurados com sucesso!' });
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

        <div className="flex flex-wrap items-center gap-2">
          {onOpenGoogleDriveModal && (
            <button
              onClick={onOpenGoogleDriveModal}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition ${
                driveState.userEmail
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              }`}
            >
              {driveState.userEmail ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Google Drive (Conectado)</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Conectar Google Drive</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenFirebaseModal}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5" /> Conexão Firebase / Nuvem
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Ações */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dica para Usuários sem perfil de Administrador */}
      {!isAdmin && (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Perfil atual: <strong>{currentUser.name}</strong> ({currentUser.role}). Para fechar ou reabrir períodos e alterar metas, é necessário perfil de Administrador.
            </span>
          </div>
          <button
            onClick={() => {
              dataStorage.switchRole('admin');
              setFeedback({ type: 'success', message: 'Perfil alternado para Administrador com sucesso!' });
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shrink-0 transition shadow-xs"
          >
            Alternar para Administrador
          </button>
        </div>
      )}

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
            {availablePeriods.map((period) => {
              const ym = period.value;
              const closing = monthlyClosings.find((c) => c.yearMonth === ym);
              const isClosed = period.isClosed;
              const cleanMonthName = period.label.replace(/\s*\((Fechado|Aberto)\)$/i, '');

              return (
                <div
                  key={ym}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    isClosed
                      ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isClosed ? (
                      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                          {cleanMonthName} ({ym})
                        </span>
                        {ym === selectedYearMonth && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Selecionado no Topo
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isClosed
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isClosed ? 'Bloqueado (Fechado)' : 'Aberto'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {isClosed
                          ? `Fechado em ${formatDateBR(closing?.closedAt)} por ${closing?.closedBy || 'Administrador'}`
                          : 'Período liberado para lançamentos de assiduidade, atrasos e horas'}
                      </span>
                      {isClosed && closing?.reopenReason && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 italic">
                          Última justificativa: {closing.reopenReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        setFeedback({
                          type: 'error',
                          message: 'Apenas Administradores podem fechar ou reabrir períodos. Use o seletor no topo ou o botão acima para mudar seu perfil.'
                        });
                        return;
                      }
                      if (isClosed) {
                        handleOpenReopenMonth(ym);
                      } else {
                        handleOpenCloseMonth(ym);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 ${
                      isClosed
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                        : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-700'
                    }`}
                  >
                    {isClosed ? 'Reabrir Mês' : 'Fechar Período'}
                  </button>
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
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" /> Backup Completo, Sincronização &amp; Restauração
          </h3>
          <span className="text-[10px] text-slate-400">Proteção Anti-Perda</span>
        </div>

        {/* Card Destaque: Google Drive Auto-Sync */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-blue-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-blue-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CloudCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Sincronização Contínua no Google Drive
                </span>
                {driveState.userEmail ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    Ativo ({driveState.userEmail})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    Não Conectado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {driveState.userEmail
                  ? `Os dados são sincronizados automaticamente na pasta "${driveState.folderName}" sempre que houver alterações.`
                  : 'Conecte sua conta Google para salvar automaticamente cada alteração de assiduidade, colaboradores e ocorrências.'}
              </p>
              {driveState.lastSyncTime && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Última sincronização com sucesso: {formatDateBR(driveState.lastSyncTime)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenGoogleDriveModal && (
              <button
                onClick={onOpenGoogleDriveModal}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Cloud className="w-3.5 h-3.5" />
                {driveState.userEmail ? 'Gerenciar Drive & Backups' : 'Conectar com Google'}
              </button>
            )}
          </div>
        </div>

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
              onClick={() => {
                if (!isAdmin) {
                  setFeedback({ type: 'error', message: 'Apenas administradores podem restaurar backups.' });
                  return;
                }
                if (!restoreJson.trim()) {
                  setFeedback({ type: 'error', message: 'Cole o conteúdo do arquivo JSON de backup antes de restaurar.' });
                  return;
                }
                setShowRestoreModal(true);
              }}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
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
              onClick={() => {
                if (!isAdmin) {
                  setFeedback({ type: 'error', message: 'Apenas administradores podem reiniciar os dados de teste.' });
                  return;
                }
                setShowResetDemoModal(true);
              }}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reiniciar Dados Demo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Fechamento de Mês */}
      {closeModalMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-300 dark:border-rose-900/60 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Lock className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">
                Confirmar Fechamento Oficial do Período ({closeModalMonth})
              </h3>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Tem certeza de que deseja <strong>FECHAR formalmente o período {closeModalMonth}</strong>?
            </p>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-semibold">Consequências do Fechamento:</p>
              <p>&bull; Bloqueio imediato de alterações nas matrizes de presença e assiduidade deste mês.</p>
              <p>&bull; Bloqueio de novos registros ou edições de atrasos, almoço e banco de horas no período.</p>
              <p>&bull; Qualquer reabertura futura exigirá justificativa legal registrada na auditoria.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCloseModalMonth(null)}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseMonth}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" /> Sim, Fechar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reabertura com Justificativa */}
      {reopenModalMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-300 dark:border-amber-900/60 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <Unlock className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">
                Justificativa Obrigatória de Reabertura ({reopenModalMonth})
              </h3>
            </div>

            <p className="text-slate-500 text-[11px]">
              Para reabrir o período formalmente fechado, insira o motivo legal ou corporativo. Esta justificativa será gravada de forma imutável na trilha de auditoria para fins de compliance.
            </p>

            <div>
              <textarea
                required
                rows={3}
                value={reopenReason}
                onChange={(e) => {
                  setReopenReason(e.target.value);
                  if (reopenError) setReopenError(null);
                }}
                placeholder="Ex: Correção de atestados médicos retroativos autorizada pela diretoria."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Mínimo exigido: 10 caracteres</span>
                <span className={reopenReason.trim().length >= 10 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-semibold'}>
                  {reopenReason.trim().length}/10 caracteres
                </span>
              </div>
            </div>

            {reopenError && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{reopenError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setReopenModalMonth(null);
                  setReopenReason('');
                  setReopenError(null);
                }}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReopen}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" /> Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Restauração de Banco */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-300 dark:border-emerald-900/60 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <Upload className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Confirmar Restauração de Dados</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              A restauração substituirá todos os colaboradores, registros de assiduidade, ocorrências e banco de horas atuais pelo conteúdo do JSON fornecido.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
              >
                Confirmar Restauração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Reset Demo */}
      {showResetDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-300 dark:border-rose-900/60 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Restaurar Dados de Demonstração</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Deseja redefinir todo o sistema para os dados de demonstração originais da empresa? Todas as alterações manuais feitas nesta sessão serão substituídas pelos dados de teste padrão.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetDemoModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetDemo}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition cursor-pointer"
              >
                Sim, Restaurar Demonstração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
