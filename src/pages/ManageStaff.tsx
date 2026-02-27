import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { UserProfile, Client, UserRole } from '../types';
import { 
  Users, 
  Trash2, 
  Shield, 
  User,
  Mail,
  ArrowLeft,
  Plus,
  X,
  Lock,
  Link as LinkIcon,
  Edit,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

// Firebase config for secondary app
const firebaseConfig = {
  apiKey: "AIzaSyBgO3BpNX0Kuy5SAZlehoDVLMlEw08v3Yg",
  authDomain: "maid-by-ana-production.firebaseapp.com",
  projectId: "maid-by-ana-production",
  storageBucket: "maid-by-ana-production.firebasestorage.app",
  messagingSenderId: "507056939130",
  appId: "1:507056939130:web:3d31919b4adc9f7e089bc3",
  measurementId: "G-2FN1P6225X"
};

export default function ManageStaff() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const unsubUsers = db.collection('users').onSnapshot((snapshot) => {
      const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setStaffList(users);
      setLoading(false);
    });

    const unsubClients = db.collection('clients').onSnapshot((snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    return () => {
      unsubUsers();
      unsubClients();
    };
  }, [isAdmin, navigate]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      // Initialize secondary app to create user without logging out admin
      const secondaryApp = (window as any).firebase.apps.find((app: any) => app.name === 'Secondary') || 
                          (window as any).firebase.initializeApp(firebaseConfig, 'Secondary');
      
      const res = await secondaryApp.auth().createUserWithEmailAndPassword(newEmail, newPassword);
      
      if (res.user) {
        const userData: any = {
          name: newName,
          email: newEmail,
          role: newRole
        };

        if (newRole === 'client' && selectedClientId) {
          userData.clientId = selectedClientId;
        }

        await db.collection('users').doc(res.user.uid).set(userData);
        
        // Sign out from secondary app immediately
        await secondaryApp.auth().signOut();
        
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('staff');
        setSelectedClientId('');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error creating user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormLoading(true);
    setFormError('');

    try {
      const userData: any = {
        name: newName,
        role: newRole
      };

      if (newRole === 'client' && selectedClientId) {
        userData.clientId = selectedClientId;
      } else {
        userData.clientId = null;
      }

      await db.collection('users').doc(editingUser.uid).update(userData);
      setEditingUser(null);
      setNewName('');
      setNewRole('staff');
      setSelectedClientId('');
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error updating user');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewRole(user.role);
    setSelectedClientId(user.clientId || '');
    setShowAddModal(false);
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm(t('delete') + '?')) {
      try {
        await db.collection('users').doc(uid).delete();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleRole = async (user: UserProfile) => {
    let nextRole: UserRole = 'staff';
    if (user.role === 'staff') nextRole = 'admin';
    else if (user.role === 'admin') nextRole = 'client';
    else nextRole = 'staff';

    try {
      await db.collection('users').doc(user.uid).update({ role: nextRole });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-petrol">{t('manageStaff')}</h1>
            <p className="text-slate-500">{t('teamMember')} & {t('client')} Management</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('addStaff')}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {staffList.map(member => (
          <motion.div 
            key={member.uid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center justify-between p-6"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                member.role === 'admin' ? 'bg-gold text-petrol' : 
                member.role === 'client' ? 'bg-blue-100 text-blue-600' : 
                'bg-slate-100 text-slate-500'
              }`}>
                {member.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{member.name}</h3>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Mail size={14} />
                    {member.email}
                  </div>
                  {member.role === 'client' && member.clientId && (
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                      <LinkIcon size={12} />
                      {clients.find(c => c.id === member.clientId)?.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => openEditModal(member)}
                className="p-2 text-slate-400 hover:text-petrol transition-colors"
                title={t('edit')}
              >
                <Edit size={20} />
              </button>
              
              <div className="text-right px-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">{t('role')}</p>
                <button 
                  onClick={() => toggleRole(member)}
                  className={`text-sm font-bold uppercase ${
                    member.role === 'admin' ? 'text-gold' : 
                    member.role === 'client' ? 'text-blue-600' : 
                    'text-petrol'
                  }`}
                >
                  {t(member.role as any)}
                </button>
              </div>
              
              <button 
                onClick={() => handleDelete(member.uid)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddModal || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-petrol/10 rounded-2xl flex items-center justify-center text-petrol mx-auto mb-4">
                  <Users size={32} />
                </div>
                <h2 className="text-2xl font-bold text-petrol">{editingUser ? t('edit') : t('addStaff')}</h2>
                <p className="text-slate-500">{editingUser ? t('updateInfo') : t('createAccount')}</p>
              </div>

              <form onSubmit={editingUser ? handleUpdateStaff : handleAddStaff} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="input pl-10"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className="input pl-10 disabled:bg-slate-50 disabled:text-slate-400"
                      value={editingUser ? editingUser.email : newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        className="input pl-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('role')}</label>
                    <select 
                      className="input"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                    >
                      <option value="staff">{t('staff')}</option>
                      <option value="client">{t('client')}</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {newRole === 'client' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('linkClient')}</label>
                      <select 
                        className="input"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        required
                      >
                        <option value="">{t('selectClient')}</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {formError && (
                  <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {formLoading ? t('processing') : (
                    <>
                      {editingUser ? <Save size={20} /> : <Plus size={20} />}
                      {editingUser ? t('save') : t('register')}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
