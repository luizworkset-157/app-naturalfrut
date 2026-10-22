import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Clock,
  Briefcase,
  Layers,
  Plus,
  Settings2,
  AlertTriangle,
  Check,
  Building2
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { Employee, EmployeeStatus } from '../../types';
import { ExcelImportModal } from '../modals/ExcelImportModal';
import { exportToExcel } from '../../services/excelService';
import { formatDateBR } from '../../utils/calculations';

export const EmployeesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Modal de Exclusão de Colaborador (Substitui confirm do browser que falha em iframes)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Modais de Gerenciamento de Funções e Setores
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [editingRoleText, setEditingRoleText] = useState('');

  const [isManageSectorsOpen, setIsManageSectorsOpen] = useState(false);
  const [newSectorInput, setNewSectorInput] = useState('');
  const [editingSectorIndex, setEditingSectorIndex] = useState<number | null>(null);
  const [editingSectorText, setEditingSectorText] = useState('');

  // Feedback Toast
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const employees = dataStorage.getEmployees();
  const roles = dataStorage.getRoles();
  const sectors = dataStorage.getSectors();

  const currentUser = dataStorage.getCurrentUser();
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'supervisor';

  // Form State (Sem campos Equipe e Supervisor)
  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    role: roles[0] || 'Operador de Produção',
    sector: sectors[0] || 'Operações',
    shift: '1º Turno (06h - 14h)',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active' as EmployeeStatus,
    notes: ''
  });

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (searchTerm) {
        const cleanTerm = searchTerm.toLowerCase();
        const matchesName = e.name.toLowerCase().includes(cleanTerm);
        const matchesReg = e.registrationNumber.toLowerCase().includes(cleanTerm);
        if (!matchesName && !matchesReg) return false;
      }
      if (filterSector !== 'all' && e.sector !== filterSector) return false;
      if (filterRole !== 'all' && e.role !== filterRole) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [employees, searchTerm, filterSector, filterRole, filterStatus]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      registrationNumber: '',
      name: '',
      role: roles[0] || 'Operador de Produção',
      sector: sectors[0] || 'Operações',
      shift: '1º Turno (06h - 14h)',
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      registrationNumber: emp.registrationNumber,
      name: emp.name,
      role: emp.role,
      sector: emp.sector,
      shift: emp.shift,
      admissionDate: emp.admissionDate,
      status: emp.status,
      notes: emp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.registrationNumber.trim()) throw new Error('A matrícula é obrigatória.');
      if (!formData.name.trim()) throw new Error('O nome completo é obrigatório.');
      if (!formData.role.trim()) throw new Error('Selecione uma função.');
      if (!formData.sector.trim()) throw new Error('Selecione um setor.');

      const payload = {
        ...formData,
        team: editingEmployee ? editingEmployee.team : 'Geral',
        supervisor: editingEmployee ? editingEmployee.supervisor : 'Coordenação'
      };

      if (editingEmployee) {
        dataStorage.updateEmployee(editingEmployee.id, payload);
        showFeedback('Colaborador atualizado com sucesso!');
      } else {
        dataStorage.addEmployee(payload);
        showFeedback('Colaborador cadastrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Executar exclusão real
  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    try {
      dataStorage.deleteEmployee(employeeToDelete.id);
      showFeedback(`Colaborador ${employeeToDelete.name} excluído com sucesso.`);
      setEmployeeToDelete(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Funções de Gerenciamento de FUNÇÃO
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleInput.trim()) return;
    try {
      dataStorage.addRole(newRoleInput);
      setFormData((prev) => ({ ...prev, role: newRoleInput.trim() }));
      setNewRoleInput('');
      showFeedback('Nova função adicionada à lista!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEditRole = (oldRole: string) => {
    if (!editingRoleText.trim()) return;
    try {
      dataStorage.updateRole(oldRole, editingRoleText);
      if (formData.role === oldRole) {
        setFormData((prev) => ({ ...prev, role: editingRoleText.trim() }));
      }
      setEditingRoleIndex(null);
      setEditingRoleText('');
      showFeedback('Função atualizada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRole = (roleToDelete: string) => {
    if (roles.length <= 1) {
      alert('É necessário manter pelo menos uma função cadastrada.');
      return;
    }
    dataStorage.deleteRole(roleToDelete);
    if (formData.role === roleToDelete) {
      const remaining = dataStorage.getRoles();
      setFormData((prev) => ({ ...prev, role: remaining[0] || '' }));
    }
    showFeedback(`Função "${roleToDelete}" excluída da lista.`);
  };

  // Funções de Gerenciamento de SETOR
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorInput.trim()) return;
    try {
      dataStorage.addSector(newSectorInput);
      setFormData((prev) => ({ ...prev, sector: newSectorInput.trim() }));
      setNewSectorInput('');
      showFeedback('Novo setor adicionado à lista!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEditSector = (oldSector: string) => {
    if (!editingSectorText.trim()) return;
    try {
      dataStorage.updateSector(oldSector, editingSectorText);
      if (formData.sector === oldSector) {
        setFormData((prev) => ({ ...prev, sector: editingSectorText.trim() }));
      }
      setEditingSectorIndex(null);
      setEditingSectorText('');
      showFeedback('Setor atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSector = (sectorToDelete: string) => {
    if (sectors.length <= 1) {
      alert('É necessário manter pelo menos um setor cadastrado.');
      return;
    }
    dataStorage.deleteSector(sectorToDelete);
    if (formData.sector === sectorToDelete) {
      const remaining = dataStorage.getSectors();
      setFormData((prev) => ({ ...prev, sector: remaining[0] || '' }));
    }
    showFeedback(`Setor "${sectorToDelete}" excluído da lista.`);
  };

  const handleExportExcel = () => {
    const data = filtered.map((e) => ({
      'Matrícula': e.registrationNumber,
      'Nome Completo': e.name,
      'Função': e.role,
      'Setor': e.sector,
      'Turno': e.shift,
      'Data de Admissão': formatDateBR(e.admissionDate),
      'Situação': e.status,
      'Observações': e.notes || ''
    }));
    exportToExcel(data, `IEEI_Colaboradores_${new Date().toISOString().split('T')[0]}`);
  };

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" /> Ativo
          </span>
        );
      case 'vacation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
            Férias
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" /> Afastado
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
            Desligado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Cadastro Central de Colaboradores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestão unificada do quadro funcional com listas customizáveis de funções e setores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageRolesOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
            title="Editar ou excluir funções"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Gerenciar Funções
          </button>

          <button
            onClick={() => setIsManageSectorsOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
            title="Editar ou excluir setores"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Gerenciar Setores
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Importar
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
          >
            Exportar
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" /> Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todas as Funções</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todos os Setores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          <option value="all">Todas as Situações</option>
          <option value="active">Ativos</option>
          <option value="vacation">Férias</option>
          <option value="leave">Afastados</option>
          <option value="terminated">Desligados</option>
        </select>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Nome Completo</th>
                <th className="p-3">Função</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Turno</th>
                <th className="p-3">Data de Admissão</th>
                <th className="p-3 text-center">Situação</th>
                {canEdit && <th className="p-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {emp.registrationNumber}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {emp.name}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{emp.role}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{emp.sector}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{emp.shift}</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{formatDateBR(emp.admissionDate)}</td>
                    <td className="p-3 text-center">{getStatusBadge(emp.status)}</td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                            title="Editar Colaborador"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                            title="Excluir Colaborador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 flex justify-between">
          <span>Mostrando {filtered.length} de {employees.length} colaboradores</span>
          <span>Matrículas preservadas com alfanuméricos e zeros à esquerda</span>
        </div>
      </div>

      {/* Modal de Criação / Edição de Colaborador (Sem Equipe e Supervisor) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingEmployee ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Matrícula (Preserva Zeros): *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="Ex: 00102"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo: *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Opção FUNÇÃO com seleção e gerenciamento de lista */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Função / Cargo: *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManageRolesOpen(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Settings2 className="w-3 h-3" /> Gerenciar Funções
                  </button>
                </div>
                <select
                  value={formData.role}
                  required
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opção SETOR com seleção e gerenciamento de lista */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Setor: *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManageSectorsOpen(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Settings2 className="w-3 h-3" /> Gerenciar Setores
                  </button>
                </div>
                <select
                  value={formData.sector}
                  required
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Turno:</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="1º Turno (06h - 14h)">1º Turno (06h - 14h)</option>
                    <option value="2º Turno (14h - 22h)">2º Turno (14h - 22h)</option>
                    <option value="3º Turno (22h - 06h)">3º Turno (22h - 06h)</option>
                    <option value="Horário Comercial (08h - 17h)">Horário Comercial (08h - 17h)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data de Admissão:</label>
                  <input
                    type="date"
                    required
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Situação Cadastral:</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="active">Ativo (Em operação)</option>
                  <option value="vacation">Férias</option>
                  <option value="leave">Afastado</option>
                  <option value="terminated">Desligado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações:</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações contratuais adicionais..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
                >
                  {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE COLABORADOR */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir Colaborador
                </h3>
                <p className="text-[11px] text-slate-500">
                  Confirmação de remoção de cadastro
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {employeeToDelete.name}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Matrícula: {employeeToDelete.registrationNumber}
                </span>
                <span>&bull;</span>
                <span>{employeeToDelete.role}</span>
                <span>&bull;</span>
                <span>{employeeToDelete.sector}</span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Tem certeza que deseja excluir este colaborador? O histórico de assiduidade e os lançamentos de banco de horas vinculados continuarão armazenados na trilha de auditoria.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir Colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE FUNÇÕES (Adicionar, Editar e Excluir) */}
      {isManageRolesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-xs space-y-4">
            <button
              onClick={() => {
                setIsManageRolesOpen(false);
                setEditingRoleIndex(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Gerenciar Lista de Funções
                </h3>
                <p className="text-[11px] text-slate-500">
                  Adicione novas funções ou edite/exclua as existentes
                </p>
              </div>
            </div>

            {/* Formulário para Adicionar Nova Função */}
            <form onSubmit={handleAddRole} className="flex gap-2">
              <input
                type="text"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                placeholder="Nome da nova função..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </form>

            {/* Lista com Edição e Exclusão */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {roles.map((r, idx) => {
                const isEditing = editingRoleIndex === idx;

                return (
                  <div
                    key={r}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingRoleText}
                          autoFocus
                          onChange={(e) => setEditingRoleText(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-blue-400 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditRole(r)}
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          title="Salvar Alteração"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRoleIndex(null)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {r}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoleIndex(idx);
                              setEditingRoleText(r);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                            title="Editar nome da função"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            title="Excluir função da lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsManageRolesOpen(false);
                  setEditingRoleIndex(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE SETORES (Adicionar, Editar e Excluir) */}
      {isManageSectorsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-xs space-y-4">
            <button
              onClick={() => {
                setIsManageSectorsOpen(false);
                setEditingSectorIndex(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Gerenciar Lista de Setores
                </h3>
                <p className="text-[11px] text-slate-500">
                  Adicione novos setores operacionais ou edite/exclua os existentes
                </p>
              </div>
            </div>

            {/* Formulário para Adicionar Novo Setor */}
            <form onSubmit={handleAddSector} className="flex gap-2">
              <input
                type="text"
                value={newSectorInput}
                onChange={(e) => setNewSectorInput(e.target.value)}
                placeholder="Nome do novo setor..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </form>

            {/* Lista com Edição e Exclusão */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {sectors.map((s, idx) => {
                const isEditing = editingSectorIndex === idx;

                return (
                  <div
                    key={s}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingSectorText}
                          autoFocus
                          onChange={(e) => setEditingSectorText(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-indigo-400 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditSector(s)}
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          title="Salvar Alteração"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSectorIndex(null)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {s}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSectorIndex(idx);
                              setEditingSectorText(s);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                            title="Editar nome do setor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSector(s)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            title="Excluir setor da lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsManageSectorsOpen(false);
                  setEditingSectorIndex(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação Excel */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetModule="employees"
        onSuccess={() => showFeedback('Colaboradores importados com sucesso!')}
      />
    </div>
  );
};
