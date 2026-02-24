import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Clock, Home, CheckCircle2, DollarSign } from 'lucide-react';

export default function Budget() {
  const [flow, setFlow] = useState<'hourly' | 'detailed'>('hourly');
  
  // Hourly Flow State
  const [houseSize, setHouseSize] = useState(1500);
  const [hasPets, setHasPets] = useState(false);
  const [hourlyExtras, setHourlyExtras] = useState({ fridge: false, oven: false });
  
  // Detailed Flow State
  const [rooms, setRooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [stairs, setStairs] = useState(0);
  const [windows, setWindows] = useState(0);
  const [blinds, setBlinds] = useState(0);
  const [detailedExtras, setDetailedExtras] = useState({ fridge: false, oven: false });

  const HOURLY_RATE = 45;
  const SQFT_PER_HOUR = 500;
  
  const calculateHourly = () => {
    let baseHours = houseSize / SQFT_PER_HOUR;
    if (hasPets) baseHours += 0.5;
    if (hourlyExtras.fridge) baseHours += 0.5;
    if (hourlyExtras.oven) baseHours += 0.5;
    
    return {
      time: Math.ceil(baseHours),
      total: Math.ceil(baseHours) * HOURLY_RATE
    };
  };

  const calculateDetailed = () => {
    let total = 0;
    total += rooms * 30;
    total += bathrooms * 40;
    total += stairs * 15;
    total += windows * 10;
    total += blinds * 15;
    if (detailedExtras.fridge) total += 25;
    if (detailedExtras.oven) total += 25;
    return total;
  };

  const hourlyResult = calculateHourly();
  const detailedResult = calculateDetailed();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-petrol">Budget Calculator</h1>
        <p className="text-slate-500">Estimate cleaning costs for new clients.</p>
      </header>

      <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
        <button 
          onClick={() => setFlow('hourly')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${flow === 'hourly' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
        >
          <Clock size={18} />
          Hourly Flow
        </button>
        <button 
          onClick={() => setFlow('detailed')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${flow === 'detailed' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
        >
          <Home size={18} />
          Detailed Flow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card space-y-6">
          {flow === 'hourly' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">House Size (sqft)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={houseSize} 
                  onChange={(e) => setHouseSize(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="pets" 
                  checked={hasPets} 
                  onChange={(e) => setHasPets(e.target.checked)}
                  className="w-5 h-5 accent-petrol"
                />
                <label htmlFor="pets" className="text-slate-700">Has Pets?</label>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Extras</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={hourlyExtras.fridge} 
                      onChange={(e) => setHourlyExtras({...hourlyExtras, fridge: e.target.checked})}
                      className="accent-petrol"
                    />
                    Fridge
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={hourlyExtras.oven} 
                      onChange={(e) => setHourlyExtras({...hourlyExtras, oven: e.target.checked})}
                      className="accent-petrol"
                    />
                    Oven
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
                <input type="number" className="input" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label>
                <input type="number" className="input" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Stairs</label>
                <input type="number" className="input" value={stairs} onChange={(e) => setStairs(Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Windows</label>
                <input type="number" className="input" value={windows} onChange={(e) => setWindows(Number(e.target.value))} />
              </div>
              <div className="col-span-2 space-y-3">
                <p className="text-sm font-medium text-slate-700">Extras</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={detailedExtras.fridge} onChange={(e) => setDetailedExtras({...detailedExtras, fridge: e.target.checked})} className="accent-petrol" />
                    Fridge
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={detailedExtras.oven} onChange={(e) => setDetailedExtras({...detailedExtras, oven: e.target.checked})} className="accent-petrol" />
                    Oven
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <motion.div 
          key={flow}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-petrol text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <Calculator className="text-gold mb-4" size={32} />
            <h3 className="text-xl font-bold mb-6">Estimated Investment</h3>
            
            <div className="space-y-4">
              {flow === 'hourly' ? (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/70">Estimated Time</span>
                    <span className="font-bold">{hourlyResult.time} Hours</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/70">Hourly Rate</span>
                    <span className="font-bold">${HOURLY_RATE}/hr</span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Detailed breakdown applied</span>
                    <CheckCircle2 size={16} className="text-gold" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-white/60 text-sm uppercase tracking-widest mb-1">Total Estimate</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gold">$</span>
              <span className="text-6xl font-bold">{flow === 'hourly' ? hourlyResult.total : detailedResult}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
