
import React, { useState } from 'react';
import { User, AppRoute } from '../types';
import { UserPlus, Search, Edit2, Trash2, X, Check, Shield, GraduationCap, Mail, Lock, User as UserIcon, AlertTriangle } from 'lucide-react';

interface Props {
  users: User[];
  currentUser: User;
  onUpdateUsers: (users: User[]) => void;
}

const AdminUserManagement: React.FC<Props> = ({ users, currentUser, onUpdateUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    email: '',
    password: '',
    role: 'student',
    gradeLevel: '4ème'
  });

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ ...user });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        email: '',
        password: '',
        role: 'student',
        gradeLevel: '4ème',
        xp: 0,
        level: 1,
        streak: 0,
        lastActive: new Date().toISOString(),
        tokenHistory: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.firstName || !formData.email || (!editingUser && !formData.password)) return;

    let newUsers: User[];
    if (editingUser) {
      newUsers = users.map(u => u.email === editingUser.email ? { ...u, ...formData } as User : u);
    } else {
      newUsers = [...users, { ...formData, xp: 0, level: 1, streak: 0, lastActive: new Date().toISOString(), tokenHistory: [] } as User];
    }

    onUpdateUsers(newUsers);
    setIsModalOpen(false);
  };

  const handleDelete = (email: string) => {
    if (email === currentUser.email) {
      alert("Vous ne pouvez pas supprimer votre propre compte admin.");
      return;
    }
    if (window.confirm("Supprimer définitivement cet utilisateur ?")) {
      const newUsers = users.filter(u => u.email !== email);
      onUpdateUsers(newUsers);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <UserIcon className="w-7 h-7 text-indigo-400" />
            Gestion des Comptes
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Total : {users.length} utilisateurs</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" /> Créer un compte
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-indigo-500 outline-none transition-all shadow-inner"
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <div key={user.email} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:border-indigo-500/50 transition-all shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {user.role === 'admin' ? <Shield className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
              </div>
              <div className="truncate">
                <h4 className="font-black text-white uppercase tracking-tight">{user.firstName}</h4>
                <p className="text-[10px] text-slate-500 font-bold truncate">{user.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-slate-800 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">{user.role}</span>
                  {user.gradeLevel && <span className="px-2 py-0.5 bg-slate-800 rounded text-[8px] font-black text-indigo-400 uppercase tracking-widest">{user.gradeLevel}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleOpenModal(user)} className="p-3 bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(user.email)} className="p-3 bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-slate-900 z-10 pb-4">
              <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                {editingUser ? <Edit2 className="w-6 h-6 text-indigo-400" /> : <UserPlus className="w-6 h-6 text-indigo-400" />}
                {editingUser ? 'Modifier le compte' : 'Nouveau compte'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Prénom</label>
                <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Prénom..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@exemple.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mot de passe {editingUser && '(Laissez vide pour conserver)'}</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Rôle</label>
                    <select 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as 'student' | 'admin'})}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    >
                        <option value="student">Élève</option>
                        <option value="admin">Administrateur</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Niveau</label>
                    <select 
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                        disabled={formData.role === 'admin'}
                    >
                        {['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'Supérieur'].map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
              >
                <Check className="w-4 h-4" /> {editingUser ? 'Mettre à jour' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
