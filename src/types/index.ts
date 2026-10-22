/**
 * Tipos e interfaces fundamentais do IEEI Gestão
 * Sistema de Gestão de Eficiência e Eficácia Individual
 * (Foco em Frequência, Assiduidade, Pontualidade, Intervalo de Almoço e Banco de Horas)
 */

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'operator';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
  sector?: string;
  avatarUrl?: string;
}

export type EmployeeStatus = 'active' | 'leave' | 'vacation' | 'terminated';

export interface Employee {
  id: string;
  registrationNumber: string; // Matrícula preservando zeros à esquerda e letras
  name: string;
  role: string;
  team: string;
  sector: string;
  supervisor: string;
  shift: string; // Ex: '1º Turno (06h - 14h)', '2º Turno (14h - 22h)', 'Horário Comercial'
  admissionDate: string; // YYYY-MM-DD
  status: EmployeeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceCode = 'P' | 'F' | 'A' | 'S' | 'J' | ''; 
// P: Presente, F: Falta, A: Atraso, S: Saída antecipada, J: Falta Justificada

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  registrationNumber: string;
  yearMonth: string; // YYYY-MM
  dailyCodes: Record<number, AttendanceCode>; // dia 1..31 -> código
  updatedAt: string;
  updatedBy: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface AbsenceRequest {
  id: string;
  requestDate: string; // YYYY-MM-DD
  absenceDate: string; // YYYY-MM-DD
  employeeId: string;
  registrationNumber: string;
  employeeName: string;
  reasonCode: string; // 'COD01' a 'COD07' ou custom
  reasonDescription: string;
  hourBankBalanceAtRequest?: number; // minutos
  status: RequestStatus;
  authorizedBy?: string;
  authorizedAt?: string;
  authorizationNotes?: string;
  notes?: string;
  impactsHourBank?: boolean;
  impactsAttendance?: boolean;
  createdAt: string;
}

export interface DelayOccurrence {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  registrationNumber: string;
  employeeName: string;
  reasonCode: string;
  reasonDescription: string;
  expectedTime: string; // HH:MM
  actualTime: string; // HH:MM
  delayMinutes: number;
  recurrenceCountInMonth?: number;
  justification?: string;
  reporter: string;
  createdAt: string;
}

export interface LunchInterval {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  registrationNumber: string;
  employeeName: string;
  exitTime: string; // HH:MM ou YYYY-MM-DDTHH:MM
  returnTime: string; // HH:MM ou YYYY-MM-DDTHH:MM
  intervalMinutes: number;
  allowedMinutes: number; // Padrão 60
  excessMinutes: number; // max(0, interval - allowed)
  justification?: string;
  generatesOccurrence?: boolean;
  createdAt: string;
}

export type HourBankType = 
  | 'credit' 
  | 'debit' 
  | 'overtime' 
  | 'compensation' 
  | 'authorized_adjustment' 
  | 'occurrence_discount'
  | 'initial_balance';

export interface HourBankTransaction {
  id: string;
  employeeId: string;
  registrationNumber: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  type: HourBankType;
  minutes: number; // Positivo para crédito, negativo ou positivo com tipo debit
  justification: string;
  reporter: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface IndicatorConfig {
  id: string;
  attendanceTarget: number; // 1.00 (100% de frequência)
  punctualityTarget: number; // 0.95 (95% de pontualidade)
  lunchComplianceTarget: number; // 0.98 (98% de conformidade de intervalo)
  combinedTarget: number; // 1.00 * 0.95 * 0.98 = 0.931 (93,1%)
  individualWeight: number; // 0.70 (70% individual)
  collectiveWeight: number; // 0.30 (30% coletivo)
  defaultLunchMinutes: number; // 60 minutos
  alertDelayThresholdMinutes: number; // 15 minutos
  alertDelayMonthlyRecurrence: number; // 3 vezes
  updatedAt: string;
  updatedBy: string;
}

export interface MonthlyClosing {
  id: string;
  yearMonth: string; // YYYY-MM
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'close_month' | 'reopen_month' | 'import' | 'config_change';
  entity: string;
  entityId: string;
  details: string;
}

export interface IEEICalculationResult {
  employeeId: string;
  registrationNumber: string;
  employeeName: string;
  team: string;
  sector?: string;
  yearMonth: string;
  
  // Componentes Centrais da Jornada e Eficiência Individual
  attendance: number | null; // Frequência / Presença (Meta 1.00)
  punctuality: number | null; // Pontualidade sem atrasos (Meta 0.95)
  lunchCompliance: number | null; // Regularidade do almoço (Meta 0.98)

  // Índice individual calculado = Frequência × Pontualidade × Regularidade Almoço
  ieeiScore: number | null;
  targetScore: number;
  isGoalMet: boolean;
  status: 'complete' | 'pending';
  missingComponents: string[];

  // Atendimento individual a cada meta
  attendanceMet: boolean;
  punctualityMet: boolean;
  lunchComplianceMet: boolean;

  // Gargalo (componente que mais reduziu a pontuação)
  bottleneckComponent?: string;

  // Detalhes de suporte
  presentDays?: number;
  absentDays?: number;
  delayDays?: number;
  earlyExitDays?: number;
  justifiedDays?: number;
  totalDelayMinutes?: number;
  totalLunchExcessMinutes?: number;
  hourBankBalanceMinutes?: number;

  // Resultado Coletivo integrado
  collectiveScore?: number; // Média da equipe
  finalWeightedScore?: number; // (ieei * 0.70) + (coletivo * 0.30)
}

export interface CollectiveIndicator {
  id: string;
  yearMonth: string;
  team: string;
  score: number; // Ex: 0.92 (92%)
  methodologyDescription: string;
  updatedAt: string;
  updatedBy: string;
}

export interface NotificationItem {
  id: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  date: string;
  read: boolean;
  linkModule?: string;
}
