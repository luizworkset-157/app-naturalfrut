import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  RefreshCw,
  FolderLock,
  CheckCircle2,
  AlertTriangle,
  X,
  History,
  Download,
  ExternalLink,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { googleDriveSync, SyncState, DriveFileItem } from '../../services/googleDriveSync';
import { googleSignIn, googleSignOut, getCurrentGoogleUser } from '../../services/googleAuth';
import { formatDateBR } from '../../utils/calculations';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<SyncState>(googleDriveSync.getSyncState());
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Destructive operation confirmation state for restoring backup
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<DriveFileItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = googleDriveSync.subscribe(() => {
      setSyncState(googleDriveSync.getSyncState());
    });

    setSyncState(googleDriveSync.getSyncState());
    if (googleDriveSync.isConnected()) {
      fetchFiles();
    }

    return () => unsubscribe();
  }, [isOpen]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const list = await googleDriveSync.listDriveBackups();
      setFiles(list);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setFeedback(null);
    try {
      await googleSignIn();
      setFeedback({ type: 'success', message: 'Conectado ao Google com sucesso! A pasta de sincronização será vinculada.' });
      await fetchFiles();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao conectar com o Google.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setFiles([]);
      setFeedback({ type: 'success', message: 'Desconectado da conta do Google.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao desconectar.' });
    }
  };

  const handleManualSync = async (isSnapshot = false) => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      await googleDriveSync.syncNow(isSnapshot);
      setFeedback({
        type: 'success',
        message: isSnapshot
          ? 'Snapshot versionado gravado no Google Drive com sucesso!'
          : 'Dados sincronizados com o Google Drive com sucesso!'
      });
      await fetchFiles();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao sincronizar.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirmFile) return;
    setIsRestoring(true);
    setFeedback(null);
    try {
      await googleDriveSync.restoreBackupFromDrive(restoreConfirmFile.id);
      setFeedback({
        type: 'success',
        message: `Backup "${restoreConfirmFile.name}" restaurado com sucesso no sistema!`
      });
      setRestoreConfirmFile(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao restaurar dados.' });
    } finally {
      setIsRestoring(false);
    }
  };

  const isConnected = googleDriveSync.isConnected();
  const googleUser = getCurrentGoogleUser();

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sincronização com Google Drive
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                Backup Automático Anti-Perda
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mantenha todos os colaboradores, assiduidade, ocorrências e banco de horas salvos em tempo real na nuvem do Google Drive.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
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
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Card de Conexão Google */}
        {!isConnected ? (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderLock className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Conecte sua Conta do Google
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ao conectar, o sistema criará a pasta segura <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-blue-700 dark:text-blue-300 font-mono">IEEI Gestão - Backups</code> no seu Drive e salvará automaticamente seus dados sempre que houver modificações.
              </p>
            </div>

            {/* Botão Oficial Sign in with Google */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium text-xs shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Conectando ao Google...' : 'Conectar com Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Usuário Conectado & Pasta de Destino */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {googleUser?.email?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {googleUser?.displayName || 'Conta Google'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Conectado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{googleUser?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pasta no Drive: <span className="font-semibold text-slate-600 dark:text-slate-300">"{syncState.folderName}"</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40 flex items-center gap-1.5 transition self-start sm:self-center"
              >
                <LogOut className="w-3.5 h-3.5" /> Desconectar
              </button>
            </div>

            {/* Painel de Controle de Sincronização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Toggle Auto-Sync */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Sincronização em Tempo Real
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Sincroniza automaticamente a cada alteração
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncState.autoSyncEnabled}
                    onChange={(e) => googleDriveSync.setAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Status e Última Sincronização */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Status da Nuvem
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {syncState.lastSyncTime
                      ? `Último envio: ${formatDateBR(syncState.lastSyncTime)}`
                      : 'Nenhum envio recente'}
                  </p>
                </div>
                {syncState.status === 'syncing' || isSyncing ? (
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Atualizado
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas de Sincronização */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleManualSync(false)}
                disabled={isSyncing}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>

              <button
                onClick={() => handleManualSync(true)}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                title="Cria uma cópia carimbada com a data e hora atual"
              >
                <History className="w-3.5 h-3.5 text-indigo-500" />
                Criar Snapshot Versionado
              </button>

              <button
                onClick={fetchFiles}
                disabled={loadingFiles}
                className="ml-auto p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs flex items-center gap-1"
                title="Atualizar lista de arquivos no Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Lista de Arquivos no Google Drive */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CloudCheck className="w-4 h-4 text-emerald-600" /> Arquivos de Backup no seu Google Drive:
                </h4>
                <span className="text-[10px] text-slate-400">
                  {files.length} arquivo(s) encontrado(s)
                </span>
              </div>

              {loadingFiles ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Buscando arquivos no Google Drive...
                </div>
              ) : files.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                  Nenhum arquivo encontrado na pasta ainda. Clique em "Sincronizar Agora" para criar a primeira cópia.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {files.map((file) => {
                    const isLatest = file.name === 'ieei_backup_latest.json';
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                          isLatest
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                              {file.name}
                            </span>
                            {isLatest && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white uppercase">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Modificado: {file.modifiedTime ? formatDateBR(file.modifiedTime) : '—'} &bull; Tamanho: {formatFileSize(file.size)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Abrir no Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setRestoreConfirmFile(file)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition shadow-xs"
                            title="Restaurar dados a partir deste arquivo"
                          >
                            <Download className="w-3 h-3" /> Restaurar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação Obrigatória para Restauração (Operação Destrutiva) */}
        {restoreConfirmFile && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 border border-rose-300 dark:border-rose-900/60 shadow-2xl text-xs space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold">
                  Confirmar Restauração de Dados
                </h3>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-slate-700 dark:text-slate-300 space-y-1.5 text-[11px]">
                <p className="font-semibold text-rose-800 dark:text-rose-300">
                  Atenção: Esta ação substituirá todos os dados locais atuais.
                </p>
                <p>
                  Você está prestes a carregar o arquivo <strong className="font-mono">{restoreConfirmFile.name}</strong> salvo em{' '}
                  {restoreConfirmFile.modifiedTime ? formatDateBR(restoreConfirmFile.modifiedTime) : 'data desconhecida'}.
                </p>
                <p className="text-slate-500">
                  Os colaboradores, registros de frequência, atrasos e banco de horas serão sincronizados exatamente como estavam no momento desse backup.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRestoreConfirmFile(null)}
                  disabled={isRestoring}
                  className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restaurando...
                    </>
                  ) : (
                    'Sim, Restaurar Dados'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
