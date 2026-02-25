import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  MoreVertical, 
  ChevronRight,
  User,
  Navigation,
  Play,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  Camera,
  MoreHorizontal,
  ChevronLeft,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { firebaseService } from '../services/firebaseService';
import { JobStatus, AppUser } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function Jobs({ user }: { user: AppUser }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [view, setView] = useState<'List' | 'Calendar'>('List');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'All'>('All');
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState<any | null>(null);
  const { t } = useLanguage();
  
  // Normalize role
  const role = (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) as UserRole;
  
  const [newJob, setNewJob] = useState({
    client_id: '',
    staff_id: '',
    service_type: 'Regular Cleaning',
    service_value: '',
    staff_value: '',
    cleaning_date: format(new Date(), 'yyyy-MM-dd'),
    cleaning_time: '09:00',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    // Subscribe to real-time updates
    const unsubscribe = firebaseService.subscribeToJobs((data) => {
      // Filter jobs based on role and related_id
      if (role === 'Client' && user.related_id) {
        setJobs(data.filter(j => j.client_id === user.related_id));
      } else if (role === 'Staff' && user.related_id) {
        setJobs(data.filter(j => j.staff_id === user.related_id));
      } else if (role === 'Client') {
        // Mocking for demo if no related_id
        firebaseService.getClients().then(clientsData => {
          const mockClientId = clientsData[0]?.id;
          setJobs(data.filter(j => j.client_id === mockClientId));
        });
      } else {
        setJobs(data);
      }
    });
    return () => unsubscribe();
  }, [role, user.related_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffData, clientsData] = await Promise.all([
        firebaseService.getStaff(),
        firebaseService.getClients()
      ]);
      setStaff(staffData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: JobStatus) => {
    try {
      await firebaseService.updateJob(id, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const client = clients.find(c => c.id === newJob.client_id);
      const staffMember = staff.find(s => s.id === newJob.staff_id);

      await firebaseService.addJob({
        ...newJob,
        client_id: newJob.client_id,
        staff_id: newJob.staff_id,
        client_name: client?.name,
        client_address: client?.address,
        staff_name: staffMember?.name,
        service_value: parseFloat(newJob.service_value),
        staff_value: parseFloat(newJob.staff_value),
        status: 'Scheduled'
      });
      
      setIsModalOpen(false);
      setNewJob({
        client_id: '',
        staff_id: '',
        service_type: 'Regular Cleaning',
        service_value: '',
        staff_value: '',
        cleaning_date: format(new Date(), 'yyyy-MM-dd'),
        cleaning_time: '09:00',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding job:', error);
    }
  };

  const filteredJobs = statusFilter === 'All' ? jobs : jobs.filter(j => j.status === statusFilter);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('cleaning_schedule')}</h2>
          <p className="text-slate-500">{t('manage_tasks')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setView('List')}
              className={cn("p-2 rounded-lg transition-all", view === 'List' ? "bg-petroleum text-white" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView('Calendar')}
              className={cn("p-2 rounded-lg transition-all", view === 'Calendar' ? "bg-petroleum text-white" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          {role === 'Admin' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('new_job')}
            </button>
          )}
        </div>
      </header>

      {view === 'List' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(['All', 'Scheduled', 'On the way', 'Started', 'Finished'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all",
                  statusFilter === s 
                    ? "bg-petroleum text-white shadow-lg shadow-petroleum/20" 
                    : "bg-white text-slate-500 border border-slate-200 hover:border-petroleum/30"
                )}
              >
                {t(s.toLowerCase().replace(/ /g, '_'))}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-32"></div>
              ))
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobListItem 
                  key={job.id} 
                  job={job} 
                  role={role} 
                  onStatusUpdate={handleStatusUpdate} 
                  onViewPhotos={() => setSelectedJobForPhotos(job)}
                />
              ))
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-500 font-medium">{t('no_data')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CalendarView jobs={jobs} />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-8">{t('new_job')}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('clients')}</label>
                <select 
                  required
                  className="input-field"
                  value={newJob.client_id}
                  onChange={(e) => setNewJob({...newJob, client_id: e.target.value})}
                >
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('assigned_staff')}</label>
                <select 
                  required
                  className="input-field"
                  value={newJob.staff_id}
                  onChange={(e) => setNewJob({...newJob, staff_id: e.target.value})}
                >
                  <option value="">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('service_type')}</label>
                <select 
                  className="input-field"
                  value={newJob.service_type}
                  onChange={(e) => setNewJob({...newJob, service_type: e.target.value})}
                >
                  <option>Regular Cleaning</option>
                  <option>Deep Clean</option>
                  <option>Move-in/Move-out</option>
                  <option>Airbnb Turnover</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('date')}</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newJob.cleaning_date}
                  onChange={(e) => setNewJob({...newJob, cleaning_date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('time')}</label>
                <input 
                  type="time" 
                  className="input-field" 
                  value={newJob.cleaning_time}
                  onChange={(e) => setNewJob({...newJob, cleaning_time: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('service_value')} ($)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="0.00"
                  value={newJob.service_value}
                  onChange={(e) => setNewJob({...newJob, service_value: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('staff_pay')} ($)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="0.00"
                  value={newJob.staff_value}
                  onChange={(e) => setNewJob({...newJob, staff_value: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('notes')}</label>
                <textarea 
                  className="input-field min-h-[100px]" 
                  placeholder="Special instructions..."
                  value={newJob.notes}
                  onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-4">
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

      {/* Photos Modal */}
      {selectedJobForPhotos && (
        <JobPhotosModal 
          job={selectedJobForPhotos} 
          role={role}
          onClose={() => setSelectedJobForPhotos(null)} 
        />
      )}
    </div>
  );
}

interface JobListItemProps {
  job: any;
  role: 'Admin' | 'Staff' | 'Client';
  onStatusUpdate: (id: string, status: JobStatus) => void | Promise<void>;
  onViewPhotos: () => void;
}

const JobListItem: React.FC<JobListItemProps> = ({ job, role, onStatusUpdate, onViewPhotos }) => {
  const isJobToday = isToday(parseISO(job.cleaning_date));
  const { t } = useLanguage();
  
  const getStatusColor = (status: JobStatus) => {
    switch(status) {
      case 'Scheduled': return 'bg-blue-50 text-blue-600';
      case 'On the way': return 'bg-amber-50 text-amber-600';
      case 'Started': return 'bg-indigo-50 text-indigo-600';
      case 'Finished': return 'bg-emerald-50 text-emerald-600';
      case 'Cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
              getStatusColor(job.status)
            )}>
              {t(job.status.toLowerCase().replace(/ /g, '_'))}
            </span>
            {isJobToday && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-red-50 text-red-500">
                {t('today')}
              </span>
            )}
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-1">{job.client_name}</h4>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{job.cleaning_time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="truncate max-w-[200px]">{job.client_address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>{job.staff_name || t('unassigned')}</span>
            </div>
          </div>
          {job.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{t('notes')}</p>
              <p className="text-xs text-slate-600 italic">"{job.notes}"</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:border-l lg:pl-6 border-slate-100">
          <button 
            onClick={onViewPhotos}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 flex items-center gap-2"
            title="Job Photos"
          >
            <Camera className="w-5 h-5" />
            {job.photos?.length > 0 && (
              <span className="text-xs font-bold bg-petroleum text-white w-4 h-4 rounded-full flex items-center justify-center">
                {job.photos.length}
              </span>
            )}
          </button>

          {role === 'Staff' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-xs text-slate-400 font-medium">{t('staff_pay')}</p>
                <p className="font-bold text-emerald-600">{formatCurrency(job.staff_value)}</p>
              </div>
              {job.status === 'Scheduled' && (
                <button 
                  onClick={() => onStatusUpdate(job.id, 'On the way')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  {t('on_the_way')}
                </button>
              )}
              {job.status === 'On the way' && (
                <button 
                  onClick={() => onStatusUpdate(job.id, 'Started')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {t('started')}
                </button>
              )}
              {job.status === 'Started' && (
                <button 
                  onClick={() => onStatusUpdate(job.id, 'Finished')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('finished')}
                </button>
              )}
            </div>
          )}
          
          {role === 'Client' && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('service_value')}</p>
                <p className="font-bold text-slate-900">{formatCurrency(job.service_value)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('payment_method')}</p>
                <p className="text-xs font-bold text-slate-700">{job.payment_method || 'Not set'}</p>
              </div>
            </div>
          )}
          
          {role === 'Admin' && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('service_value')}</p>
                <p className="font-bold text-slate-900">{formatCurrency(job.service_value)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('staff_pay')}</p>
                <p className="font-bold text-emerald-600">{formatCurrency(job.staff_value)}</p>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JobPhotosModal({ job, role, onClose }: { job: any, role: string, onClose: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(job.photos || []);
  const { t } = useLanguage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await firebaseService.uploadFile(file, `jobs/${job.id}/${file.name}`);
      const updatedPhotos = [...photos, url];
      await firebaseService.updateJob(job.id, { photos: updatedPhotos });
      setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-3xl p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Job Photos</h3>
            <p className="text-slate-500 text-sm">{job.client_name} - {job.cleaning_date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {(role === 'Admin' || role === 'Staff') && (
            <label className={cn(
              "aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-petroleum hover:bg-petroleum/5 transition-all",
              uploading && "opacity-50 pointer-events-none"
            )}>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-petroleum"></div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Photo</span>
                </>
              )}
            </label>
          )}
          
          {photos.map((url, i) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 relative group">
              <img src={url} alt={`Job photo ${i + 1}`} className="w-full h-full object-cover" />
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
              >
                View Full
              </a>
            </div>
          ))}
        </div>

        {photos.length === 0 && !uploading && (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
            <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">{t('no_data')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ jobs }: { jobs: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white rounded-lg border border-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white rounded-lg border border-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayJobs = jobs.filter(j => isSameDay(parseISO(j.cleaning_date), day));
          return (
            <div key={i} className={cn(
              "min-h-[120px] p-2 border-r border-b border-slate-50 hover:bg-slate-50/50 transition-colors",
              !isSameDay(day, new Date()) ? "" : "bg-petroleum/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) ? "bg-petroleum text-white" : "text-slate-400"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayJobs.map(j => (
                  <div key={j.id} className="text-[10px] p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm truncate font-medium text-slate-700">
                    {j.cleaning_time} - {j.client_name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
