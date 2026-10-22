/**
 * Camada unificada de dados e persistência do IEEI Gestão
 * Gestão de Frequência, Assiduidade, Atrasos, Almoço e Banco de Horas
 */

import {
  Employee,
  AttendanceRecord,
  AttendanceCode,
  AbsenceRequest,
  DelayOccurrence,
  LunchInterval,
  HourBankTransaction,
  IndicatorConfig,
  MonthlyClosing,
  AuditLog,
  UserProfile,
  CollectiveIndicator,
  IEEICalculationResult,
  NotificationItem,
  UserRole
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_ABSENCE_REQUESTS,
  INITIAL_DELAY_OCCURRENCES,
  INITIAL_LUNCH_INTERVALS,
  INITIAL_HOUR_BANK,
  INITIAL_COLLECTIVE_INDICATORS,
  INITIAL_MONTHLY_CLOSINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS
} from './mockData';
import {
  DEFAULT_CONFIG,
  calculateAssiduity,
  calculatePunctuality,
  calculateLunchCompliance,
  calculateLunchInterval,
  calculateIEEI,
  calculateFinalResult
} from '../utils/calculations';

const DEFAULT_ROLES = [
  'Operador de Produção',
  'Operador de Montagem',
  'Operador Especialista',
  'Assistente Operacional',
  'Analista de Qualidade',
  'Técnico de Manutenção',
  'Auxiliar de Operações',
  'Líder de Setor'
];

const DEFAULT_SECTORS = [
  'Operações',
  'Montagem',
  'Usinagem',
  'Embalagem',
  'Logística',
  'Manutenção',
  'Qualidade'
];

const DEFAULT_SHIFTS = [
  '1º Turno (06h - 14h)',
  '2º Turno (14h - 22h)',
  '3º Turno (22h - 06h)',
  'Horário Comercial (08h - 17h)'
];

const STORAGE_KEYS = {
  EMPLOYEES: 'ieei_employees_v2',
  ATTENDANCE: 'ieei_attendance_v2',
  ABSENCE_REQUESTS: 'ieei_absence_v2',
  DELAY_OCCURRENCES: 'ieei_delays_v2',
  LUNCH_INTERVALS: 'ieei_lunch_v2',
  HOUR_BANK: 'ieei_hour_bank_v2',
  CONFIG: 'ieei_config_v2',
  COLLECTIVE: 'ieei_collective_v2',
  CLOSINGS: 'ieei_closings_v2',
  AUDIT: 'ieei_audit_v2',
  USERS: 'ieei_users_v2',
  CURRENT_USER_ID: 'ieei_current_user_v2',
  FIREBASE_CONFIG: 'ieei_firebase_custom_config_v2',
  ROLES: 'ieei_roles_v2',
  SECTORS: 'ieei_sectors_v2',
  SHIFTS: 'ieei_shifts_v2'
};

class DataStorageService {
  private employees: Employee[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private absenceRequests: AbsenceRequest[] = [];
  private delayOccurrences: DelayOccurrence[] = [];
  private lunchIntervals: LunchInterval[] = [];
  private hourBankTransactions: HourBankTransaction[] = [];
  private indicatorConfig: IndicatorConfig = DEFAULT_CONFIG;
  private collectiveIndicators: CollectiveIndicator[] = [];
  private monthlyClosings: MonthlyClosing[] = [];
  private auditLogs: AuditLog[] = [];
  private users: UserProfile[] = [];
  private roles: string[] = DEFAULT_ROLES;
  private sectors: string[] = DEFAULT_SECTORS;
  private shifts: string[] = DEFAULT_SHIFTS;
  private currentUser: UserProfile = INITIAL_USERS[0];
  private isDemoMode: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in storage listener', err);
      }
    });
  }

  private saveItem(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Could not save item to localStorage [${key}]`, e);
    }
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Error reading localStorage [${key}]`, e);
      return fallback;
    }
  }

  private loadFromStorage() {
    this.employees = this.getItem(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    this.attendanceRecords = this.getItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    this.absenceRequests = this.getItem(STORAGE_KEYS.ABSENCE_REQUESTS, INITIAL_ABSENCE_REQUESTS);
    this.delayOccurrences = this.getItem(STORAGE_KEYS.DELAY_OCCURRENCES, INITIAL_DELAY_OCCURRENCES);
    this.lunchIntervals = this.getItem(STORAGE_KEYS.LUNCH_INTERVALS, INITIAL_LUNCH_INTERVALS);
    this.hourBankTransactions = this.getItem(STORAGE_KEYS.HOUR_BANK, INITIAL_HOUR_BANK);
    this.indicatorConfig = this.getItem(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    this.collectiveIndicators = this.getItem(STORAGE_KEYS.COLLECTIVE, INITIAL_COLLECTIVE_INDICATORS);
    this.monthlyClosings = this.getItem(STORAGE_KEYS.CLOSINGS, INITIAL_MONTHLY_CLOSINGS);
    this.auditLogs = this.getItem(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    this.users = this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.roles = this.getItem(STORAGE_KEYS.ROLES, DEFAULT_ROLES);
    this.sectors = this.getItem(STORAGE_KEYS.SECTORS, DEFAULT_SECTORS);
    this.shifts = this.getItem(STORAGE_KEYS.SHIFTS, DEFAULT_SHIFTS);

    // Mesclar funções, setores e turnos que porventura já estejam em colaboradores
    const empRoles = this.employees.map((e) => e.role).filter(Boolean);
    const empSectors = this.employees.map((e) => e.sector).filter(Boolean);
    const empShifts = this.employees.map((e) => e.shift).filter(Boolean);
    this.roles = Array.from(new Set([...this.roles, ...empRoles])).sort();
    this.sectors = Array.from(new Set([...this.sectors, ...empSectors])).sort();
    this.shifts = Array.from(new Set([...this.shifts, ...empShifts])).sort();

    const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const foundUser = this.users.find((u) => u.id === savedUserId);
    this.currentUser = foundUser || this.users[0] || INITIAL_USERS[0];

    // Migração de sanitização: remover qualquer resquício de Alfa, Beta, Gama das equipes
    let migratedEmployees = false;
    this.employees = this.employees.map((emp) => {
      if (emp.team && /alfa|beta|gama/i.test(emp.team)) {
        migratedEmployees = true;
        return { ...emp, team: emp.sector || 'Operações' };
      }
      return emp;
    });
    if (migratedEmployees) {
      this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    }

    let migratedUsers = false;
    this.users = this.users.map((u) => {
      if (u.team && /alfa|beta|gama/i.test(u.team)) {
        migratedUsers = true;
        return { ...u, team: u.sector || 'Operações' };
      }
      return u;
    });
    if (migratedUsers) {
      this.saveItem(STORAGE_KEYS.USERS, this.users);
    }

    let migratedCollective = false;
    this.collectiveIndicators = this.collectiveIndicators.map((col) => {
      if (col.team && /alfa/i.test(col.team)) {
        migratedCollective = true;
        return {
          ...col,
          team: 'Operações',
          methodologyDescription: 'Índice Coletivo de Assiduidade e Cumprimento de Jornada do Setor Operações.'
        };
      }
      if (col.team && /beta/i.test(col.team)) {
        migratedCollective = true;
        return {
          ...col,
          team: 'Logística',
          methodologyDescription: 'Índice Coletivo de Frequência e Pontualidade do Setor Logística.'
        };
      }
      if (col.team && /gama/i.test(col.team)) {
        migratedCollective = true;
        return {
          ...col,
          team: 'Qualidade',
          methodologyDescription: 'Índice Coletivo de Regularidade e Pontualidade do Setor Qualidade.'
        };
      }
      return col;
    });
    if (migratedCollective) {
      this.saveItem(STORAGE_KEYS.COLLECTIVE, this.collectiveIndicators);
    }

    const customFirebase = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    this.isDemoMode = !customFirebase;
  }

  // AUDIT LOGGING
  public logAudit(action: AuditLog['action'], entity: string, entityId: string, details: string) {
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action,
      entity,
      entityId,
      details
    };
    this.auditLogs = [newLog, ...this.auditLogs].slice(0, 1000);
    this.saveItem(STORAGE_KEYS.AUDIT, this.auditLogs);
  }

  // MONTH CLOSING PROTECTION
  public isMonthClosed(yearMonth: string): boolean {
    const closing = this.monthlyClosings.find((c) => c.yearMonth === yearMonth);
    return Boolean(closing?.isClosed);
  }

  public assertMonthNotClosed(yearMonth: string) {
    if (this.isMonthClosed(yearMonth)) {
      throw new Error(`O período ${yearMonth} está formalmente FECHADO. Edições ou inclusões exigem autorização e reabertura por um Administrador.`);
    }
  }

  // USERS & RBAC
  public getUsers(): UserProfile[] {
    return [...this.users];
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile) {
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify();
  }

  public switchRole(role: UserRole) {
    const targetUser = this.users.find((u) => u.role === role);
    if (targetUser) {
      this.setCurrentUser(targetUser);
    } else {
      const updated = { ...this.currentUser, role };
      this.currentUser = updated;
      this.notify();
    }
  }

  public addUser(user: Omit<UserProfile, 'id'>) {
    const newUser: UserProfile = {
      ...user,
      id: `usr_${Date.now()}`
    };
    this.users.push(newUser);
    this.saveItem(STORAGE_KEYS.USERS, this.users);
    this.logAudit('create', 'UserProfile', newUser.id, `Novo usuário criado: ${newUser.name} (${newUser.role})`);
    this.notify();
  }

  public updateUser(id: string, updates: Partial<UserProfile>) {
    this.users = this.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    if (this.currentUser.id === id) {
      this.currentUser = { ...this.currentUser, ...updates };
    }
    this.saveItem(STORAGE_KEYS.USERS, this.users);
    this.logAudit('update', 'UserProfile', id, `Usuário ${id} atualizado.`);
    this.notify();
  }

  // EMPLOYEES
  public getEmployees(): Employee[] {
    return [...this.employees];
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.employees.find((e) => e.id === id);
  }

  public getEmployeeByRegistration(registrationNumber: string): Employee | undefined {
    const clean = registrationNumber.trim().toUpperCase();
    return this.employees.find((e) => e.registrationNumber.trim().toUpperCase() === clean);
  }

  public addEmployee(emp: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Employee {
    const existing = this.getEmployeeByRegistration(emp.registrationNumber);
    if (existing) {
      throw new Error(`A matrícula "${emp.registrationNumber}" já pertence ao colaborador ${existing.name}.`);
    }

    const now = new Date().toISOString();
    const newEmp: Employee = {
      ...emp,
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };

    this.employees.push(newEmp);
    this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    this.logAudit('create', 'Employee', newEmp.id, `Cadastro de colaborador: ${newEmp.name} (Matrícula: ${newEmp.registrationNumber})`);
    this.notify();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee {
    const index = this.employees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Colaborador não encontrado.');

    if (updates.registrationNumber && updates.registrationNumber !== this.employees[index].registrationNumber) {
      const existing = this.getEmployeeByRegistration(updates.registrationNumber);
      if (existing && existing.id !== id) {
        throw new Error(`Matrícula "${updates.registrationNumber}" já em uso por ${existing.name}.`);
      }
    }

    const updatedEmp: Employee = {
      ...this.employees[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.employees[index] = updatedEmp;
    this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    this.logAudit('update', 'Employee', id, `Atualização do colaborador: ${updatedEmp.name}`);
    this.notify();
    return updatedEmp;
  }

  public deleteEmployee(id: string) {
    const emp = this.getEmployeeById(id);
    if (!emp) return;

    this.employees = this.employees.filter((e) => e.id !== id);
    this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    this.logAudit('delete', 'Employee', id, `Exclusão do colaborador: ${emp.name} (Matrícula: ${emp.registrationNumber})`);
    this.notify();
  }

  // ROLES MANAGEMENT
  public getRoles(): string[] {
    const fromEmps = this.employees.map((e) => e.role).filter(Boolean);
    return Array.from(new Set([...this.roles, ...fromEmps])).sort();
  }

  public addRole(role: string): void {
    const clean = role.trim();
    if (!clean) throw new Error('O nome da função não pode ser vazio.');
    if (this.roles.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      throw new Error(`A função "${clean}" já está cadastrada.`);
    }
    this.roles.push(clean);
    this.roles.sort();
    this.saveItem(STORAGE_KEYS.ROLES, this.roles);
    this.logAudit('create', 'Role', clean, `Nova função cadastrada: ${clean}`);
    this.notify();
  }

  public updateRole(oldRole: string, newRole: string): void {
    const cleanOld = oldRole.trim();
    const cleanNew = newRole.trim();
    if (!cleanNew) throw new Error('O novo nome da função não pode ser vazio.');
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) return;

    // Atualiza na lista de funções
    this.roles = this.roles.map((r) => (r.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : r));
    this.roles = Array.from(new Set(this.roles)).sort();
    this.saveItem(STORAGE_KEYS.ROLES, this.roles);

    // Atualiza também colaboradores que possuem essa função
    let updatedEmployeesCount = 0;
    this.employees = this.employees.map((emp) => {
      if (emp.role.toLowerCase() === cleanOld.toLowerCase()) {
        updatedEmployeesCount++;
        return { ...emp, role: cleanNew, updatedAt: new Date().toISOString() };
      }
      return emp;
    });
    if (updatedEmployeesCount > 0) {
      this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    }

    this.logAudit('update', 'Role', cleanNew, `Função alterada de "${cleanOld}" para "${cleanNew}" (${updatedEmployeesCount} colaboradores atualizados)`);
    this.notify();
  }

  public deleteRole(role: string): void {
    const clean = role.trim();
    this.roles = this.roles.filter((r) => r.toLowerCase() !== clean.toLowerCase());
    this.saveItem(STORAGE_KEYS.ROLES, this.roles);
    this.logAudit('delete', 'Role', clean, `Função excluída da lista: ${clean}`);
    this.notify();
  }

  // SECTORS MANAGEMENT
  public getSectors(): string[] {
    const fromEmps = this.employees.map((e) => e.sector).filter(Boolean);
    return Array.from(new Set([...this.sectors, ...fromEmps])).sort();
  }

  public addSector(sector: string): void {
    const clean = sector.trim();
    if (!clean) throw new Error('O nome do setor não pode ser vazio.');
    if (this.sectors.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      throw new Error(`O setor "${clean}" já está cadastrado.`);
    }
    this.sectors.push(clean);
    this.sectors.sort();
    this.saveItem(STORAGE_KEYS.SECTORS, this.sectors);
    this.logAudit('create', 'Sector', clean, `Novo setor cadastrado: ${clean}`);
    this.notify();
  }

  public updateSector(oldSector: string, newSector: string): void {
    const cleanOld = oldSector.trim();
    const cleanNew = newSector.trim();
    if (!cleanNew) throw new Error('O novo nome do setor não pode ser vazio.');
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) return;

    this.sectors = this.sectors.map((s) => (s.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : s));
    this.sectors = Array.from(new Set(this.sectors)).sort();
    this.saveItem(STORAGE_KEYS.SECTORS, this.sectors);

    let updatedEmployeesCount = 0;
    this.employees = this.employees.map((emp) => {
      if (emp.sector.toLowerCase() === cleanOld.toLowerCase()) {
        updatedEmployeesCount++;
        return { ...emp, sector: cleanNew, updatedAt: new Date().toISOString() };
      }
      return emp;
    });
    if (updatedEmployeesCount > 0) {
      this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    }

    this.logAudit('update', 'Sector', cleanNew, `Setor alterado de "${cleanOld}" para "${cleanNew}" (${updatedEmployeesCount} colaboradores atualizados)`);
    this.notify();
  }

  public deleteSector(sector: string): void {
    const clean = sector.trim();
    this.sectors = this.sectors.filter((s) => s.toLowerCase() !== clean.toLowerCase());
    this.saveItem(STORAGE_KEYS.SECTORS, this.sectors);
    this.logAudit('delete', 'Sector', clean, `Setor excluído da lista: ${clean}`);
    this.notify();
  }

  // SHIFTS MANAGEMENT
  public getShifts(): string[] {
    return [...this.shifts];
  }

  public addShift(shift: string): void {
    const clean = shift.trim();
    if (!clean) throw new Error('O nome do turno não pode ser vazio.');
    if (this.shifts.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      throw new Error(`O turno "${clean}" já está cadastrado.`);
    }
    this.shifts.push(clean);
    this.shifts.sort();
    this.saveItem(STORAGE_KEYS.SHIFTS, this.shifts);
    this.logAudit('create', 'Shift', clean, `Novo turno cadastrado: ${clean}`);
    this.notify();
  }

  public updateShift(oldShift: string, newShift: string): void {
    const cleanOld = oldShift.trim();
    const cleanNew = newShift.trim();
    if (!cleanNew) throw new Error('O novo nome do turno não pode ser vazio.');
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) return;

    this.shifts = this.shifts.map((s) => (s.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : s));
    this.shifts = Array.from(new Set(this.shifts)).sort();
    this.saveItem(STORAGE_KEYS.SHIFTS, this.shifts);

    let updatedEmployeesCount = 0;
    this.employees = this.employees.map((emp) => {
      if (emp.shift?.toLowerCase() === cleanOld.toLowerCase()) {
        updatedEmployeesCount++;
        return { ...emp, shift: cleanNew, updatedAt: new Date().toISOString() };
      }
      return emp;
    });
    if (updatedEmployeesCount > 0) {
      this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
    }

    this.logAudit('update', 'Shift', cleanNew, `Turno alterado de "${cleanOld}" para "${cleanNew}" (${updatedEmployeesCount} colaboradores atualizados)`);
    this.notify();
  }

  public deleteShift(shift: string): void {
    const clean = shift.trim();
    if (this.shifts.length <= 1) {
      throw new Error('É necessário manter pelo menos um turno cadastrado.');
    }
    this.shifts = this.shifts.filter((s) => s.toLowerCase() !== clean.toLowerCase());
    this.saveItem(STORAGE_KEYS.SHIFTS, this.shifts);
    this.logAudit('delete', 'Shift', clean, `Turno excluído da lista: ${clean}`);
    this.notify();
  }

  // ATTENDANCE MATRIX
  public getAttendanceRecords(): AttendanceRecord[] {
    return [...this.attendanceRecords];
  }

  public getAttendance(employeeId: string, yearMonth: string): AttendanceRecord | undefined {
    return this.attendanceRecords.find((a) => a.employeeId === employeeId && a.yearMonth === yearMonth);
  }

  public setAttendanceCode(employeeId: string, yearMonth: string, day: number, code: AttendanceCode) {
    this.assertMonthNotClosed(yearMonth);
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error('Colaborador não encontrado.');

    let record = this.attendanceRecords.find((a) => a.employeeId === employeeId && a.yearMonth === yearMonth);

    if (!record) {
      record = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId,
        registrationNumber: emp.registrationNumber,
        yearMonth,
        dailyCodes: {},
        updatedAt: new Date().toISOString(),
        updatedBy: this.currentUser.name
      };
      this.attendanceRecords.push(record);
    }

    const previousCode = record.dailyCodes[day];

    if (code === '') {
      delete record.dailyCodes[day];
    } else {
      record.dailyCodes[day] = code;
    }
    record.updatedAt = new Date().toISOString();
    record.updatedBy = this.currentUser.name;

    this.saveItem(STORAGE_KEYS.ATTENDANCE, this.attendanceRecords);

    // Integração automática com o módulo Ocorrências de Faltas
    const absenceDate = `${yearMonth}-${String(day).padStart(2, '0')}`;

    if (code === 'F') {
      const existingReq = this.absenceRequests.find(
        (r) => r.employeeId === employeeId && r.absenceDate === absenceDate
      );

      if (!existingReq) {
        const newOccurrence: AbsenceRequest = {
          id: `abs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          requestDate: new Date().toISOString().split('T')[0],
          absenceDate,
          employeeId: emp.id,
          registrationNumber: emp.registrationNumber,
          employeeName: emp.name,
          reasonCode: 'COD06', // Falta injustificada
          reasonDescription: 'Falta injustificada',
          hourBankBalanceAtRequest: this.getEmployeeHourBankBalance(emp.id),
          status: 'pending',
          impactsAttendance: true,
          impactsHourBank: false,
          notes: `Ocorrência gerada automaticamente pelo registro de Falta (F) na Assiduidade (dia ${day}/${yearMonth}).`,
          createdAt: new Date().toISOString()
        };
        this.absenceRequests.unshift(newOccurrence);
        this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
        this.logAudit('create', 'AbsenceRequest', newOccurrence.id, `Ocorrência de Falta gerada automaticamente (F): ${emp.name} em ${absenceDate}`);
      }
    } else if (previousCode === 'F') {
      // Se antes era 'F' e foi alterado ou apagado, remove a ocorrência automática correspondente
      const autoOccurrenceIndex = this.absenceRequests.findIndex(
        (r) =>
          r.employeeId === employeeId &&
          r.absenceDate === absenceDate &&
          r.reasonCode === 'COD06' &&
          r.notes?.includes('gerada automaticamente pelo registro de Falta (F)')
      );
      if (autoOccurrenceIndex >= 0) {
        const removed = this.absenceRequests.splice(autoOccurrenceIndex, 1)[0];
        this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
        this.logAudit('delete', 'AbsenceRequest', removed.id, `Ocorrência automática de falta removida: ${emp.name} em ${absenceDate}`);
      }
    }

    // Integração automática com o módulo Ocorrências de Atrasos
    if (code === 'A') {
      const existingDelay = this.delayOccurrences.find(
        (d) => d.employeeId === employeeId && d.date === absenceDate
      );

      if (!existingDelay) {
        let expectedTime = '08:00';
        let actualTime = '08:25';

        if (emp.shift?.includes('06h')) {
          expectedTime = '06:00';
          actualTime = '06:25';
        } else if (emp.shift?.includes('14h')) {
          expectedTime = '14:00';
          actualTime = '14:25';
        } else if (emp.shift?.includes('22h')) {
          expectedTime = '22:00';
          actualTime = '22:25';
        }

        const existingInMonth = this.delayOccurrences.filter(
          (d) => d.employeeId === employeeId && d.date.startsWith(yearMonth)
        ).length;

        const newDelay: DelayOccurrence = {
          id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: absenceDate,
          employeeId: emp.id,
          registrationNumber: emp.registrationNumber,
          employeeName: emp.name,
          reasonCode: 'ATRASO',
          reasonDescription: 'Atraso injustificado',
          expectedTime,
          actualTime,
          delayMinutes: 25,
          recurrenceCountInMonth: existingInMonth + 1,
          justification: `Ocorrência gerada automaticamente pelo lançamento de Atraso (A) na Assiduidade (dia ${day}/${yearMonth}).`,
          reporter: this.currentUser.name,
          createdAt: new Date().toISOString()
        };

        this.delayOccurrences.unshift(newDelay);
        this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
        this.logAudit('create', 'DelayOccurrence', newDelay.id, `Ocorrência de Atraso gerada automaticamente (A): ${emp.name} em ${absenceDate}`);
      }
    } else if (previousCode === 'A') {
      // Se antes era 'A' e foi alterado ou apagado, remove a ocorrência automática de atraso correspondente
      const autoDelayIndex = this.delayOccurrences.findIndex(
        (d) =>
          d.employeeId === employeeId &&
          d.date === absenceDate &&
          d.justification?.includes('gerada automaticamente pelo lançamento de Atraso (A)')
      );
      if (autoDelayIndex >= 0) {
        const removed = this.delayOccurrences.splice(autoDelayIndex, 1)[0];
        this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
        this.logAudit('delete', 'DelayOccurrence', removed.id, `Ocorrência automática de atraso removida: ${emp.name} em ${absenceDate}`);
      }
    }

    this.notify();
  }

  // ABSENCE REQUESTS & WORKFLOW
  public getAbsenceRequests(): AbsenceRequest[] {
    return [...this.absenceRequests];
  }

  public addAbsenceRequest(req: Omit<AbsenceRequest, 'id' | 'createdAt'>): AbsenceRequest {
    this.assertMonthNotClosed(req.absenceDate.substring(0, 7));

    const newReq: AbsenceRequest = {
      ...req,
      id: `abs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };

    this.absenceRequests.unshift(newReq);
    this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
    this.logAudit('create', 'AbsenceRequest', newReq.id, `Solicitação de ausência: ${newReq.employeeName} (${newReq.absenceDate})`);
    this.notify();
    return newReq;
  }

  public approveAbsenceRequest(id: string, notes?: string) {
    const req = this.absenceRequests.find((r) => r.id === id);
    if (!req) throw new Error('Solicitação não encontrada.');
    this.assertMonthNotClosed(req.absenceDate.substring(0, 7));

    req.status = 'approved';
    req.authorizedBy = this.currentUser.name;
    req.authorizedAt = new Date().toISOString();
    if (notes) req.authorizationNotes = notes;

    if (req.impactsAttendance !== false) {
      const day = parseInt(req.absenceDate.split('-')[2], 10);
      const ym = req.absenceDate.substring(0, 7);
      const codeToApply: AttendanceCode = req.reasonCode === 'COD06' ? 'F' : 'J';
      this.setAttendanceCode(req.employeeId, ym, day, codeToApply);
    }

    if (req.impactsHourBank && req.reasonCode === 'COD07') {
      this.addHourBankTransaction({
        employeeId: req.employeeId,
        registrationNumber: req.registrationNumber,
        employeeName: req.employeeName,
        date: req.absenceDate,
        type: 'compensation',
        minutes: -480,
        justification: `Débito decorrente de Folga Programada Aprovada (Req #${req.id})`,
        reporter: this.currentUser.name,
        status: 'approved',
        approvedBy: this.currentUser.name,
        approvedAt: new Date().toISOString()
      });
    }

    this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
    this.logAudit('approve', 'AbsenceRequest', id, `Solicitação de ausência APROVADA para ${req.employeeName}`);
    this.notify();
  }

  public rejectAbsenceRequest(id: string, notes?: string) {
    const req = this.absenceRequests.find((r) => r.id === id);
    if (!req) throw new Error('Solicitação não encontrada.');
    this.assertMonthNotClosed(req.absenceDate.substring(0, 7));

    req.status = 'rejected';
    req.authorizedBy = this.currentUser.name;
    req.authorizedAt = new Date().toISOString();
    if (notes) req.authorizationNotes = notes;

    this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
    this.logAudit('reject', 'AbsenceRequest', id, `Solicitação de ausência REJEITADA para ${req.employeeName}`);
    this.notify();
  }

  public revertAbsenceRequest(id: string, notes?: string) {
    const req = this.absenceRequests.find((r) => r.id === id);
    if (!req) throw new Error('Solicitação não encontrada.');
    this.assertMonthNotClosed(req.absenceDate.substring(0, 7));

    const oldStatus = req.status;
    req.status = 'pending';
    req.authorizedBy = undefined;
    req.authorizedAt = undefined;
    if (notes) {
      req.authorizationNotes = notes;
    }

    // Se havia aplicado falta ou justificada na assiduidade, restaura para código vazio
    if (req.impactsAttendance !== false) {
      const day = parseInt(req.absenceDate.split('-')[2], 10);
      const ym = req.absenceDate.substring(0, 7);
      this.setAttendanceCode(req.employeeId, ym, day, '');
    }

    this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
    this.logAudit('update', 'AbsenceRequest', id, `Solicitação de ausência de ${req.employeeName} retrocedida de ${oldStatus} para Pendente`);
    this.notify();
  }

  public updateAbsenceRequest(id: string, updates: Partial<AbsenceRequest>): AbsenceRequest {
    const index = this.absenceRequests.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Solicitação não encontrada.');
    const req = this.absenceRequests[index];
    this.assertMonthNotClosed(req.absenceDate.substring(0, 7));

    const updated: AbsenceRequest = {
      ...req,
      ...updates
    };

    this.absenceRequests[index] = updated;
    this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
    this.logAudit('update', 'AbsenceRequest', id, `Solicitação de ausência de ${updated.employeeName} atualizada/editada`);
    this.notify();
    return updated;
  }

  // DELAY OCCURRENCES
  public getDelayOccurrences(): DelayOccurrence[] {
    return [...this.delayOccurrences];
  }

  public addDelayOccurrence(delay: Omit<DelayOccurrence, 'id' | 'createdAt' | 'recurrenceCountInMonth'>): DelayOccurrence {
    this.assertMonthNotClosed(delay.date.substring(0, 7));
    const ym = delay.date.substring(0, 7);

    const existingInMonth = this.delayOccurrences.filter(
      (d) => d.employeeId === delay.employeeId && d.date.startsWith(ym)
    ).length;

    const newDelay: DelayOccurrence = {
      ...delay,
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recurrenceCountInMonth: existingInMonth + 1,
      createdAt: new Date().toISOString()
    };

    this.delayOccurrences.unshift(newDelay);
    this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
    this.logAudit('create', 'DelayOccurrence', newDelay.id, `Atraso registrado: ${newDelay.employeeName} (${newDelay.delayMinutes} min)`);

    const day = parseInt(delay.date.split('-')[2], 10);
    this.setAttendanceCode(delay.employeeId, ym, day, 'A');

    this.notify();
    return newDelay;
  }

  public deleteDelayOccurrence(id: string) {
    const delay = this.delayOccurrences.find((d) => d.id === id);
    if (delay) {
      this.assertMonthNotClosed(delay.date.substring(0, 7));
      this.delayOccurrences = this.delayOccurrences.filter((d) => d.id !== id);
      this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
      this.logAudit('delete', 'DelayOccurrence', id, `Exclusão de atraso de ${delay.employeeName}`);
      this.notify();
    }
  }

  public updateDelayOccurrence(id: string, updates: Partial<DelayOccurrence>): DelayOccurrence {
    const index = this.delayOccurrences.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Apontamento de atraso não encontrado.');
    const old = this.delayOccurrences[index];
    this.assertMonthNotClosed(old.date.substring(0, 7));

    const updated: DelayOccurrence = {
      ...old,
      ...updates
    };

    if (updates.expectedTime || updates.actualTime) {
      const exp = updated.expectedTime;
      const act = updated.actualTime;
      const [expH, expM] = exp.split(':').map(Number);
      const [actH, actM] = act.split(':').map(Number);
      let totalExp = expH * 60 + expM;
      let totalAct = actH * 60 + actM;
      if (totalAct < totalExp) totalAct += 24 * 60;
      updated.delayMinutes = Math.max(0, totalAct - totalExp);
    }

    this.delayOccurrences[index] = updated;
    this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
    this.logAudit('update', 'DelayOccurrence', id, `Atraso de ${updated.employeeName} editado e atualizado (${updated.delayMinutes} min)`);
    this.notify();
    return updated;
  }

  // LUNCH CONTROL
  public getLunchIntervals(): LunchInterval[] {
    return [...this.lunchIntervals];
  }

  public addLunchInterval(lunch: Omit<LunchInterval, 'id' | 'createdAt' | 'intervalMinutes' | 'excessMinutes'>): LunchInterval {
    this.assertMonthNotClosed(lunch.date.substring(0, 7));

    const { intervalMinutes, excessMinutes } = calculateLunchInterval(
      lunch.exitTime,
      lunch.returnTime,
      lunch.allowedMinutes || this.indicatorConfig.defaultLunchMinutes
    );

    const newLunch: LunchInterval = {
      ...lunch,
      intervalMinutes,
      excessMinutes,
      id: `lnc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };

    if (excessMinutes > 0 && lunch.generatesOccurrence) {
      this.addHourBankTransaction({
        employeeId: lunch.employeeId,
        registrationNumber: lunch.registrationNumber,
        employeeName: lunch.employeeName,
        date: lunch.date,
        type: 'occurrence_discount',
        minutes: -excessMinutes,
        justification: `Desconto automático: Excedente de almoço de ${excessMinutes} min em ${lunch.date}`,
        reporter: 'Sistema',
        status: 'approved',
        approvedBy: 'Sistema',
        approvedAt: new Date().toISOString()
      });
    }

    this.lunchIntervals.unshift(newLunch);
    this.saveItem(STORAGE_KEYS.LUNCH_INTERVALS, this.lunchIntervals);
    this.logAudit('create', 'LunchInterval', newLunch.id, `Intervalo de almoço para ${newLunch.employeeName} (${newLunch.intervalMinutes} min, Excedente: ${newLunch.excessMinutes} min)`);
    this.notify();
    return newLunch;
  }

  public deleteLunchInterval(id: string) {
    const item = this.lunchIntervals.find((l) => l.id === id);
    if (item) {
      this.assertMonthNotClosed(item.date.substring(0, 7));
      this.lunchIntervals = this.lunchIntervals.filter((l) => l.id !== id);
      this.saveItem(STORAGE_KEYS.LUNCH_INTERVALS, this.lunchIntervals);
      this.logAudit('delete', 'LunchInterval', id, `Exclusão de registro de intervalo de almoço`);
      this.notify();
    }
  }

  public updateLunchInterval(id: string, updates: Partial<LunchInterval>): LunchInterval {
    const index = this.lunchIntervals.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Registro de intervalo não encontrado.');
    const old = this.lunchIntervals[index];
    this.assertMonthNotClosed(old.date.substring(0, 7));

    const updated: LunchInterval = {
      ...old,
      ...updates
    };

    const { intervalMinutes, excessMinutes } = calculateLunchInterval(
      updated.exitTime,
      updated.returnTime,
      updated.allowedMinutes || this.indicatorConfig.defaultLunchMinutes
    );
    updated.intervalMinutes = intervalMinutes;
    updated.excessMinutes = excessMinutes;

    this.lunchIntervals[index] = updated;
    this.saveItem(STORAGE_KEYS.LUNCH_INTERVALS, this.lunchIntervals);
    this.logAudit('update', 'LunchInterval', id, `Intervalo de almoço de ${updated.employeeName} editado e atualizado`);
    this.notify();
    return updated;
  }

  // HOUR BANK
  public getHourBankTransactions(): HourBankTransaction[] {
    return [...this.hourBankTransactions];
  }

  public addHourBankTransaction(tx: Omit<HourBankTransaction, 'id' | 'createdAt'>): HourBankTransaction {
    this.assertMonthNotClosed(tx.date.substring(0, 7));

    const newTx: HourBankTransaction = {
      ...tx,
      id: `hb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };

    this.hourBankTransactions.unshift(newTx);
    this.saveItem(STORAGE_KEYS.HOUR_BANK, this.hourBankTransactions);
    this.logAudit('create', 'HourBankTransaction', newTx.id, `Lançamento de banco de horas: ${newTx.employeeName} (${newTx.minutes} min)`);
    this.notify();
    return newTx;
  }

  public approveHourBankTransaction(id: string) {
    const tx = this.hourBankTransactions.find((t) => t.id === id);
    if (!tx) throw new Error('Transação não encontrada.');
    this.assertMonthNotClosed(tx.date.substring(0, 7));

    tx.status = 'approved';
    tx.approvedBy = this.currentUser.name;
    tx.approvedAt = new Date().toISOString();

    this.saveItem(STORAGE_KEYS.HOUR_BANK, this.hourBankTransactions);
    this.logAudit('approve', 'HourBankTransaction', id, `Transação de banco de horas APROVADA para ${tx.employeeName}`);
    this.notify();
  }

  public getEmployeeHourBankBalance(employeeId: string, upToDate?: string): number {
    return this.hourBankTransactions
      .filter((t) => t.employeeId === employeeId && t.status === 'approved')
      .filter((t) => (!upToDate ? true : t.date <= upToDate))
      .reduce((acc, t) => acc + t.minutes, 0);
  }

  // CONFIGURATION & TARGETS
  public getConfig(): IndicatorConfig {
    return { ...this.indicatorConfig };
  }

  public updateConfig(updates: Partial<IndicatorConfig>) {
    const updated: IndicatorConfig = {
      ...this.indicatorConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUser.name
    };
    updated.combinedTarget = Number(
      (
        updated.attendanceTarget *
        updated.punctualityTarget *
        updated.lunchComplianceTarget
      ).toFixed(5)
    );

    this.indicatorConfig = updated;
    this.saveItem(STORAGE_KEYS.CONFIG, this.indicatorConfig);
    this.logAudit('config_change', 'IndicatorConfig', 'default_config', `Metas e parâmetros do sistema alterados`);
    this.notify();
  }

  // COLLECTIVE INDICATORS
  public getCollectiveIndicators(): CollectiveIndicator[] {
    return [...this.collectiveIndicators];
  }

  public setCollectiveIndicator(team: string, yearMonth: string, score: number, description: string) {
    const index = this.collectiveIndicators.findIndex((c) => c.team === team && c.yearMonth === yearMonth);
    const now = new Date().toISOString();

    if (index >= 0) {
      this.collectiveIndicators[index] = {
        ...this.collectiveIndicators[index],
        score,
        methodologyDescription: description,
        updatedAt: now,
        updatedBy: this.currentUser.name
      };
    } else {
      this.collectiveIndicators.push({
        id: `col_${Date.now()}`,
        team,
        yearMonth,
        score,
        methodologyDescription: description,
        updatedAt: now,
        updatedBy: this.currentUser.name
      });
    }

    this.saveItem(STORAGE_KEYS.COLLECTIVE, this.collectiveIndicators);
    this.notify();
  }

  // MONTHLY CLOSING
  public getMonthlyClosings(): MonthlyClosing[] {
    return [...this.monthlyClosings];
  }

  public closeMonth(yearMonth: string) {
    const existing = this.monthlyClosings.find((c) => c.yearMonth === yearMonth);
    const now = new Date().toISOString();

    if (existing) {
      existing.isClosed = true;
      existing.closedAt = now;
      existing.closedBy = this.currentUser.name;
    } else {
      this.monthlyClosings.push({
        id: `close_${yearMonth.replace('-', '_')}`,
        yearMonth,
        isClosed: true,
        closedAt: now,
        closedBy: this.currentUser.name
      });
    }

    this.saveItem(STORAGE_KEYS.CLOSINGS, this.monthlyClosings);
    this.logAudit('close_month', 'MonthlyClosing', yearMonth, `Fechamento do mês ${yearMonth} realizado por ${this.currentUser.name}`);
    this.notify();
  }

  public reopenMonth(yearMonth: string, justification?: string) {
    const finalReason =
      justification && justification.trim().length >= 3
        ? justification.trim()
        : 'Reabertura formal autorizada para apuração de ponto e ajustes.';

    const existing = this.monthlyClosings.find((c) => c.yearMonth === yearMonth);
    const now = new Date().toISOString();
    const actorName = this.currentUser?.name || 'Administrador do Sistema';

    if (existing) {
      existing.isClosed = false;
      existing.reopenedAt = now;
      existing.reopenedBy = actorName;
      existing.reopenReason = finalReason;
    } else {
      this.monthlyClosings.push({
        id: `close_${yearMonth.replace('-', '_')}`,
        yearMonth,
        isClosed: false,
        reopenedAt: now,
        reopenedBy: actorName,
        reopenReason: finalReason
      });
    }

    this.saveItem(STORAGE_KEYS.CLOSINGS, this.monthlyClosings);
    this.logAudit('reopen_month', 'MonthlyClosing', yearMonth, `Reabertura do mês ${yearMonth}. Justificativa: ${finalReason}`);
    this.notify();
  }

  /**
   * Retorna todos os períodos disponíveis com seus status de fechamento,
   * servindo como fonte única da verdade para seletores globais e telas de configuração.
   */
  public getAvailablePeriods(): { value: string; label: string; isClosed: boolean }[] {
    const defaultPeriods = ['2026-11', '2026-10', '2026-09', '2026-08'];
    const fromClosings = this.monthlyClosings.map((c) => c.yearMonth);
    const fromAtt = this.attendanceRecords.map((a) => a.yearMonth);
    const fromDelays = this.delayOccurrences.map((d) => d.date.substring(0, 7));
    const fromLunch = this.lunchIntervals.map((l) => l.date.substring(0, 7));
    const fromHb = this.hourBankTransactions.map((h) => h.date.substring(0, 7));

    const allPeriods = Array.from(
      new Set([
        ...defaultPeriods,
        ...fromClosings,
        ...fromAtt,
        ...fromDelays,
        ...fromLunch,
        ...fromHb
      ])
    ).filter((p) => /^\d{4}-\d{2}$/.test(p));

    allPeriods.sort().reverse();

    const monthNames: Record<string, string> = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro'
    };

    return allPeriods.map((ym) => {
      const isClosed = this.isMonthClosed(ym);
      const [year, month] = ym.split('-');
      const name = monthNames[month] || month;
      return {
        value: ym,
        label: `${name} / ${year} (${isClosed ? 'Fechado' : 'Aberto'})`,
        isClosed
      };
    });
  }

  // AUDIT LOGS
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // NOTIFICATIONS GENERATOR
  public getSystemNotifications(): NotificationItem[] {
    const notifications: NotificationItem[] = [];

    const pendingAbs = this.absenceRequests.filter((r) => r.status === 'pending');
    if (pendingAbs.length > 0) {
      notifications.push({
        id: 'notif_pending_abs',
        type: 'warning',
        title: 'Solicitações Pendentes',
        message: `Existem ${pendingAbs.length} solicitações de ausência aguardando aprovação gerencial.`,
        date: new Date().toISOString(),
        read: false,
        linkModule: 'absence'
      });
    }

    const activeEmps = this.employees.filter((e) => e.status === 'active');
    let negativeCount = 0;
    activeEmps.forEach((emp) => {
      if (this.getEmployeeHourBankBalance(emp.id) < 0) {
        negativeCount++;
      }
    });
    if (negativeCount > 0) {
      notifications.push({
        id: 'notif_neg_hours',
        type: 'alert',
        title: 'Saldos Devedores no Banco de Horas',
        message: `${negativeCount} colaborador(es) ativo(s) apresentam saldo devedor de banco de horas.`,
        date: new Date().toISOString(),
        read: false,
        linkModule: 'hour_bank'
      });
    }

    const currentYM = new Date().toISOString().substring(0, 7);
    const delayCounts: Record<string, number> = {};
    this.delayOccurrences
      .filter((d) => d.date.startsWith(currentYM))
      .forEach((d) => {
        delayCounts[d.employeeId] = (delayCounts[d.employeeId] || 0) + 1;
      });
    const reincidentEmps = Object.keys(delayCounts).filter((id) => delayCounts[id] >= 2);
    if (reincidentEmps.length > 0) {
      notifications.push({
        id: 'notif_reincident_delays',
        type: 'alert',
        title: 'Reincidência de Atrasos',
        message: `${reincidentEmps.length} colaborador(es) acumularam 2 ou mais atrasos em ${currentYM}.`,
        date: new Date().toISOString(),
        read: false,
        linkModule: 'delays'
      });
    }

    return notifications;
  }

  // CONSOLIDATED IEEI CALCULATOR ENGINE (Frequência, Pontualidade e Almoço)
  public calculateEmployeeIEEI(employeeId: string, yearMonth: string): IEEICalculationResult {
    const emp = this.getEmployeeById(employeeId);
    const empName = emp ? emp.name : 'Desconhecido';
    const regNum = emp ? emp.registrationNumber : '';
    const team = emp ? emp.team : '';
    const sector = emp ? (emp.sector || emp.team || 'Geral') : 'Geral';

    // 1. Assiduidade / Frequência
    const attRecord = this.getAttendance(employeeId, yearMonth);
    const attStats = calculateAssiduity(attRecord?.dailyCodes);
    const attendance = attStats.frequencyPercent;

    // 2. Pontualidade
    const delaysInMonth = this.delayOccurrences.filter(
      (d) => d.employeeId === employeeId && d.date.startsWith(yearMonth)
    );
    const workedDays = (attStats.present || 0) + (attStats.delayed || 0) + (attStats.earlyExit || 0);
    const punctuality = calculatePunctuality(workedDays, delaysInMonth.length);
    const totalDelayMinutes = delaysInMonth.reduce((acc, d) => acc + d.delayMinutes, 0);

    // 3. Conformidade de Intervalo de Almoço
    const lunchInMonth = this.lunchIntervals.filter(
      (l) => l.employeeId === employeeId && l.date.startsWith(yearMonth)
    );
    const excessLunches = lunchInMonth.filter((l) => l.excessMinutes > 0);
    const lunchCompliance = calculateLunchCompliance(lunchInMonth.length, excessLunches.length);
    const totalLunchExcessMinutes = lunchInMonth.reduce((acc, l) => acc + l.excessMinutes, 0);

    // Executar cálculo IEEI
    const baseCalc = calculateIEEI(attendance, punctuality, lunchCompliance, this.indicatorConfig);

    // Obter coletivo para o setor ou equipe
    const collectiveInd = this.collectiveIndicators.find(
      (c) => (c.team === sector || c.team === team) && c.yearMonth === yearMonth
    ) || this.collectiveIndicators.find((c) => c.yearMonth === yearMonth);
    const collectiveScore = collectiveInd ? collectiveInd.score : null;
    const finalWeightedScore = calculateFinalResult(
      baseCalc.ieeiScore,
      collectiveScore,
      this.indicatorConfig.individualWeight,
      this.indicatorConfig.collectiveWeight
    );

    const hbBalance = this.getEmployeeHourBankBalance(employeeId);

    return {
      employeeId,
      registrationNumber: regNum,
      employeeName: empName,
      team,
      sector,
      yearMonth,
      attendance,
      punctuality,
      lunchCompliance,
      ieeiScore: baseCalc.ieeiScore,
      targetScore: baseCalc.targetScore,
      isGoalMet: baseCalc.isGoalMet,
      status: baseCalc.status,
      missingComponents: baseCalc.missingComponents,
      attendanceMet: baseCalc.attendanceMet,
      punctualityMet: baseCalc.punctualityMet,
      lunchComplianceMet: baseCalc.lunchComplianceMet,
      bottleneckComponent: baseCalc.bottleneckComponent,
      presentDays: attStats.present,
      absentDays: attStats.absent,
      delayDays: attStats.delayed,
      earlyExitDays: attStats.earlyExit,
      justifiedDays: attStats.justified,
      totalDelayMinutes,
      totalLunchExcessMinutes,
      hourBankBalanceMinutes: hbBalance,
      collectiveScore: collectiveScore || undefined,
      finalWeightedScore: finalWeightedScore || undefined
    };
  }

  // MODO DEMONSTRAÇÃO E RESET
  public getIsDemoMode(): boolean {
    return this.isDemoMode;
  }

  public setDemoMode(val: boolean) {
    this.isDemoMode = val;
    this.notify();
  }

  public resetAllToDemo() {
    this.employees = INITIAL_EMPLOYEES;
    this.attendanceRecords = INITIAL_ATTENDANCE;
    this.absenceRequests = INITIAL_ABSENCE_REQUESTS;
    this.delayOccurrences = INITIAL_DELAY_OCCURRENCES;
    this.lunchIntervals = INITIAL_LUNCH_INTERVALS;
    this.hourBankTransactions = INITIAL_HOUR_BANK;
    this.indicatorConfig = DEFAULT_CONFIG;
    this.collectiveIndicators = INITIAL_COLLECTIVE_INDICATORS;
    this.monthlyClosings = INITIAL_MONTHLY_CLOSINGS;
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.users = INITIAL_USERS;
    this.roles = DEFAULT_ROLES;
    this.sectors = DEFAULT_SECTORS;
    this.shifts = DEFAULT_SHIFTS;

    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    this.isDemoMode = true;
    this.notify();
  }

  // BACKUP & RESTORE
  public exportFullBackupJSON(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      exportedBy: this.currentUser.name,
      data: {
        employees: this.employees,
        attendanceRecords: this.attendanceRecords,
        absenceRequests: this.absenceRequests,
        delayOccurrences: this.delayOccurrences,
        lunchIntervals: this.lunchIntervals,
        hourBankTransactions: this.hourBankTransactions,
        indicatorConfig: this.indicatorConfig,
        collectiveIndicators: this.collectiveIndicators,
        monthlyClosings: this.monthlyClosings,
        auditLogs: this.auditLogs,
        users: this.users,
        roles: this.roles,
        sectors: this.sectors,
        shifts: this.shifts
      }
    };
    return JSON.stringify(backup, null, 2);
  }

  public importBackupJSON(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.data) throw new Error('Formato de backup inválido.');

      if (parsed.data.employees) this.employees = parsed.data.employees;
      if (parsed.data.attendanceRecords) this.attendanceRecords = parsed.data.attendanceRecords;
      if (parsed.data.absenceRequests) this.absenceRequests = parsed.data.absenceRequests;
      if (parsed.data.delayOccurrences) this.delayOccurrences = parsed.data.delayOccurrences;
      if (parsed.data.lunchIntervals) this.lunchIntervals = parsed.data.lunchIntervals;
      if (parsed.data.hourBankTransactions) this.hourBankTransactions = parsed.data.hourBankTransactions;
      if (parsed.data.indicatorConfig) this.indicatorConfig = parsed.data.indicatorConfig;
      if (parsed.data.collectiveIndicators) this.collectiveIndicators = parsed.data.collectiveIndicators;
      if (parsed.data.monthlyClosings) this.monthlyClosings = parsed.data.monthlyClosings;
      if (parsed.data.users) this.users = parsed.data.users;
      if (parsed.data.roles) this.roles = parsed.data.roles;
      if (parsed.data.sectors) this.sectors = parsed.data.sectors;
      if (parsed.data.shifts) this.shifts = parsed.data.shifts;

      this.saveItem(STORAGE_KEYS.EMPLOYEES, this.employees);
      this.saveItem(STORAGE_KEYS.ATTENDANCE, this.attendanceRecords);
      this.saveItem(STORAGE_KEYS.ABSENCE_REQUESTS, this.absenceRequests);
      this.saveItem(STORAGE_KEYS.DELAY_OCCURRENCES, this.delayOccurrences);
      this.saveItem(STORAGE_KEYS.LUNCH_INTERVALS, this.lunchIntervals);
      this.saveItem(STORAGE_KEYS.HOUR_BANK, this.hourBankTransactions);
      this.saveItem(STORAGE_KEYS.CONFIG, this.indicatorConfig);
      this.saveItem(STORAGE_KEYS.COLLECTIVE, this.collectiveIndicators);
      this.saveItem(STORAGE_KEYS.CLOSINGS, this.monthlyClosings);
      this.saveItem(STORAGE_KEYS.USERS, this.users);
      this.saveItem(STORAGE_KEYS.ROLES, this.roles);
      this.saveItem(STORAGE_KEYS.SECTORS, this.sectors);
      this.saveItem(STORAGE_KEYS.SHIFTS, this.shifts);

      this.logAudit('import', 'SystemBackup', 'all', 'Restauração de backup do sistema concluída com sucesso');
      this.notify();
    } catch (e: any) {
      throw new Error(`Falha ao restaurar backup: ${e.message}`);
    }
  }
}

export const dataStorage = new DataStorageService();
