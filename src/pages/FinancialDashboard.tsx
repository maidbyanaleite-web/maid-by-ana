import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { cn, formatCurrency } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function FinancialDashboard() {
  const [range, setRange] = useState<'Week' | 'Month' | 'Custom'>('Month');
  const [dates, setDates] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await firebaseService.getFilteredStats(dates.start, dates.end);
        setStats(data);
      } catch (error) {
        console.error('Error fetching filtered stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [dates]);

  const handleRangeChange = (newRange: 'Week' | 'Month' | 'Custom') => {
    setRange(newRange);
    const now = new Date();
    if (newRange === 'Week') {
      setDates({
        start: format(startOfWeek(now), 'yyyy-MM-dd'),
        end: format(endOfWeek(now), 'yyyy-MM-dd')
      });
    } else if (newRange === 'Month') {
      setDates({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('reports')}</h2>
          <p className="text-slate-500">{t('manage_tasks')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {(['Week', 'Month', 'Custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                range === r ? "bg-petroleum text-white shadow-md" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t(r.toLowerCase())}
            </button>
          ))}
        </div>
      </header>

      {range === 'Custom' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('date')}</label>
            <input 
              type="date" 
              className="input-field py-1.5" 
              value={dates.start}
              onChange={(e) => setDates({...dates, start: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('date')}</label>
            <input 
              type="date" 
              className="input-field py-1.5" 
              value={dates.end}
              onChange={(e) => setDates({...dates, end: e.target.value})}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-petroleum"></div>
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard 
              title={t('total_revenue')} 
              value={formatCurrency(stats.revenue)} 
              icon={TrendingUp} 
              color="text-petroleum"
              bg="bg-petroleum/5"
            />
            <SummaryCard 
              title={t('staff_payouts')} 
              value={formatCurrency(stats.staffPay)} 
              icon={Users} 
              color="text-gold"
              bg="bg-gold/5"
            />
            <SummaryCard 
              title={t('total_revenue')} 
              value={formatCurrency(stats.profit)} 
              icon={DollarSign} 
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-petroleum" />
                  {t('total_revenue')} vs {t('staff_payouts')}
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-petroleum rounded-full"></div>
                    <span className="text-slate-500">{t('total_revenue')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gold rounded-full"></div>
                    <span className="text-slate-500">{t('staff_payouts')}</span>
                  </div>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(str) => format(new Date(str), 'MMM d')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), '']}
                    />
                    <Bar dataKey="revenue" fill="#004d4d" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="staffPay" fill="#d4af37" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-emerald-600" />
                  Profit Trend
                </h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(str) => format(new Date(str), 'MMM d')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Net Profit']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", bg, color)}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h4 className="text-3xl font-black text-slate-900 mt-1">{value}</h4>
    </div>
  );
}
