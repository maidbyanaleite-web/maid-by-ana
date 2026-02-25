import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  MapPin,
  CheckCircle2,
  Calculator,
  Activity,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Stats, Job, AppUser } from '../types';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Dashboard({ user }: { user: AppUser }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  // Normalize role
  const role = (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) as UserRole;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, jobsData] = await Promise.all([
          firebaseService.getStats(),
          firebaseService.getJobs()
        ]);
        setStats(statsData);
        
        // Filter jobs based on role and related_id
        if (role === 'Client' && user.related_id) {
          setRecentJobs(jobsData.filter(j => j.client_id === user.related_id).slice(0, 5));
        } else if (role === 'Staff' && user.related_id) {
          // Filter by assigned staff
          setRecentJobs(jobsData.filter(j => j.staff_id === user.related_id).slice(0, 5));
        } else if (role === 'Client') {
          // Demo fallback
          setRecentJobs(jobsData.filter(j => j.client_id === jobsData[0]?.client_id).slice(0, 5));
        } else {
          setRecentJobs(jobsData.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role, user.related_id]);

  if (loading) return <div className="flex items-center justify-center h-64">{t('loading')}</div>;

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          {t('welcome')}, {role === 'Admin' ? 'Ana' : role === 'Staff' ? 'Team' : 'Valued Client'}!
        </h2>
        <p className="text-slate-500 mt-1 font-medium">
          {role === 'Client' ? 'View your cleaning services and details.' : role === 'Staff' ? 'Check your assigned tasks and earnings.' : t('manage_tasks')}
        </p>
      </header>

      {/* Stats Grid - Admin Only (Financials) */}
      {role === 'Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title={t('total_revenue')} 
            value={formatCurrency(stats?.revenue || 0)} 
            trend="+12.5%" 
            trendType="up"
            icon={TrendingUp} 
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard 
            title={t('active_jobs')} 
            value={stats?.jobCount.toString() || "0"} 
            trend={t('today')} 
            trendType="up"
            icon={Calendar} 
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard 
            title={t('pending_payments')} 
            value={stats?.pendingPayments?.toString() || "0"} 
            trend="Alert" 
            trendType="down"
            icon={DollarSign} 
            color="text-gold"
            bg="bg-gold/5"
          />
          <StatCard 
            title={t('team')} 
            value={stats?.staffCount?.toString() || "0"} 
            trend="Active" 
            trendType="up"
            icon={Users} 
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
        </div>
      )}

      {/* Stats Grid - Staff Only */}
      {role === 'Staff' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Assigned Jobs" 
            value={recentJobs.length.toString()} 
            trend="Active" 
            trendType="up"
            icon={Calendar} 
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard 
            title="Total Earnings" 
            value={formatCurrency(recentJobs.reduce((acc, j) => acc + (j.staff_value || 0), 0))} 
            trend="Confirmed" 
            trendType="up"
            icon={DollarSign} 
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard 
            title="Completed" 
            value={recentJobs.filter(j => j.status === 'Finished').length.toString()} 
            trend="Success" 
            trendType="up"
            icon={CheckCircle2} 
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
        </div>
      )}

      {/* Stats Grid - Client Only */}
      {role === 'Client' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Next Cleaning" 
            value={recentJobs.find(j => j.status !== 'Finished')?.cleaning_date || 'Not scheduled'} 
            trend="Upcoming" 
            trendType="up"
            icon={Calendar} 
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard 
            title="Total Cleanings" 
            value={recentJobs.length.toString()} 
            trend="History" 
            trendType="up"
            icon={CheckCircle2} 
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard 
            title="Service Value" 
            value={formatCurrency(recentJobs[0]?.service_value || 0)} 
            trend="Per visit" 
            trendType="up"
            icon={DollarSign} 
            color="text-gold"
            bg="bg-gold/5"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-petroleum" />
              {role === 'Client' ? 'Your Cleanings' : t('recent_jobs')}
            </h3>
            <button className="text-sm font-bold text-petroleum hover:underline">{t('view_all')}</button>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {recentJobs.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentJobs.map((job) => (
                  <div key={job.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={ClockBadgeStyle(job.status)}>
                          {job.status === 'Finished' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{job.client_name}</h4>
                          <p className="text-xs text-slate-500 font-medium">{job.service_type}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest",
                        job.status === 'Finished' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {t(job.status.toLowerCase().replace(/ /g, '_'))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{job.client_address}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{job.staff_name || t('unassigned')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-petroleum transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{t('no_data')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Summary */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">{t('actions')}</h3>
          <div className="grid grid-cols-1 gap-4">
            {role !== 'Client' ? (
              <>
                <QuickActionCard 
                  title={t('quotation_calculator')} 
                  description={t('generate_estimates')} 
                  icon={Calculator} 
                  color="bg-gold/10 text-gold" 
                />
                <QuickActionCard 
                  title={t('add_new_client')} 
                  description={t('manage_clients')} 
                  icon={Users} 
                  color="bg-petroleum/10 text-petroleum" 
                />
                <QuickActionCard 
                  title={t('new_job')} 
                  description={t('manage_tasks')} 
                  icon={Calendar} 
                  color="bg-indigo-50 text-indigo-600" 
                />
              </>
            ) : (
              <>
                <QuickActionCard 
                  title="Request Cleaning" 
                  description="Schedule your next visit" 
                  icon={Calendar} 
                  color="bg-indigo-50 text-indigo-600" 
                />
                <QuickActionCard 
                  title="Message Support" 
                  description="Contact Ana directly" 
                  icon={Users} 
                  color="bg-petroleum/10 text-petroleum" 
                />
                <QuickActionCard 
                  title="Payment Methods" 
                  description="Manage how you pay" 
                  icon={DollarSign} 
                  color="bg-gold/10 text-gold" 
                />
              </>
            )}
          </div>

          {role !== 'Client' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{t('team')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Active Staff</span>
                  </div>
                  <span className="font-bold">{stats?.staffCount || 0}</span>
                </div>
                {role === 'Admin' && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-petroleum/10 flex items-center justify-center text-petroleum">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{t('staff_payouts')}</span>
                    </div>
                    <span className="font-bold text-red-500">{formatCurrency(stats?.staffPay || 0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendType, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
          trendType === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trendType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h4 className="text-2xl font-black text-slate-900 mt-1">{value}</h4>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, color }: any) {
  return (
    <button className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-petroleum/30 hover:shadow-md transition-all text-left group">
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 group-hover:text-petroleum transition-colors">{title}</h4>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ClockBadgeStyle(status: string) {
  switch (status) {
    case 'Finished': return "w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center";
    case 'Cancelled': return "w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center";
    case 'On the way': return "w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center";
    case 'Started': return "w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center";
    default: return "w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center";
  }
}
