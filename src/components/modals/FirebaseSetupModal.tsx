import React, { useState } from 'react';
import { Database, ShieldAlert, CheckCircle, ExternalLink, X, Copy, Terminal } from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [configText, setConfigText] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    try {
      if (!configText.trim()) {
        localStorage.removeItem('ieei_firebase_custom_config_v1');
        dataStorage.setDemoMode(true);
        setSaveStatus('Modo Demonstração restaurado com sucesso.');
        setTimeout(() => onClose(), 1200);
        return;
      }
      const parsed = JSON.parse(configText);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error('A configuração deve conter ao menos apiKey e projectId.');
      }
      localStorage.setItem('ieei_firebase_custom_config_v1', JSON.stringify(parsed));
      dataStorage.setDemoMode(false);
      setSaveStatus('Configuração do Firebase salva com sucesso!');
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      alert(`Erro na validação do JSON: ${e.message}`);
    }
  };

  const sampleEnv = `# Configurações do Firebase Cloud Firestore e Authentication
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto-id"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef"`;

  const copySample = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conexão com Firebase Cloud Firestore</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Instruções para persistência em nuvem e autenticação empresarial</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">Modo Demonstração com Dados Fictícios Ativo</p>
              <p>
                O sistema está operando com dados representativos completos gravados no navegador (armazenamento local).
                Todas as edições, novos cadastros e cálculos são salvos localmente.
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" /> Passos para conectar ao seu Firebase:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 ml-1">
              <li>
                Acesse o <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1 font-medium">Console do Firebase <ExternalLink className="w-3 h-3" /></a> e crie ou selecione seu projeto.
              </li>
              <li>
                Em <strong>Build &gt; Firestore Database</strong>, crie um banco de dados no modo de produção.
              </li>
              <li>
                Em <strong>Build &gt; Authentication</strong>, ative o método de login com Google e E-mail/Senha.
              </li>
              <li>
                Aplique as regras de segurança preparadas no arquivo <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-emerald-600">firestore.rules</code> incluído neste repositório.
              </li>
              <li>
                Copie o objeto de configuração da aplicação Web do Firebase Console e cole no campo abaixo:
              </li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cole o objeto firebaseConfig (formato JSON):
            </label>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "seu-app.firebaseapp.com",\n  "projectId": "seu-app",\n  "storageBucket": "seu-app.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
              className="w-full h-32 p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Variáveis de Ambiente Sugeridas (.env):</span>
              <button
                onClick={copySample}
                className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar exemplo'}
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
              {sampleEnv}
            </pre>
          </div>

          {saveStatus && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center animate-fade-in">
              {saveStatus}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fechar
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs transition"
            >
              Salvar Conexão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
