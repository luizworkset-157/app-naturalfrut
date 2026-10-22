import {
  Employee,
  AttendanceRecord,
  AbsenceRequest,
  DelayOccurrence,
  LunchInterval,
  HourBankTransaction,
  MonthlyClosing,
  AuditLog,
  UserProfile,
  CollectiveIndicator
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin',
    name: 'Luiz Fernando (Administrador)',
    email: 'luiz.workset@gmail.com',
    role: 'admin',
    team: 'Diretoria Operacional',
    sector: 'Operações'
  },
  {
    id: 'user_gestor',
    name: 'Roberto Camargo (Gestor)',
    email: 'gestor.roberto@empresa.com.br',
    role: 'manager',
    team: 'Gestão de Pessoas',
    sector: 'Recursos Humanos'
  },
  {
    id: 'user_supervisor',
    name: 'Aline Barbosa (Supervisora)',
    email: 'supervisora.aline@empresa.com.br',
    role: 'supervisor',
    team: 'Operacional',
    sector: 'Operações'
  },
  {
    id: 'user_operador',
    name: 'Carlos Eduardo (Colaborador)',
    email: 'carlos.silva@empresa.com.br',
    role: 'operator',
    team: 'Operacional',
    sector: 'Operações'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp_001',
    registrationNumber: '00102',
    name: 'Carlos Eduardo Silva',
    role: 'Técnico Especialista',
    team: 'Operações',
    sector: 'Operações',
    supervisor: 'Aline Barbosa',
    shift: '1º Turno (06h - 14h)',
    admissionDate: '2023-03-15',
    status: 'active',
    notes: 'Colaborador com alta pontualidade e assiduidade.',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z'
  },
  {
    id: 'emp_002',
    registrationNumber: '00105',
    name: 'Mariana Souza Santos',
    role: 'Analista de Operações',
    team: 'Planejamento',
    sector: 'Planejamento',
    supervisor: 'Aline Barbosa',
    shift: '1º Turno (06h - 14h)',
    admissionDate: '2023-06-01',
    status: 'active',
    notes: 'Excelente controle de jornada e compensações.',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z'
  },
  {
    id: 'emp_003',
    registrationNumber: '00114',
    name: 'Lucas Ferreira Guimarães',
    role: 'Assistente Operacional',
    team: 'Logística',
    sector: 'Logística',
    supervisor: 'Marcos Vinicius',
    shift: '2º Turno (14h - 22h)',
    admissionDate: '2024-01-10',
    status: 'active',
    notes: 'Atenção aos horários de entrada e intervalos.',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z'
  },
  {
    id: 'emp_004',
    registrationNumber: '00122',
    name: 'Juliana Rocha Ribeiro',
    role: 'Inspetora de Processos',
    team: 'Qualidade',
    sector: 'Qualidade',
    supervisor: 'Marcos Vinicius',
    shift: '1º Turno (06h - 14h)',
    admissionDate: '2022-11-20',
    status: 'active',
    notes: 'Registro impecável de presença.',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z'
  },
  {
    id: 'emp_005',
    registrationNumber: '00130',
    name: 'Rafael Alves Lima',
    role: 'Técnico de Manutenção',
    team: 'Manutenção',
    sector: 'Manutenção',
    supervisor: 'Renata Campos',
    shift: '2º Turno (14h - 22h)',
    admissionDate: '2023-08-14',
    status: 'active',
    notes: 'Saldo positivo consistente no banco de horas.',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z'
  },
  {
    id: 'emp_006',
    registrationNumber: '00145',
    name: 'Patrícia Mendes Costa',
    role: 'Supervisora de Turno',
    team: 'Expedição',
    sector: 'Expedição',
    supervisor: 'Renata Campos',
    shift: '1º Turno (06h - 14h)',
    admissionDate: '2024-02-01',
    status: 'active',
    notes: '100% de assiduidade.',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-01T08:00:00Z'
  },
  {
    id: 'emp_007',
    registrationNumber: '00150',
    name: 'Bruno Henrique Dias',
    role: 'Especialista Técnico',
    team: 'Operações',
    sector: 'Operações',
    supervisor: 'Aline Barbosa',
    shift: '1º Turno (06h - 14h)',
    admissionDate: '2021-05-18',
    status: 'vacation',
    notes: 'Em período de férias regulamentares.',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z'
  }
];

// Presença dos funcionários no mês de outubro de 2026
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att_001',
    employeeId: 'emp_001',
    registrationNumber: '00102',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'P', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Aline Barbosa'
  },
  {
    id: 'att_002',
    employeeId: 'emp_002',
    registrationNumber: '00105',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'P', 6: 'A', 7: 'P', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'P', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Aline Barbosa'
  },
  {
    id: 'att_003',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'F', 6: 'P', 7: 'P', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'A', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Marcos Vinicius'
  },
  {
    id: 'att_004',
    employeeId: 'emp_004',
    registrationNumber: '00122',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'P', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Marcos Vinicius'
  },
  {
    id: 'att_005',
    employeeId: 'emp_005',
    registrationNumber: '00130',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'P', 6: 'P', 7: 'J', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'P', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Renata Campos'
  },
  {
    id: 'att_006',
    employeeId: 'emp_006',
    registrationNumber: '00145',
    yearMonth: '2026-10',
    dailyCodes: {
      1: 'P', 2: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P',
      12: 'P', 13: 'P', 14: 'P', 15: 'P', 16: 'P', 19: 'P', 20: 'P', 21: 'P'
    },
    updatedAt: '2026-10-21T08:00:00Z',
    updatedBy: 'Renata Campos'
  }
];

export const INITIAL_ABSENCE_REQUESTS: AbsenceRequest[] = [
  {
    id: 'abs_001',
    requestDate: '2026-10-06',
    absenceDate: '2026-10-07',
    employeeId: 'emp_005',
    registrationNumber: '00130',
    employeeName: 'Rafael Alves Lima',
    reasonCode: 'COD01',
    reasonDescription: 'Problemas de saúde com atestado',
    hourBankBalanceAtRequest: 180,
    status: 'approved',
    authorizedBy: 'Roberto Camargo',
    authorizedAt: '2026-10-07T09:00:00Z',
    authorizationNotes: 'Atestado médico anexado de 1 dia.',
    impactsHourBank: false,
    impactsAttendance: true,
    createdAt: '2026-10-06T14:20:00Z'
  },
  {
    id: 'abs_002',
    requestDate: '2026-10-18',
    absenceDate: '2026-10-24',
    employeeId: 'emp_001',
    registrationNumber: '00102',
    employeeName: 'Carlos Eduardo Silva',
    reasonCode: 'COD07',
    reasonDescription: 'Folga programada',
    hourBankBalanceAtRequest: 480,
    status: 'pending',
    notes: 'Compensação de horas acumuladas no sábado anterior.',
    impactsHourBank: true,
    impactsAttendance: true,
    createdAt: '2026-10-18T10:15:00Z'
  },
  {
    id: 'abs_003',
    requestDate: '2026-10-04',
    absenceDate: '2026-10-05',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    reasonCode: 'COD06',
    reasonDescription: 'Falta injustificada',
    hourBankBalanceAtRequest: -60,
    status: 'rejected',
    authorizedBy: 'Roberto Camargo',
    authorizedAt: '2026-10-06T11:00:00Z',
    authorizationNotes: 'Sem comprovação apresentada no prazo regulamentar.',
    impactsHourBank: true,
    impactsAttendance: true,
    createdAt: '2026-10-04T16:00:00Z'
  }
];

export const INITIAL_DELAY_OCCURRENCES: DelayOccurrence[] = [
  {
    id: 'del_001',
    date: '2026-10-06',
    employeeId: 'emp_002',
    registrationNumber: '00105',
    employeeName: 'Mariana Souza Santos',
    reasonCode: 'COD04',
    reasonDescription: 'Condições climáticas / Bloqueio na via',
    expectedTime: '06:00',
    actualTime: '06:22',
    delayMinutes: 22,
    recurrenceCountInMonth: 1,
    justification: 'Alagamento na rodovia de acesso.',
    reporter: 'Aline Barbosa',
    createdAt: '2026-10-06T06:30:00Z'
  },
  {
    id: 'del_002',
    date: '2026-10-19',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    reasonCode: 'COD03',
    reasonDescription: 'Problemas pessoais',
    expectedTime: '14:00',
    actualTime: '14:38',
    delayMinutes: 38,
    recurrenceCountInMonth: 2,
    justification: 'Problema mecânico no transporte particular.',
    reporter: 'Marcos Vinicius',
    createdAt: '2026-10-19T14:45:00Z'
  }
];

export const INITIAL_LUNCH_INTERVALS: LunchInterval[] = [
  {
    id: 'lnc_001',
    date: '2026-10-15',
    employeeId: 'emp_001',
    registrationNumber: '00102',
    employeeName: 'Carlos Eduardo Silva',
    exitTime: '11:30',
    returnTime: '12:30',
    intervalMinutes: 60,
    allowedMinutes: 60,
    excessMinutes: 0,
    justification: 'Intervalo cumprido rigorosamente dentro da tolerância.',
    generatesOccurrence: false,
    createdAt: '2026-10-15T12:35:00Z'
  },
  {
    id: 'lnc_002',
    date: '2026-10-16',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    exitTime: '18:00',
    returnTime: '19:18',
    intervalMinutes: 78,
    allowedMinutes: 60,
    excessMinutes: 18,
    justification: 'Fila prolongada no refeitório externo.',
    generatesOccurrence: true,
    createdAt: '2026-10-16T19:20:00Z'
  },
  {
    id: 'lnc_003',
    date: '2026-10-17',
    employeeId: 'emp_002',
    registrationNumber: '00105',
    employeeName: 'Mariana Souza Santos',
    exitTime: '11:45',
    returnTime: '12:45',
    intervalMinutes: 60,
    allowedMinutes: 60,
    excessMinutes: 0,
    justification: 'Pontual.',
    generatesOccurrence: false,
    createdAt: '2026-10-17T12:50:00Z'
  }
];

export const INITIAL_HOUR_BANK: HourBankTransaction[] = [
  {
    id: 'hb_001',
    employeeId: 'emp_001',
    registrationNumber: '00102',
    employeeName: 'Carlos Eduardo Silva',
    date: '2026-10-01',
    type: 'initial_balance',
    minutes: 360, // +6h
    justification: 'Saldo inicial transferido da planilha histórica de Setembro/2026.',
    reporter: 'Roberto Camargo',
    status: 'approved',
    approvedBy: 'Roberto Camargo',
    approvedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'hb_002',
    employeeId: 'emp_001',
    registrationNumber: '00102',
    employeeName: 'Carlos Eduardo Silva',
    date: '2026-10-10',
    type: 'overtime',
    minutes: 120, // +2h
    justification: 'Horas extras na cobertura de turno operacional.',
    reporter: 'Aline Barbosa',
    status: 'approved',
    approvedBy: 'Roberto Camargo',
    approvedAt: '2026-10-11T10:00:00Z',
    createdAt: '2026-10-10T16:00:00Z'
  },
  {
    id: 'hb_003',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    date: '2026-10-01',
    type: 'initial_balance',
    minutes: 60, // +1h
    justification: 'Saldo de abertura do período.',
    reporter: 'Roberto Camargo',
    status: 'approved',
    approvedBy: 'Roberto Camargo',
    approvedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'hb_004',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    date: '2026-10-16',
    type: 'occurrence_discount',
    minutes: -18,
    justification: 'Débito automático proveniente de excedente de intervalo de almoço.',
    reporter: 'Sistema',
    status: 'approved',
    approvedBy: 'Sistema',
    approvedAt: '2026-10-16T19:20:00Z',
    createdAt: '2026-10-16T19:20:00Z'
  },
  {
    id: 'hb_005',
    employeeId: 'emp_003',
    registrationNumber: '00114',
    employeeName: 'Lucas Ferreira Guimarães',
    date: '2026-10-19',
    type: 'debit',
    minutes: -38,
    justification: 'Atraso de entrada registrado no dia 19/10.',
    reporter: 'Marcos Vinicius',
    status: 'approved',
    approvedBy: 'Roberto Camargo',
    approvedAt: '2026-10-20T08:30:00Z',
    createdAt: '2026-10-19T14:45:00Z'
  },
  {
    id: 'hb_006',
    employeeId: 'emp_002',
    registrationNumber: '00105',
    employeeName: 'Mariana Souza Santos',
    date: '2026-10-01',
    type: 'initial_balance',
    minutes: 180, // +3h
    justification: 'Saldo anterior aprovado.',
    reporter: 'Roberto Camargo',
    status: 'approved',
    approvedBy: 'Roberto Camargo',
    approvedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z'
  }
];

export const INITIAL_COLLECTIVE_INDICATORS: CollectiveIndicator[] = [
  {
    id: 'col_001',
    yearMonth: '2026-10',
    team: 'Operações',
    score: 0.952, // 95,2%
    methodologyDescription: 'Índice Coletivo de Assiduidade e Cumprimento de Jornada do Setor Operações.',
    updatedAt: '2026-10-20T10:00:00Z',
    updatedBy: 'Roberto Camargo'
  },
  {
    id: 'col_002',
    yearMonth: '2026-10',
    team: 'Logística',
    score: 0.918, // 91,8%
    methodologyDescription: 'Índice Coletivo de Frequência e Pontualidade do Setor Logística.',
    updatedAt: '2026-10-20T10:00:00Z',
    updatedBy: 'Roberto Camargo'
  },
  {
    id: 'col_003',
    yearMonth: '2026-10',
    team: 'Qualidade',
    score: 0.945, // 94,5%
    methodologyDescription: 'Índice Coletivo de Regularidade e Pontualidade do Setor Qualidade.',
    updatedAt: '2026-10-20T10:00:00Z',
    updatedBy: 'Roberto Camargo'
  }
];

export const INITIAL_MONTHLY_CLOSINGS: MonthlyClosing[] = [
  {
    id: 'close_2026_09',
    yearMonth: '2026-09',
    isClosed: true,
    closedAt: '2026-10-02T18:00:00Z',
    closedBy: 'Luiz Fernando (Administrador)',
    reopenReason: undefined
  },
  {
    id: 'close_2026_10',
    yearMonth: '2026-10',
    isClosed: false
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_001',
    timestamp: '2026-10-02T18:00:00Z',
    userId: 'user_admin',
    userName: 'Luiz Fernando (Administrador)',
    userRole: 'admin',
    action: 'close_month',
    entity: 'MonthlyClosing',
    entityId: 'close_2026_09',
    details: 'Fechamento do mês 2026-09 com bloqueio de edições para apuração de ponto.'
  },
  {
    id: 'aud_002',
    timestamp: '2026-10-07T09:00:00Z',
    userId: 'user_gestor',
    userName: 'Roberto Camargo (Gestor)',
    userRole: 'manager',
    action: 'approve',
    entity: 'AbsenceRequest',
    entityId: 'abs_001',
    details: 'Aprovação de solicitação de ausência COD01 para Rafael Alves Lima.'
  },
  {
    id: 'aud_003',
    timestamp: '2026-10-15T12:35:00Z',
    userId: 'user_supervisor',
    userName: 'Aline Barbosa (Supervisora)',
    userRole: 'supervisor',
    action: 'create',
    entity: 'LunchInterval',
    entityId: 'lnc_001',
    details: 'Apontamento de intervalo de almoço regular para Carlos Eduardo Silva.'
  }
];
