import React, { useState, useMemo, useEffect } from 'react';
import {
  UserX,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Edit2
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { AbsenceRequest, RequestStatus } from '../../types';
import { formatMinutesToHHMM, formatDateBR } from '../../utils/calculations';
import { exportToExcel } from '../../services/excelService';

interface AbsenceRequestsViewProps {
  selectedYearMonth: string;
}

export const REASON_CODES: Record<string, string> = {
  COD01: 'Problemas de saúde com atestado',
  COD02: 'Problemas de saúde sem atestado',
  COD03: 'Problemas pessoais',
  COD04: 'Condições climáticas / Vias interditadas',
  COD05: 'Falta justificada legal (Casamento, Luto, Doação Sangue)',
  COD06: 'Falta injustificada',
  COD07: 'Folga programada (Compensação banco de horas)'
};

export const AbsenceRequestsView: React.FC<AbsenceRequestsViewProps> = ({ selectedYearMonth }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal de Aprovação / Rejeição
  const [approvalModalReq, setApprovalModalReq] = useState<AbsenceRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Modal de Retrocesso de Situação
  const [revertModalReq, setRevertModalReq] = useState<AbsenceRequest | null>(null);
  const [revertNotes, setRevertNotes] = useState('');

  // Modal de Edição Completa da Solicitação
  const [editingRequest, setEditingRequest] = useState<AbsenceRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    absenceDate: '',
    requestDate: '',
    reasonCode: 'COD01',
    impactsHourBank: false,
    impactsAttendance: true,
    status: 'pending' as RequestStatus,
    notes: '',
    authorizationNotes: ''
  });

  const [employees, setEmployees] = useState(() => dataStorage.getEmployees().filter((e) => e.status === 'active'));
  const [requests, setRequests] = useState(() => dataStorage.getAbsenceRequests());

  useEffect(() => {
    const unsub = dataStorage.subscribe(() => {
      setEmployees(dataStorage.getEmployees().filter((e) => e.status === 'active'));
      setRequests(dataStorage.getAbsenceRequests());
    });
    return unsub;
  }, []);

  const currentUser = dataStorage.getCurrentUser();
  const isMonthClosed = dataStorage.isMonthClosed(selectedYearMonth);
  const canApprove = (currentUser.role === 'admin' || currentUser.role === 'manager') && !isMonthClosed;
  const canCreate = !isMonthClosed && currentUser.role !== 'operator';
  const canEdit = !isMonthClosed && currentUser.role !== 'operator';

  // Form State Novo
  const [formData, setFormData] = useState({
    requestDate: new Date().toISOString().split('T')[0],
    absenceDate: `${selectedYearMonth}-15`,
    employeeId: employees[0]?.id || '',
    reasonCode: 'COD01',
    impactsHourBank: false,
    impactsAttendance: true,
    notes: ''
  });

  const filtered = useMemo(() => {
    return requests
      .filter((r) => r.absenceDate.startsWith(selectedYearMonth))
      .filter((r) => {
        if (searchTerm) {
          const clean = searchTerm.toLowerCase();
          const matchColab = r.employeeName.toLowerCase().includes(clean);
          const matchReg = r.registrationNumber.toLowerCase().includes(clean);
          if (!matchColab && !matchReg) return false;
        }
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterReason !== 'all' && r.reasonCode !== filterReason) return false;
        return true;
      });
  }, [requests, selectedYearMonth, searchTerm, filterStatus, filterReason]);

  const handleOpenAdd = () => {
    setFormData({
      requestDate: new Date().toISOString().split('T')[0],
      absenceDate: `${selectedYearMonth}-15`,
      employeeId: employees[0]?.id || '',
      reasonCode: 'COD01',
      impactsHourBank: false,
      impactsAttendance: true,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = dataStorage.getEmployeeById(formData.employeeId);
      if (!emp) throw new Error('Selecione um colaborador.');

      const hbBalance = dataStorage.getEmployeeHourBankBalance(emp.id);

      dataStorage.addAbsenceRequest({
        requestDate: formData.requestDate,
        absenceDate: formData.absenceDate,
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        employeeName: emp.name,
        reasonCode: formData.reasonCode,
        reasonDescription: REASON_CODES[formData.reasonCode] || 'Outro Motivo',
        hourBankBalanceAtRequest: hbBalance,
        status: 'pending',
        impactsHourBank: formData.impactsHourBank || formData.reasonCode === 'COD07',
        impactsAttendance: formData.impactsAttendance,
        notes: formData.notes
      });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveAction = (req: AbsenceRequest) => {
    setApprovalModalReq(req);
    setApprovalNotes('');
  };

  const confirmApproval = (status: 'approved' | 'rejected') => {
    if (!approvalModalReq) return;
    try {
      if (status === 'approved') {
        dataStorage.approveAbsenceRequest(approvalModalReq.id, approvalNotes);
      } else {
        dataStorage.rejectAbsenceRequest(approvalModalReq.id, approvalNotes);
      }
      setApprovalModalReq(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Abrir modal de retrocesso
  const handleOpenRevert = (req: AbsenceRequest) => {
    setRevertModalReq(req);
    setRevertNotes(req.authorizationNotes || '');
  };

  // Confirmar retrocesso para pendente
  const confirmRevert = () => {
    if (!revertModalReq) return;
    try {
      dataStorage.revertAbsenceRequest(revertModalReq.id, revertNotes);
      setRevertModalReq(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Abrir modal de edição de solicitação
  const handleOpenEdit = (req: AbsenceRequest) => {
    setEditingRequest(req);
    setEditFormData({
      absenceDate: req.absenceDate,
      requestDate: req.requestDate,
      reasonCode: req.reasonCode,
      impactsHourBank: Boolean(req.impactsHourBank),
      impactsAttendance: req.impactsAttendance !== false,
      status: req.status,
      notes: req.notes || '',
      authorizationNotes: req.authorizationNotes || ''
    });
  };

  // Salvar edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    try {
      dataStorage.updateAbsenceRequest(editingRequest.id, {
        absenceDate: editFormData.absenceDate,
        requestDate: editFormData.requestDate,
        reasonCode: editFormData.reasonCode,
        reasonDescription: REASON_CODES[editFormData.reasonCode] || editingRequest.reasonDescription,
        impactsHourBank: editFormData.impactsHourBank,
        impactsAttendance: editFormData.impactsAttendance,
        status: editFormData.status,
        notes: editFormData.notes,
        authorizationNotes: editFormData.authorizationNotes
      });
      setEditingRequest(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((r) => ({
      'Data da Solicitação': formatDateBR(r.requestDate),
      'Data da Ausência': formatDateBR(r.absenceDate),
      'Matrícula': r.registrationNumber,
      'Colaborador': r.employeeName,
      'Código': r.reasonCode,
      'Descrição do Motivo': r.reasonDescription,
      'Saldo BH': formatMinutesToHHMM(r.hourBankBalanceAtRequest || 0, true),
      'Situação': r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Pendente',
      'Autorizado por': r.authorizedBy || '-',
      'Data Autorização': formatDateBR(r.authorizedAt),
      'Observações': r.notes || ''
    }));
    exportToExcel(data, `IEEI_Solicitacoes_Ausencia_${selectedYearMonth}`);
  };

  const selectedEmployee = dataStorage.getEmployeeById(formData.employeeId);
  const currentHbBalance = selectedEmployee ? dataStorage.getEmployeeHourBankBalance(selectedEmployee.id) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-indigo-600" /> Ocorrências & Solicitações de Faltas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fluxo de autorização gerencial com opção de retrocesso editável, integração à Assiduidade e Banco de Horas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel
          </button>

          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Nova Solicitação
            </button>
          )}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador ou matrícula..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todas as Situações</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
        </select>

        <select
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Motivos</option>
          {Object.entries(REASON_CODES).map(([code, desc]) => (
            <option key={code} value={code}>
              {code} - {desc}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de Solicitações */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data Ausência</th>
                <th className="p-3">Data Solicitação</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Motivo / Código</th>
                <th className="p-3 text-right">Saldo BH</th>
                <th className="p-3 text-center">Situação</th>
                <th className="p-3">Autorizado Por</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Nenhuma ocorrência de ausência encontrada no período ({selectedYearMonth}).
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDateBR(r.absenceDate)}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatDateBR(r.requestDate)}</td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{r.registrationNumber}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-200">{r.employeeName}</td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">{r.reasonCode}:</span>
                      {r.reasonDescription}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatMinutesToHHMM(r.hourBankBalanceAtRequest || 0, true)}
                    </td>
                    <td className="p-3 text-center font-sans">
                      {r.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> Aprovado
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                          <XCircle className="w-3 h-3" /> Rejeitado
                        </span>
                      )}
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {r.authorizedBy ? `${r.authorizedBy} (${formatDateBR(r.authorizedAt)})` : '-'}
                    </td>
                    <td className="p-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1">
                        {canApprove && r.status === 'pending' && (
                          <button
                            onClick={() => handleApproveAction(r)}
                            className="px-2 py-1 rounded text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition"
                            title="Avaliar Solicitação"
                          >
                            Avaliar
                          </button>
                        )}

                        {canApprove && (r.status === 'approved' || r.status === 'rejected') && (
                          <button
                            onClick={() => handleOpenRevert(r)}
                            className="px-2 py-1 rounded text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-400 flex items-center gap-1 transition"
                            title="Retroceder Situação da Ausência"
                          >
                            <RotateCcw className="w-3 h-3" /> Retroceder
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                            title="Editar Dados da Solicitação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Solicitação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Registrar Solicitação de Ausência / Falta
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Ausência:</label>
                  <input
                    type="date"
                    required
                    value={formData.absenceDate}
                    onChange={(e) => setFormData({ ...formData, absenceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada como: {formatDateBR(formData.absenceDate)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Solicitação:</label>
                  <input
                    type="date"
                    required
                    value={formData.requestDate}
                    onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada como: {formatDateBR(formData.requestDate)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Colaborador:</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.registrationNumber} - {emp.name} ({emp.sector || emp.team})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs flex justify-between">
                  <span className="text-slate-500">Saldo Atual do Banco de Horas:</span>
                  <span className={`font-mono font-bold ${currentHbBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatMinutesToHHMM(currentHbBalance, true)} ({currentHbBalance} min)
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código do Motivo:</label>
                <select
                  value={formData.reasonCode}
                  onChange={(e) => setFormData({ ...formData, reasonCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {Object.entries(REASON_CODES).map(([code, desc]) => (
                    <option key={code} value={code}>
                      {code} - {desc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.impactsAttendance}
                    onChange={(e) => setFormData({ ...formData, impactsAttendance: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Atualizar automaticamente na folha de presença ao aprovar (Código J ou F)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.impactsHourBank}
                    onChange={(e) => setFormData({ ...formData, impactsHourBank: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Descontar no Banco de Horas (8 horas = 480 min) em caso de folga compensatória
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações / Detalhes:</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Número de atestado médico, CRM, ou detalhes..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Avaliação Gerencial de Aprovação/Rejeição */}
      {approvalModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setApprovalModalReq(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Avaliação de Solicitação de Ausência
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {approvalModalReq.employeeName} ({approvalModalReq.registrationNumber}) - Data: {formatDateBR(approvalModalReq.absenceDate)}
            </p>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 mb-4 space-y-1 text-xs">
              <p><strong>Motivo:</strong> {approvalModalReq.reasonCode} - {approvalModalReq.reasonDescription}</p>
              {approvalModalReq.notes && <p><strong>Obs:</strong> {approvalModalReq.notes}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Justificativa / Parecer da Liderança:
              </label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Ex: Atestado validado pelo setor médico."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => confirmApproval('rejected')}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Rejeitar
              </button>
              <button
                onClick={() => confirmApproval('approved')}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" /> Aprovar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retroceder Situação (Reversão para Pendente de forma editável) */}
      {revertModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setRevertModalReq(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Retroceder Situação da Ausência
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Colaborador: <strong>{revertModalReq.employeeName}</strong> ({revertModalReq.registrationNumber})<br />
              Data da Ausência: <strong>{formatDateBR(revertModalReq.absenceDate)}</strong><br />
              Situação atual: <span className="font-semibold uppercase">{revertModalReq.status}</span> &rarr; Novo status: <span className="font-bold text-amber-600">PENDENTE</span>
            </p>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 mb-4">
              <strong>Importante:</strong> Ao retroceder a situação, o registro voltará a ficar disponível para reavaliação ou edição. Se houve marcação automática na folha de assiduidade, a presença será liberada.
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Justificativa do Retrocesso:
              </label>
              <textarea
                rows={2}
                value={revertNotes}
                onChange={(e) => setRevertNotes(e.target.value)}
                placeholder="Ex: Necessário reavaliar documentos complementares do colaborador."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevertModalReq(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRevert}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Confirmar Retrocesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edição Completa da Solicitação */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setEditingRequest(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" /> Editar Solicitação de Ausência
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Colaborador: {editingRequest.employeeName} ({editingRequest.registrationNumber})
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Ausência:</label>
                  <input
                    type="date"
                    required
                    value={editFormData.absenceDate}
                    onChange={(e) => setEditFormData({ ...editFormData, absenceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada: {formatDateBR(editFormData.absenceDate)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Solicitação:</label>
                  <input
                    type="date"
                    required
                    value={editFormData.requestDate}
                    onChange={(e) => setEditFormData({ ...editFormData, requestDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formatada: {formatDateBR(editFormData.requestDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código do Motivo:</label>
                  <select
                    value={editFormData.reasonCode}
                    onChange={(e) => setEditFormData({ ...editFormData, reasonCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {Object.entries(REASON_CODES).map(([code, desc]) => (
                      <option key={code} value={code}>
                        {code} - {desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Situação / Status:</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as RequestStatus })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.impactsAttendance}
                    onChange={(e) => setEditFormData({ ...editFormData, impactsAttendance: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Atualizar automaticamente na folha de presença (Código J ou F)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.impactsHourBank}
                    onChange={(e) => setEditFormData({ ...editFormData, impactsHourBank: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Descontar no Banco de Horas (Folga programada)
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações do Registro:</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Parecer da Liderança / Justificativa:</label>
                <textarea
                  rows={2}
                  value={editFormData.authorizationNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, authorizationNotes: e.target.value })}
                  placeholder="Parecer gerencial..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
