import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { Client, ClientType, Frequency, ServiceType, PaymentMethod } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewClient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({
    type: 'regular',
    frequency: 'semanal',
    serviceType: 'regular',
    paymentMethod: 'cash',
    extras: { fridge: false, oven: false },
    gallery: [],
    cleaningDates: [],
    paymentDates: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.collection('clients').add({
        ...formData,
        clientSince: new Date().toISOString().split('T')[0]
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
        Cancel
      </button>

      <form onSubmit={handleSubmit} className="card space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-petrol">Register New Client</h1>
          <p className="text-slate-500 text-sm">Fill in the details to add a new client to the system.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Client Name</label>
              <input type="text" required className="input" onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Client Type</label>
              <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ClientType})}>
                <option value="regular">Regular</option>
                <option value="airbnb">Airbnb</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
              <input type="text" required className="input" onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                <input type="tel" required className="input" onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <input type="email" required className="input" onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2">Service & Financials</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Frequency</label>
                <select className="input" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as Frequency})}>
                  <option value="semanal">Weekly</option>
                  <option value="quinzenal">Bi-weekly</option>
                  <option value="mensal">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Service Type</label>
                <select className="input" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value as ServiceType})}>
                  <option value="regular">Regular</option>
                  <option value="deep">Deep Cleaning</option>
                  <option value="move_in">Move In</option>
                  <option value="move_out">Move Out</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Service Value ($)</label>
                <input type="number" required className="input" onChange={e => setFormData({...formData, serviceValue: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Team Pay ($)</label>
                <input type="number" required className="input" onChange={e => setFormData({...formData, teamPaymentValue: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Payment Method</label>
              <select className="input" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>
        </div>

        {formData.type === 'airbnb' && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gold border-b pb-2">Airbnb Specific Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Owner Name</label>
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
            {loading ? 'Saving...' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
