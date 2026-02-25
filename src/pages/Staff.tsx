import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, Plus, Search, UserPlus, MoreVertical, Shield, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await firebaseService.getStaff();
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await firebaseService.addStaff({ ...newStaff, status: 'Active', created_at: new Date().toISOString() });
      setIsModalOpen(false);
      setNewStaff({ name: '', email: '', phone: '' });
      fetchStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('team')}</h2>
          <p className="text-slate-500">{t('manage_staff')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <UserPlus className="w-5 h-5" />
          {t('add_staff')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))
        ) : staff.map((member) => (
          <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
            <button className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-petroleum/10 rounded-xl flex items-center justify-center text-petroleum">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{member.name}</h4>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  member.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                )}>
                  {member.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Mail className="w-4 h-4" />
                <span>{member.email || t('no_data')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone className="w-4 h-4" />
                <span>{member.phone || t('no_data')}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Verified Staff
              </div>
              <button className="text-xs font-bold text-petroleum hover:underline">
                {t('view_all')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-md p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{t('add_staff')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('name')}</label>
                <input 
                  required
                  type="text" 
                  className="input-field" 
                  placeholder="John Doe"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('email')}</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="john@example.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('phone')}</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder="+1 (555) 000-0000"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
