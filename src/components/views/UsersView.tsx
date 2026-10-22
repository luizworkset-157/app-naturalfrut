import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  UserCheck,
  CheckCircle,
  X,
  Edit2
} from 'lucide-react';
import { dataStorage } from '../../services/dataStorage';
import { UserProfile, UserRole } from '../../types';

export const UsersView: React.FC = () => {
  const users = dataStorage.getUsers();
  const currentUser = dataStorage.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    team: string;
    sector: string;
  }>({
    name: '',
    email: '',
    role: 'supervisor',
    team: 'Operacional',
    sector: 'Montagem'
  });

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      role: 'supervisor',
      team: 'Operacional',
      sector: 'Montagem'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team || '',
      sector: user.sector || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert('Apenas administradores podem gerenciar usuários.');

    try {
      if (editingUserId) {
        dataStorage.updateUser(editingUserId, formData);
      } else {
        dataStorage.addUser(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-max">
            <Shield className="w-3 h-3 text-blue-600" /> Administrador
          </span>
        );
      case 'manager':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-max">
            <UserCheck className="w-3 h-3 text-emerald-600" /> Gestor de Produção
          </span>
        );
      case 'supervisor':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-max">
            <UserCheck className="w-3 h-3 text-amber-600" /> Supervisor de Linha
          </span>
        );
      case 'operator':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 w-max">
            Operador
          </span>
        );
    }
  };

  const roleDescriptions: Record<UserRole, string> = {
    admin: 'Acesso irrestrito a configurações de metas, permissões, reabertura de meses e governança de auditoria.',
    manager: 'Acompanhamento executivo de equipes, aprovação de solicitações de ausência e horas, e relatórios gerenciais.',
    supervisor: 'Lançamento e consulta de apontamentos de produção, assiduidade e atrasos da sua equipe.',
    operator: 'Registro pontual de informações operacionais básicas com acesso restrito a dados confidenciais.'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Administração de Usuários & Controle de Acesso (RBAC)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerenciamento de contas corporativas divididas nos 4 perfis oficiais do sistema IEEI.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </button>
        )}
      </div>

      {/* Cartões dos 4 Perfis de Acesso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['admin', 'manager', 'supervisor', 'operator'] as UserRole[]).map((role) => (
          <div
            key={role}
            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
          >
            {getRoleBadge(role)}
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
              {roleDescriptions[role]}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Nome do Usuário</th>
                <th className="p-3">E-mail Corporativo</th>
                <th className="p-3">Perfil de Acesso</th>
                <th className="p-3">Equipe Vinculada</th>
                <th className="p-3">Setor</th>
                <th className="p-3 text-center">Simular Sessão</th>
                {isAdmin && <th className="p-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isCurrent = currentUser.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        {u.name}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            (Você)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>
                    <td className="p-3">{getRoleBadge(u.role)}</td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{u.team || 'Todas'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{u.sector || 'Todos'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => dataStorage.setCurrentUser(u)}
                        disabled={isCurrent}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          isCurrent
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 cursor-default font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isCurrent ? 'Sessão Ativa' : 'Entrar como'}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingUserId ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Amanda Nogueira"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail Corporativo:</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="amanda@empresa.com.br"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Perfil de Acesso (RBAC):</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="admin">Administrador (Total)</option>
                  <option value="manager">Gestor de Produção</option>
                  <option value="supervisor">Supervisora de Linha</option>
                  <option value="operator">Operador</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Equipe:</label>
                <input
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  placeholder="Ex: Operações"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Setor:</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="Ex: Usinagem"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  {editingUserId ? 'Salvar Usuário' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
