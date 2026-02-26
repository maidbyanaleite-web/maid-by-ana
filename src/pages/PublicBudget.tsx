import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, DollarSign, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { db } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { PricingSettings, BudgetRequest, ServiceType } from '../types';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PRICING: PricingSettings = {
  regular: 120,
  moveInCleaning: 300,
  moveOutCleaning: 300,
  airbnbCleaning: 200,
  esporadico: 150,
  petAddon: 30,
  windowAddon: 50,
  fridgeAddon: 25,
  ovenAddon: 25,
  bedroomAddon: 20,
  roomAddon: 15,
  bathroomAddon: 30,
};

export default function PublicBudget() {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Calculator State
  const [selectedService, setSelectedService] = useState<ServiceType>('regular');
  const [extras, setExtras] = useState<Record<string, number>>({
    pet: 0,
    window: 0,
    fridge: 0,
    oven: 0,
    bedroom: 0,
    room: 0,
    bathroom: 0
  });

  // Contact State
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const unsub = db.collection('settings').doc('pricing').onSnapshot((doc) => {
      if (doc.exists) {
        setPricing({ ...DEFAULT_PRICING, ...doc.data() } as PricingSettings);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateTotal = () => {
    let total = 0;
    if (selectedService === 'regular') total += pricing.regular;
    else if (selectedService === 'move_in') total += pricing.moveInCleaning;
    else if (selectedService === 'move_out') total += pricing.moveOutCleaning;
    else if (selectedService === 'airbnb_cleaning') total += pricing.airbnbCleaning;
    
    total += extras.pet * pricing.petAddon;
    total += extras.window * pricing.windowAddon;
    total += extras.fridge * pricing.fridgeAddon;
    total += extras.oven * pricing.ovenAddon;
    total += extras.bedroom * pricing.bedroomAddon;
    total += extras.room * pricing.roomAddon;
    total += extras.bathroom * pricing.bathroomAddon;
    
    return total;
  };

  const totalEstimate = calculateTotal();

  const updateExtra = (key: string, delta: number) => {
    setExtras(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const budgetRequest: BudgetRequest = {
        clientName: contact.name,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        serviceType: selectedService,
        extras: extras,
        totalValue: totalEstimate,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await db.collection('budget_requests').add(budgetRequest);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting budget:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">{t('processing')}</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-petrol">{t('budgetSuccess')}</h2>
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3"
          >
            {t('backToLogin')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="bg-petrol text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate('/login')} className="flex items-center gap-2 hover:text-gold transition-colors">
            <ArrowLeft size={20} />
            <span className="font-bold">{t('backToLogin')}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-xs font-bold rounded-full ${language === 'en' ? 'bg-gold text-petrol' : 'bg-white/10'}`}>EN</button>
            <button onClick={() => setLanguage('pt')} className={`px-3 py-1 text-xs font-bold rounded-full ${language === 'pt' ? 'bg-gold text-petrol' : 'bg-white/10'}`}>PT</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-petrol">{t('getEstimate')}</h1>
          <p className="text-slate-500">{t('managementSystem')}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card space-y-6">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <Calculator size={24} className="text-gold" />
                {t('calculator')}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">{t('serviceType')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'airbnb_cleaning', label: t('airbnb'), price: pricing.airbnbCleaning },
                    { id: 'move_in', label: t('moveIn'), price: pricing.moveInCleaning },
                    { id: 'move_out', label: t('moveOut'), price: pricing.moveOutCleaning },
                    { id: 'regular', label: t('regular'), price: pricing.regular }
                  ].map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service.id as any)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col ${
                        selectedService === service.id 
                          ? 'border-petrol bg-petrol/5 text-petrol' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="font-bold">{service.label}</span>
                      <span className="text-lg font-bold mt-1">${service.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700 uppercase tracking-wider">{t('extras')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'pet', label: t('petAddon'), price: pricing.petAddon },
                    { id: 'window', label: t('windowAddon'), price: pricing.windowAddon },
                    { id: 'fridge', label: t('fridgeAddon'), price: pricing.fridgeAddon },
                    { id: 'oven', label: t('ovenAddon'), price: pricing.ovenAddon },
                    { id: 'bedroom', label: t('bedroomAddon'), price: pricing.bedroomAddon },
                    { id: 'room', label: t('roomAddon'), price: pricing.roomAddon },
                    { id: 'bathroom', label: t('bathroomAddon'), price: pricing.bathroomAddon }
                  ].map((extra) => (
                    <div 
                      key={extra.id}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        extras[extra.id as keyof typeof extras] > 0
                          ? 'border-gold bg-gold/5'
                          : 'border-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-petrol">{extra.label}</span>
                        <span className="text-xs text-slate-400 font-medium">${extra.price} / unit</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => updateExtra(extra.id as any, -1)}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-petrol">
                          {extras[extra.id as keyof typeof extras]}
                        </span>
                        <button 
                          onClick={() => updateExtra(extra.id as any, 1)}
                          className="w-8 h-8 rounded-full bg-petrol text-white flex items-center justify-center hover:bg-petrol/90 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="card space-y-6">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <Send size={24} className="text-gold" />
                {t('contactInfo')}
              </h2>
              <form id="public-budget-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                    <input 
                      type="text" 
                      required 
                      className="input" 
                      value={contact.name}
                      onChange={e => setContact({...contact, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
                    <input 
                      type="email" 
                      required 
                      className="input" 
                      value={contact.email}
                      onChange={e => setContact({...contact, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
                    <input 
                      type="tel" 
                      required 
                      className="input" 
                      value={contact.phone}
                      onChange={e => setContact({...contact, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                    <input 
                      type="text" 
                      required 
                      className="input" 
                      value={contact.address}
                      onChange={e => setContact({...contact, address: e.target.value})}
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Summary Section */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-petrol text-white p-8 rounded-3xl shadow-xl sticky top-24"
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <DollarSign size={24} className="text-gold" />
                {t('totalEstimate')}
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/70">{t('serviceType')}</span>
                  <span className="font-bold">{t(selectedService)}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(extras).map(([key, value]) => (value as number) > 0 && (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-white/70">{t(key + 'Addon' as any)} (x{value})</span>
                      <span className="font-medium">${(value as number) * pricing[key + 'Addon' as keyof PricingSettings]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gold">$</span>
                  <span className="text-6xl font-bold">{totalEstimate}</span>
                </div>
              </div>

              <button 
                form="public-budget-form"
                type="submit"
                disabled={submitting}
                className="w-full btn-primary bg-gold text-petrol hover:bg-gold/90 py-4 text-lg font-bold rounded-2xl shadow-lg shadow-gold/20 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? t('processing') : (
                  <>
                    <Send size={20} />
                    {t('confirmBudget')}
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
