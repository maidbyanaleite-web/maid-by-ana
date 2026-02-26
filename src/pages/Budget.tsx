import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, Clock, Home, CheckCircle2, DollarSign, Settings, Save } from 'lucide-react';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { PricingSettings, ServiceType } from '../types';

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

export default function Budget() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'calculator' | 'pricing'>('calculator');
  
  // Pricing State
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const unsub = db.collection('settings').doc('pricing').onSnapshot((doc) => {
      if (doc.exists) {
        setPricing({ ...DEFAULT_PRICING, ...doc.data() } as PricingSettings);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await db.collection('settings').doc('pricing').set(pricing);
      alert(t('save') + '!');
    } catch (error) {
      console.error("Error saving pricing:", error);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    
    // Base service
    if (selectedService === 'regular') total += pricing.regular;
    else if (selectedService === 'move_in') total += pricing.moveInCleaning;
    else if (selectedService === 'move_out') total += pricing.moveOutCleaning;
    else if (selectedService === 'airbnb_cleaning') total += pricing.airbnbCleaning;
    else if (selectedService === 'esporadico') total += pricing.esporadico;
    
    // Extras
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

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-petrol">{t('budget')}</h1>
        <p className="text-slate-500">{t('budgetRequest')}</p>
      </header>

      {isAdmin && (
        <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'calculator' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
          >
            <Calculator size={18} />
            {t('calculator')}
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'pricing' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
          >
            <Settings size={18} />
            {t('pricing')}
          </button>
        </div>
      )}

      {activeTab === 'calculator' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">{t('serviceType')}</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'airbnb_cleaning', label: t('airbnb'), price: pricing.airbnbCleaning },
                  { id: 'move_in', label: t('moveIn'), price: pricing.moveInCleaning },
                  { id: 'move_out', label: t('moveOut'), price: pricing.moveOutCleaning },
                  { id: 'regular', label: t('regular'), price: pricing.regular },
                  { id: 'esporadico', label: t('esporadico'), price: pricing.esporadico }
                ].map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id as any)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex justify-between items-center ${
                      selectedService === service.id 
                        ? 'border-petrol bg-petrol/5 text-petrol' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="font-bold">{service.label}</span>
                    <span className="text-sm font-medium opacity-70">${service.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 uppercase tracking-wider">{t('extras')}</p>
              <div className="grid grid-cols-1 gap-3">
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

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-petrol text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between sticky top-8 h-fit"
          >
            <div>
              <Calculator className="text-gold mb-4" size={32} />
              <h3 className="text-xl font-bold mb-6">{t('totalRevenue')}</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/70">{t('serviceType')}</span>
                  <span className="font-bold">{t(selectedService as any)}</span>
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
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-white/60 text-sm uppercase tracking-widest mb-1">{t('totalRevenue')}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gold">$</span>
                <span className="text-6xl font-bold">{totalEstimate}</span>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
              <Settings size={20} />
              {t('pricingSettings')}
            </h2>
            <button 
              onClick={handleSavePricing}
              disabled={saving}
              className="btn-primary py-2 px-6 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? t('processing') : t('save')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('serviceType')}</h3>
              <div className="space-y-4">
                {[
                  { id: 'airbnbCleaning', label: t('airbnb'), price: pricing.airbnbCleaning },
                  { id: 'moveInCleaning', label: t('moveIn'), price: pricing.moveInCleaning },
                  { id: 'moveOutCleaning', label: t('moveOut'), price: pricing.moveOutCleaning },
                  { id: 'regular', label: t('regular'), price: pricing.regular },
                  { id: 'esporadico', label: t('esporadico'), price: pricing.esporadico }
                ].map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number" 
                        className="input pl-10" 
                        value={pricing[field.id as keyof PricingSettings]} 
                        onChange={(e) => setPricing({...pricing, [field.id]: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('extras')}</h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'petAddon', label: t('petAddon') },
                  { id: 'windowAddon', label: t('windowAddon') },
                  { id: 'fridgeAddon', label: t('fridgeAddon') },
                  { id: 'ovenAddon', label: t('ovenAddon') },
                  { id: 'bedroomAddon', label: t('bedroomAddon') },
                  { id: 'roomAddon', label: t('roomAddon') },
                  { id: 'bathroomAddon', label: t('bathroomAddon') }
                ].map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number" 
                        className="input pl-10" 
                        value={pricing[field.id as keyof PricingSettings]} 
                        onChange={(e) => setPricing({...pricing, [field.id]: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
