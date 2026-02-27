import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Client, ClientType, Frequency, ServiceType, PaymentMethod, UserProfile } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewClient() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState<Partial<Client>>({
    type: 'regular',
    frequency: 'semanal',
    serviceType: 'regular',
    paymentMethod: 'cash',
    clientSince: new Date().toISOString().split('T')[0],
    extras: { fridge: false, oven: false },
    gallery: [],
    cleaningDates: [],
    paymentDates: [],
    budgetSent: false
  });

  useEffect(() => {
    const unsubscribe = db.collection('users')
      .where('role', '==', 'staff')
      .onSnapshot((snapshot) => {
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setStaffList(users);
      });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.collection('clients').add({
        ...formData,
        clientSince: formData.clientSince || new Date().toISOString().split('T')[0]
      });
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-petrol transition-colors">
        <ArrowLeft size={20} />
        {t('cancel')}
      </button>

      <form onSubmit={handleSubmit} className="card space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-petrol">{t('registerClient')}</h1>
          <p className="text-slate-500 text-sm">{t('managementSystem')}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2">{t('fullName')}</h3>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('clientName')}</label>
              <input type="text" required className="input" onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('clientSince')}</label>
              <input type="date" required className="input" value={formData.clientSince} onChange={e => setFormData({...formData, clientSince: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('clientType')}</label>
              <select 
                className="input" 
                value={formData.type} 
                onChange={e => {
                  const newType = e.target.value as ClientType;
                  setFormData({
                    ...formData, 
                    type: newType,
                    frequency: newType === 'airbnb' ? 'esporadico' : formData.frequency
                  });
                }}
              >
                <option value="regular">{t('regular')}</option>
                <option value="airbnb">{t('airbnb')}</option>
                <option value="esporadico">{t('esporadico')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('address')}</label>
              <input type="text" required className="input" onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('phone')}</label>
                <input type="tel" required className="input" onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('email')}</label>
                <input type="email" required className="input" onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2">{t('budget')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {formData.type !== 'airbnb' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('frequency')}</label>
                  <select className="input" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                    <option value="semanal">{t('weekly')}</option>
                    <option value="quinzenal">{t('biweekly')}</option>
                    <option value="mensal">{t('monthly')}</option>
                  </select>
                </div>
              )}
              <div className={formData.type === 'airbnb' ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('serviceType')}</label>
                <select className="input" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value as ServiceType})}>
                  <option value="airbnb_cleaning">{t('airbnb')}</option>
                  <option value="move_in">{t('moveIn')}</option>
                  <option value="move_out">{t('moveOut')}</option>
                  <option value="regular">{t('regular')}</option>
                  <option value="esporadico">{t('esporadico')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('serviceValue')} ($)</label>
                <input type="number" required className="input" onChange={e => setFormData({...formData, serviceValue: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('teamPay')} ($)</label>
                <input type="number" required className="input" onChange={e => setFormData({...formData, teamPaymentValue: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('paymentMethod')}</label>
              <select className="input" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="check">Check</option>
                <option value="apple_pay">ApplePay</option>
              </select>
            </div>
            {formData.type !== 'airbnb' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('nextPayment')}</label>
                  <input type="date" className="input" onChange={e => setFormData({...formData, nextPaymentDue: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('numberOfStaff')}</label>
                    <input type="number" min="1" className="input" defaultValue="1" onChange={e => setFormData({...formData, numberOfStaff: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('assignStaff')}</label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-3 border rounded-xl bg-slate-50">
                      {staffList.map(staff => (
                        <label key={staff.uid} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-petrol"
                            checked={(formData.assignedStaffIds || []).includes(staff.uid)}
                            onChange={e => {
                              const current = formData.assignedStaffIds || [];
                              if (e.target.checked) {
                                setFormData({...formData, assignedStaffIds: [...current, staff.uid]});
                              } else {
                                setFormData({...formData, assignedStaffIds: current.filter(id => id !== staff.uid)});
                              }
                            }}
                          />
                          <span className="text-sm text-slate-700">{staff.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="budgetSent" 
                className="w-5 h-5 accent-petrol"
                checked={formData.budgetSent || false}
                onChange={e => setFormData({...formData, budgetSent: e.target.checked})} 
              />
              <label htmlFor="budgetSent" className="text-sm font-medium text-slate-600">{t('budgetSent')}</label>
            </div>
          </div>
        </div>

        {formData.type === 'airbnb' && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gold border-b pb-2">{t('airbnb')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">{t('fullName')}</label>
                <input type="text" className="input" onChange={e => setFormData({...formData, ownerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Property Link</label>
                <input type="url" className="input" onChange={e => setFormData({...formData, propertyLink: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            <Save size={20} />
            {loading ? t('processing') : t('saveClient')}
          </button>
        </div>
      </form>
    </div>
  );
}
