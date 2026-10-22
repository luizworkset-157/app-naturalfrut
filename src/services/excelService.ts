/**
 * Serviço de Importação e Exportação de Planilhas Excel (.xlsx)
 * Trata datas seriais do Excel, formatos numéricos brasileiros e preservação de zeros à esquerda.
 */

import * as XLSX from 'xlsx';
import { Employee } from '../types';

export interface ExcelImportSummary {
  sheetName: string;
  totalRows: number;
  validRows: any[];
  errorRows: { rowNumber: number; data: any; errors: string[] }[];
}

/**
 * Converte data serial do Excel (número de dias desde 1900) ou texto para YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Formato brasileiro DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return str;
}

/**
 * Converte valor numérico brasileiro ("1.250,50" ou "1250.50" ou número) para float
 */
export function parseExcelNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Preserva zeros à esquerda e caracteres alfanuméricos de matrículas
 */
export function parseRegistrationNumber(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str;
}

/**
 * Lê o arquivo Excel enviado pelo usuário e retorna as planilhas disponíveis
 */
export async function readExcelFile(file: File): Promise<{ workbook: XLSX.WorkBook; sheetNames: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        resolve({
          workbook,
          sheetNames: workbook.SheetNames
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converte uma aba específica para JSON bruto
 */
export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): any[] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
}

/**
 * Validação e Importação de Colaboradores
 */
export function validateAndMapEmployees(rows: any[], mapping: Record<string, string>): ExcelImportSummary {
  const validRows: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errorRows: { rowNumber: number; data: any; errors: string[] }[] = [];

  rows.forEach((row, idx) => {
    // Ignorar linhas completamente vazias
    const values = Object.values(row).filter((v) => v !== '');
    if (values.length === 0) return;

    const rowNumber = idx + 2; // +1 cabeçalho, +1 index
    const errors: string[] = [];

    const reg = parseRegistrationNumber(row[mapping.registrationNumber || 'Matrícula'] || row['Matricula'] || row['MATRICULA']);
    const name = String(row[mapping.name || 'Nome'] || row['Nome Completo'] || row['NOME'] || '').trim();
    const role = String(row[mapping.role || 'Função'] || row['Funcao'] || row['Cargo'] || 'Operador').trim();
    const team = String(row[mapping.team || 'Equipe'] || row['Time'] || 'Equipe Geral').trim();
    const sector = String(row[mapping.sector || 'Setor'] || row['Área'] || 'Operacional').trim();
    const supervisor = String(row[mapping.supervisor || 'Supervisor'] || 'Coordenação').trim();
    const shift = String(row[mapping.shift || 'Turno'] || '1º Turno (06h - 14h)').trim();
    const rawAdmDate = row[mapping.admissionDate || 'Admissão'] || row['Data de Admissão'];
    const admissionDate = parseExcelDate(rawAdmDate) || new Date().toISOString().split('T')[0];

    if (!reg) errors.push('Matrícula obrigatória');
    if (!name) errors.push('Nome obrigatório');

    if (errors.length > 0) {
      errorRows.push({ rowNumber, data: row, errors });
    } else {
      validRows.push({
        registrationNumber: reg,
        name,
        role,
        team,
        sector,
        supervisor,
        shift,
        admissionDate,
        status: 'active',
        notes: 'Importado via planilha Excel.'
      });
    }
  });

  return {
    sheetName: 'Colaboradores',
    totalRows: rows.length,
    validRows,
    errorRows
  };
}

/**
 * Exporta qualquer conjunto de dados para download em formato .xlsx
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Dados') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
