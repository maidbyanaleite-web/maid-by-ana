import React, { useState } from 'react';
import { 
  Calculator, 
  Clock, 
  LayoutGrid, 
  Plus, 
  Check,
  Info,
  DollarSign,
  Dog,
  Wind
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Quotations() {
  const [mode, setMode] = useState<'Hourly' | 'Detailed'>('Hourly');
  const { t } = useLanguage();
  
  // Hourly Inputs
  const [hourlyInputs, setHourlyInputs] = useState({
    hours: 2,
    rate: 45,
    hasPets: false,
    extraFridge: false,
    extraOven: false
  });

  // Detailed Inputs
  const [detailedInputs, setDetailedInputs] = useState({
    bedrooms: 1,
    bathrooms: 1,
    stairs: 0,
    windows: 0,
    blinds: 0,
    fridge: false,
    oven: false
  });

  const calculateHourly = () => {
    let total = hourlyInputs.hours * hourlyInputs.rate;
    if (hourlyInputs.hasPets) total += 15;
    if (hourlyInputs.extraFridge) total += 25;
    if (hourlyInputs.extraOven) total += 25;
    return total;
  };

  const calculateDetailed = () => {
    let total = 80; // Base price
    total += detailedInputs.bedrooms * 20;
    total += detailedInputs.bathrooms * 30;
    total += detailedInputs.stairs * 15;
    total += detailedInputs.windows * 10;
    total += detailedInputs.blinds * 5;
    if (detailedInputs.fridge) total += 25;
    if (detailedInputs.oven) total += 25;
    return total;
  };

  const currentTotal = mode === 'Hourly' ? calculateHourly() : calculateDetailed();

  const handleSaveQuotation = async () => {
    try {
      await firebaseService.addQuotation({
        type: mode,
        inputs: JSON.stringify(mode === 'Hourly' ? hourlyInputs : detailedInputs),
        total_value: currentTotal,
        status: 'Pending',
        created_at: new Date().toISOString()
      });
      alert(t('save') + '!');
    } catch (error) {
      console.error('Error saving quotation:', error);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('quotation_calculator')}</h2>
        <p className="text-slate-500">{t('generate_estimates')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
            <button
              onClick={() => setMode('Hourly')}
              className={cn(
                "flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                mode === 'Hourly' ? "bg-white text-petroleum shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Clock className="w-4 h-4" /> Hourly (Simple)
            </button>
            <button
              onClick={() => setMode('Detailed')}
              className={cn(
                "flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                mode === 'Detailed' ? "bg-white text-petroleum shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Detailed (Rooms)
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            {mode === 'Hourly' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('time')}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={hourlyInputs.hours}
                      onChange={(e) => setHourlyInputs({...hourlyInputs, hours: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('service_value')} ($)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={hourlyInputs.rate}
                      onChange={(e) => setHourlyInputs({...hourlyInputs, rate: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{t('actions')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ToggleButton 
                      active={hourlyInputs.hasPets} 
                      onClick={() => setHourlyInputs({...hourlyInputs, hasPets: !hourlyInputs.hasPets})}
                      label="Pets"
                      icon={Dog}
                    />
                    <ToggleButton 
                      active={hourlyInputs.extraFridge} 
                      onClick={() => setHourlyInputs({...hourlyInputs, extraFridge: !hourlyInputs.extraFridge})}
                      label="Fridge"
                      icon={Wind}
                    />
                    <ToggleButton 
                      active={hourlyInputs.extraOven} 
                      onClick={() => setHourlyInputs({...hourlyInputs, extraOven: !hourlyInputs.extraOven})}
                      label="Oven"
                      icon={Wind}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Counter 
                    label="Bedrooms" 
                    value={detailedInputs.bedrooms} 
                    onChange={(v) => setDetailedInputs({...detailedInputs, bedrooms: v})} 
                  />
                  <Counter 
                    label="Bathrooms" 
                    value={detailedInputs.bathrooms} 
                    onChange={(v) => setDetailedInputs({...detailedInputs, bathrooms: v})} 
                  />
                  <Counter 
                    label="Stairs" 
                    value={detailedInputs.stairs} 
                    onChange={(v) => setDetailedInputs({...detailedInputs, stairs: v})} 
                  />
                  <Counter 
                    label="Windows" 
                    value={detailedInputs.windows} 
                    onChange={(v) => setDetailedInputs({...detailedInputs, windows: v})} 
                  />
                  <Counter 
                    label="Blinds" 
                    value={detailedInputs.blinds} 
                    onChange={(v) => setDetailedInputs({...detailedInputs, blinds: v})} 
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Kitchen Extras</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleButton 
                      active={detailedInputs.fridge} 
                      onClick={() => setDetailedInputs({...detailedInputs, fridge: !detailedInputs.fridge})}
                      label="Interior Fridge"
                      icon={Wind}
                    />
                    <ToggleButton 
                      active={detailedInputs.oven} 
                      onClick={() => setDetailedInputs({...detailedInputs, oven: !detailedInputs.oven})}
                      label="Interior Oven"
                      icon={Wind}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-petroleum rounded-2xl p-8 text-white shadow-xl shadow-petroleum/20 sticky top-24">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gold" />
              {t('quotation_calculator')}
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-white/70 text-sm">
                <span>Base Service</span>
                <span>{formatCurrency(mode === 'Hourly' ? hourlyInputs.hours * hourlyInputs.rate : 80)}</span>
              </div>
              {mode === 'Hourly' && hourlyInputs.hasPets && (
                <div className="flex justify-between text-white/70 text-sm">
                  <span>Pet Fee</span>
                  <span>$15.00</span>
                </div>
              )}
              {((mode === 'Hourly' && (hourlyInputs.extraFridge || hourlyInputs.extraOven)) || 
                (mode === 'Detailed' && (detailedInputs.fridge || detailedInputs.oven))) && (
                <div className="flex justify-between text-white/70 text-sm">
                  <span>Kitchen Extras</span>
                  <span>{formatCurrency((mode === 'Hourly' ? (hourlyInputs.extraFridge ? 25 : 0) + (hourlyInputs.extraOven ? 25 : 0) : (detailedInputs.fridge ? 25 : 0) + (detailedInputs.oven ? 25 : 0)))}</span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
              <div>
                <p className="text-xs text-gold font-bold uppercase tracking-widest">{t('total_revenue')}</p>
                <h4 className="text-4xl font-black mt-1">{formatCurrency(currentTotal)}</h4>
              </div>
            </div>

            <button 
              onClick={handleSaveQuotation}
              className="w-full btn-secondary justify-center mt-8 py-4 text-petroleum font-black"
            >
              Generate PDF Quote
            </button>
            
            <p className="text-[10px] text-white/40 text-center mt-4">
              * This is an estimate. Final price may vary based on actual condition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
        active 
          ? "bg-petroleum/5 border-petroleum text-petroleum font-bold" 
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center",
        active ? "bg-petroleum text-white" : "bg-slate-100 text-slate-400"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm">{label}</span>
      {active && <Check className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function Counter({ label, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
        <button 
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-petroleum hover:bg-white rounded-lg transition-all"
        >
          -
        </button>
        <span className="flex-1 text-center font-bold text-slate-900">{value}</span>
        <button 
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-petroleum hover:bg-white rounded-lg transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
