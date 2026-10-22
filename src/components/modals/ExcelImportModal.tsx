import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  readExcelFile,
  getSheetRows,
  validateAndMapEmployees,
  ExcelImportSummary
} from '../../services/excelService';
import { dataStorage } from '../../services/dataStorage';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModule?: 'employees';
  onSuccess: (count: number) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const { workbook: wb, sheetNames: names } = await readExcelFile(file);
      setWorkbook(wb);
      setSheetNames(names);

      // Auto-selecionar aba mais provável
      const matchedSheet = names.find((n) => /colab|func|empreg/i.test(n)) || names[0];

      setSelectedSheet(matchedSheet);
      processSheet(wb, matchedSheet);
      setStep('preview');
    } catch (err: any) {
      alert(`Falha ao ler o arquivo Excel: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processSheet = (wb: XLSX.WorkBook, sheet: string) => {
    const rawRows = getSheetRows(wb, sheet);
    const resultSummary = validateAndMapEmployees(rawRows, {});
    setSummary(resultSummary);
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      processSheet(workbook, sheet);
    }
  };

  const handleConfirmImport = () => {
    if (!summary || summary.validRows.length === 0) return;

    let importedCount = 0;
    try {
      summary.validRows.forEach((row) => {
        try {
          dataStorage.addEmployee(row);
          importedCount++;
        } catch (e) {
          // Ignorar duplicados se já existirem
        }
      });

      onSuccess(importedCount);
      setStep('done');
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Erro durante a importação: ${err.message}`);
    }
  };

  const handleReset = () => {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setSummary(null);
    setStep('upload');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Importação de Colaboradores via Excel (.xlsx)
            </h2>
            <p className="text-xs text-slate-500">
              Preservação automática de zeros à esquerda nas matrículas e conversão de datas brasileiras.
            </p>
          </div>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 dark:bg-slate-800/40"
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Clique para selecionar ou arraste sua planilha Excel (.xlsx, .xls)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Colunas aceitas: Matrícula, Nome, Função, Equipe, Setor, Supervisor, Turno, Admissão.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {isProcessing && (
              <p className="text-center text-xs text-slate-500 animate-pulse">
                Processando estrutura do arquivo...
              </p>
            )}
          </div>
        )}

        {step === 'preview' && summary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aba:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {summary.validRows.length} válidos
                </span>
                {summary.errorRows.length > 0 && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {summary.errorRows.length} com pendências
                  </span>
                )}
              </div>
            </div>

            {/* Tabela de Prévia dos Válidos */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2">Matrícula</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Função</th>
                    <th className="p-2">Equipe</th>
                    <th className="p-2">Setor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {summary.validRows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-bold text-blue-600 dark:text-blue-400">{row.registrationNumber}</td>
                      <td className="p-2 font-sans">{row.name}</td>
                      <td className="p-2 font-sans text-slate-500">{row.role}</td>
                      <td className="p-2 font-sans">{row.team}</td>
                      <td className="p-2 font-sans text-slate-500">{row.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar / Outro Arquivo
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={summary.validRows.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition disabled:opacity-50"
              >
                Confirmar e Cadastrar {summary.validRows.length} Colaborador(es)
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Importação Concluída com Sucesso!</h3>
            <p className="text-xs text-slate-500 mt-1">Os registros foram cadastrados e persistidos no sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
};
