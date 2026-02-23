import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Calculator, 
  FileText, 
  Settings, 
  LogOut, 
  Plus,
  TrendingUp,
  DollarSign,
  Briefcase,
  Home,
  CheckCircle2,
  Clock,
  ChevronRight,
  Camera,
  Star,
  Search,
  Download,
  MessageSquare,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { io, Socket } from 'socket.io-client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { translations, Language } from './i18n';
import { Client, Service, Stats, UserRole } from './types';
import { cn, formatCurrency } from './lib/utils';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-gold-500 text-white shadow-lg shadow-gold-500/20" 
        : "text-slate-400 hover:bg-teal-800 hover:text-white"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string | number, icon: any, trend?: string, color: string }) => (
  <div className="card flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold mt-1">{value}</h3>
      {trend && <p className="text-xs text-emerald-500 font-medium mt-1">{trend}</p>}
    </div>
    <div className={cn("p-3 rounded-xl", color)}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const InspectionModal = ({ 
  isOpen, 
  onClose, 
  report, 
  t, 
  role, 
  onUpload, 
  onComment, 
  uploading 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  report: any, 
  t: any, 
  role: string, 
  onUpload: (category: string, type: string, files: FileList, comment?: string) => void,
  onComment: (message: string) => void,
  uploading: boolean
}) => {
  const [comment, setComment] = useState('');
  const [activeCategory, setActiveCategory] = useState('entry');

  if (!isOpen || !report) return null;

  const categories = [
    { id: 'entry', label: t.entryPhotos, type: 'entry' },
    { id: 'bedrooms', label: t.categories.bedrooms, type: 'exit' },
    { id: 'kitchen', label: t.categories.kitchen, type: 'exit' },
    { id: 'bathroom', label: t.categories.bathroom, type: 'exit' },
    { id: 'special', label: t.categories.special, type: 'exit' },
    { id: 'audit', label: t.auditPhotos, type: 'audit' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-teal-900 text-white">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Camera size={24} className="text-gold-500" />
              {t.visualInspection}
            </h2>
            <p className="text-teal-300 text-sm">Report ID: #{report.id} • {report.status}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-teal-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Categories */}
          <div className="w-64 border-r border-slate-100 bg-slate-50 p-4 space-y-2 overflow-y-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  activeCategory === cat.id 
                    ? "bg-gold-500 text-white shadow-md" 
                    : "text-slate-500 hover:bg-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Photo Gallery & Upload */}
          <div className="flex-1 p-6 overflow-y-auto space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-teal-900">
                {categories.find(c => c.id === activeCategory)?.label}
              </h3>
              <label className={cn(
                "btn-primary cursor-pointer flex items-center gap-2",
                uploading && "opacity-50 pointer-events-none"
              )}>
                <Plus size={20} />
                {uploading ? "Uploading..." : t.uploadPhotos}
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      const cat = categories.find(c => c.id === activeCategory);
                      onUpload(activeCategory, cat!.type, e.target.files);
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {report.photos?.filter((p: any) => p.category === activeCategory).length > 0 ? (
                report.photos.filter((p: any) => p.category === activeCategory).map((photo: any) => (
                  <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={photo.url} alt="Inspection" className="w-full h-full object-cover" />
                    {photo.comment && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white backdrop-blur-sm">
                        {photo.comment}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t.noPhotosYet}</p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Comments */}
          <div className="w-80 border-l border-slate-100 flex flex-col bg-slate-50">
            <div className="p-4 border-b border-slate-200 bg-white">
              <h4 className="font-bold text-teal-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-gold-500" />
                {t.comments}
              </h4>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {report.comments?.map((c: any) => (
                <div key={c.id} className={cn(
                  "p-3 rounded-2xl text-sm shadow-sm",
                  c.user_role === 'admin' ? "bg-gold-50 border border-gold-100 ml-4" : "bg-white border border-slate-100 mr-4"
                )}>
                  <p className="font-bold text-[10px] uppercase tracking-wider mb-1 text-slate-400">
                    {c.user_role === 'admin' ? t.adminResponse : 'Staff'}
                  </p>
                  <p className="text-teal-900">{c.message}</p>
                  <p className="text-[9px] text-slate-400 mt-2">{format(new Date(c.created_at), 'HH:mm')}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.addComment}
                  className="input-field py-2 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && comment.trim()) {
                      onComment(comment);
                      setComment('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (comment.trim()) {
                      onComment(comment);
                      setComment('');
                    }
                  }}
                  className="p-2 bg-teal-900 text-white rounded-xl hover:bg-teal-800 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ChecklistManager = ({ 
  isOpen, 
  onClose, 
  client, 
  t 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  client: Client | null, 
  t: any 
}) => {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [isRequired, setIsRequired] = useState(true);

  useEffect(() => {
    if (isOpen && client) {
      fetch(`/api/checklists/${client.id}`)
        .then(res => res.json())
        .then(setChecklists);
    }
  }, [isOpen, client]);

  const addChecklist = async () => {
    if (!newName.trim() || !client) return;
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, photo_name: newName, is_required: isRequired })
    });
    const data = await res.json();
    setChecklists([...checklists, { id: data.id, photo_name: newName, is_required: isRequired }]);
    setNewName('');
  };

  const deleteChecklist = async (id: number) => {
    await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
    setChecklists(checklists.filter(c => c.id !== id));
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-teal-900">{t.requiredPhotos}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">{client.name}</p>

        <div className="space-y-4 mb-8">
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.photoName}
              className="input-field"
            />
            <div className="flex items-center gap-2 px-2">
              <input 
                type="checkbox" 
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                id="isRequired"
              />
              <label htmlFor="isRequired" className="text-sm text-slate-600">{t.isRequired}</label>
            </div>
            <button onClick={addChecklist} className="btn-primary w-full justify-center mt-2">
              <Plus size={20} /> {t.addPhotoRequirement}
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {checklists.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-teal-900 text-sm">{c.photo_name}</p>
                {c.is_required ? <span className="text-[10px] text-rose-500 font-bold uppercase">{t.isRequired}</span> : null}
              </div>
              <button onClick={() => deleteChecklist(c.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState<UserRole>('admin');
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [clientType, setClientType] = useState<'regular' | 'airbnb'>('regular');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState({
    brand_name: 'Maid By Ana',
    brand_subtitle: 'Professional Cleaning Services',
    company_address: '123 Cleaning St, Clean City, CL 12345',
    logo_url: '',
    language: 'en' as Language
  });

  const t = translations[settings.language as Language] || translations.en;

  // Reports State
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom'>('month');

  // Inspection State
  const [selectedServiceForInspection, setSelectedServiceForInspection] = useState<Service | null>(null);
  const [inspectionReport, setInspectionReport] = useState<any>(null);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedClientForChecklist, setSelectedClientForChecklist] = useState<Client | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Quotation State
  const [quoteType, setQuoteType] = useState<'hourly' | 'detailed'>('hourly');
  const [hourlyInputs, setHourlyInputs] = useState({ size: '', pets: false, fridge: false, oven: false });
  const [detailedInputs, setDetailedInputs] = useState({ rooms: 0, baths: 0, stairs: 0, windows: 0, blinds: false, fridge: false, oven: false });

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', role);
    });

    newSocket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      // Simple browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notif.title, { body: notif.message });
      }
    });

    newSocket.on('inspection_comment', (comment) => {
      setInspectionReport((prev: any) => {
        if (prev && prev.id === comment.report_id) {
          return { ...prev, comments: [...prev.comments, comment] };
        }
        return prev;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [role]);

  useEffect(() => {
    fetchData();
    fetchNotifications();
    fetchSettings();
    if (role === 'admin') fetchReportData();
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [role]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?role=${role}`);
      setNotifications(await res.json());
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const fetchReportData = async () => {
    try {
      const res = await fetch(`/api/reports/financial?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      setReportData(await res.json());
    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  };

  const fetchInspection = async (serviceId: number) => {
    try {
      const res = await fetch(`/api/inspections/${serviceId}`);
      const data = await res.json();
      setInspectionReport(data);
    } catch (error) {
      console.error("Error fetching inspection:", error);
    }
  };

  const startInspection = async (serviceId: number) => {
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: serviceId })
      });
      const data = await res.json();
      setInspectionReport(data);
      setIsInspectionModalOpen(true);
    } catch (error) {
      console.error("Error starting inspection:", error);
    }
  };

  const uploadInspectionPhotos = async (reportId: number, category: string, type: string, files: FileList, comment?: string) => {
    setUploadingPhotos(true);
    const formData = new FormData();
    formData.append('report_id', reportId.toString());
    formData.append('category', category);
    formData.append('type', type);
    if (comment) formData.append('comment', comment);
    
    Array.from(files).forEach(file => {
      formData.append('photos', file);
    });

    try {
      const res = await fetch('/api/inspections/photos', {
        method: 'POST',
        body: formData
      });
      const newPhotos = await res.json();
      setInspectionReport((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos]
      }));
    } catch (error) {
      console.error("Error uploading photos:", error);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const addInspectionComment = async (reportId: number, message: string) => {
    try {
      await fetch('/api/inspections/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, user_role: role, message })
      });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  useEffect(() => {
    if (role === 'admin' && activeTab === 'reports') {
      fetchReportData();
    }
  }, [dateRange, activeTab]);

  const handleFilterChange = (type: 'week' | 'month' | 'custom') => {
    setFilterType(type);
    const end = new Date();
    let start = new Date();
    
    if (type === 'week') {
      start = addDays(end, -7);
    } else if (type === 'month') {
      start = addDays(end, -30);
    }
    
    if (type !== 'custom') {
      setDateRange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      });
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [clientsRes, servicesRes, statsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/services'),
        fetch('/api/stats')
      ]);
      setClients(await clientsRes.json());
      setServices(await servicesRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const generateReceipt = (service: Service) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(0, 77, 77); // Teal 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(settings.brand_name, 20, 25);
    
    doc.setFontSize(10);
    doc.text(settings.brand_subtitle, 20, 32);
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(t.receipt, 20, 60);
    
    doc.setFontSize(10);
    doc.text(`${t.receipt} #: REC-${service.id}`, 150, 60);
    doc.text(`${t.startDate}: ${format(new Date(), 'MM/dd/yyyy')}`, 150, 65);
    
    doc.line(20, 70, 190, 70);
    
    doc.setFontSize(12);
    doc.text(t.billTo, 20, 85);
    doc.setFont("helvetica", "bold");
    doc.text(service.client_name, 20, 92);
    doc.setFont("helvetica", "normal");
    doc.text(service.client_address || "N/A", 20, 98);
    
    // Table
    (doc as any).autoTable({
      startY: 110,
      head: [[t.description, t.serviceDate, t.amount]],
      body: [
        [
          `${service.service_type.toUpperCase()} Cleaning`,
          format(new Date(service.service_date), 'MM/dd/yyyy'),
          formatCurrency(service.service_value)
        ]
      ],
      headStyles: { fillColor: [0, 77, 77] },
      theme: 'striped'
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text(`${t.total}: ${formatCurrency(service.service_value)}`, 150, finalY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${t.thankYou} ${settings.brand_name}!`, 20, finalY + 20);
    doc.text(settings.company_address, 20, finalY + 26);
    
    doc.save(`Receipt_${service.client_name}_${service.id}.pdf`);
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-teal-900">{t.welcomeBack}, {role === 'admin' ? settings.brand_name.split(' ')[2] || 'Ana' : 'Team'}!</h1>
          <p className="text-slate-500">{t.todaysSchedule}, {format(new Date(), 'MMMM do, yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddingService(true)} className="btn-primary">
            <Plus size={20} /> {t.newService}
          </button>
        </div>
      </div>

      {role === 'admin' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label={t.totalRevenue} value={formatCurrency(stats.revenue)} icon={TrendingUp} color="bg-teal-900" trend="+12% from last month" />
          <StatCard label={t.staffPayments} value={formatCurrency(stats.staffPay)} icon={DollarSign} color="bg-gold-500" />
          <StatCard label={t.netProfit} value={formatCurrency(stats.profit)} icon={Briefcase} color="bg-emerald-600" trend="+8% from last month" />
          <StatCard label={t.activeClients} value={stats.clients} icon={Users} color="bg-indigo-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-teal-900">{t.todaysSchedule}</h2>
              <button className="text-sm text-gold-600 font-semibold hover:underline">{t.viewAll}</button>
            </div>
            <div className="space-y-4">
              {services.filter(s => format(new Date(s.service_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length > 0 ? (
                services.filter(s => format(new Date(s.service_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).map(service => (
                  <div key={service.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", service.client_type === 'airbnb' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600")}>
                        {service.client_type === 'airbnb' ? <Star size={20} /> : <Home size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold">{service.client_name}</h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock size={14} /> {service.service_type} • {service.client_address}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {role === 'admin' ? (
                        <p className="font-bold text-teal-900">{formatCurrency(service.service_value)}</p>
                      ) : (
                        <p className="font-bold text-gold-600">{t.staffPay}: {formatCurrency(service.staff_pay)}</p>
                      )}
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        {service.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                  <p>{t.noServicesToday}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-teal-900 mb-6">{t.quickActions}</h2>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => setIsQuoting(true)} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-gold-500 hover:bg-gold-50 transition-all text-left">
                <div className="p-2 bg-gold-100 text-gold-600 rounded-lg">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{t.newQuotation}</p>
                  <p className="text-xs text-slate-500">Calculate hourly or detailed</p>
                </div>
              </button>
              <button onClick={() => setIsAddingClient(true)} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all text-left">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{t.addClient}</p>
                  <p className="text-xs text-slate-500">Regular or Airbnb property</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-900">{t.clients}</h1>
        <button onClick={() => setIsAddingClient(true)} className="btn-primary">
          <Plus size={20} /> {t.addClient}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search clients..." className="input-field pl-10" />
        </div>
        <select className="input-field w-48">
          <option>All Types</option>
          <option>{t.regular}</option>
          <option>{t.airbnb}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="card hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-xl", client.type === 'airbnb' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600")}>
                {client.type === 'airbnb' ? <Star size={24} /> : <Home size={24} />}
              </div>
              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", client.type === 'airbnb' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600")}>
                {client.type.toUpperCase()}
              </span>
            </div>
            <h3 className="text-xl font-bold text-teal-900 group-hover:text-gold-600 transition-colors">{client.name}</h3>
            {client.type === 'airbnb' && <p className="text-sm font-medium text-slate-600">{client.property_name}</p>}
            <p className="text-sm text-slate-500 mt-2 line-clamp-1">{client.address}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">{t.since} {client.since || 'N/A'}</span>
              <div className="flex gap-2">
                {role === 'admin' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClientForChecklist(client);
                      setIsChecklistModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-gold-600 transition-colors"
                    title={t.requiredPhotos}
                  >
                    <Camera size={16} />
                  </button>
                )}
                <ChevronRight size={16} className="text-slate-300 group-hover:text-gold-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-900">{t.services}</h1>
        <button onClick={() => setIsAddingService(true)} className="btn-primary">
          <Plus size={20} /> {t.newService}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.clients}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.description}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.serviceDate}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.amount}</th>
                {role === 'admin' && <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.staffPay}</th>}
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.status}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {services.map(service => (
                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-teal-900">{service.client_name}</p>
                    <p className="text-xs text-slate-500">{service.client_address}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">{service.service_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{format(new Date(service.service_date), 'MMM dd, yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{formatCurrency(service.service_value)}</p>
                  </td>
                  {role === 'admin' && (
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{formatCurrency(service.staff_pay)}</p>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full",
                      service.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                      service.status === 'completed' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {service.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => generateReceipt(service)} className="p-2 text-slate-400 hover:text-gold-600 transition-colors" title="Download Receipt">
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => startInspection(service.id)} 
                        className="p-2 text-slate-400 hover:text-teal-600 transition-colors" 
                        title={t.visualInspection}
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderQuotation = () => {
    const calculateTotal = () => {
      if (quoteType === 'hourly') {
        let base = 50; // Base per hour
        let hours = parseInt(hourlyInputs.size) || 1;
        let total = base * hours;
        if (hourlyInputs.pets) total += 20;
        if (hourlyInputs.fridge) total += 25;
        if (hourlyInputs.oven) total += 25;
        return total;
      } else {
        let total = 80; // Base call out
        total += detailedInputs.rooms * 30;
        total += detailedInputs.baths * 40;
        total += detailedInputs.stairs * 15;
        total += detailedInputs.windows * 10;
        if (detailedInputs.blinds) total += 30;
        if (detailedInputs.fridge) total += 25;
        if (detailedInputs.oven) total += 25;
        return total;
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-teal-900">Quotation Tool</h1>
          <p className="text-slate-500">Generate professional estimates for potential clients</p>
        </div>

        <div className="flex p-1 bg-slate-200 rounded-xl w-fit mx-auto">
          <button 
            onClick={() => setQuoteType('hourly')}
            className={cn("px-6 py-2 rounded-lg font-bold transition-all", quoteType === 'hourly' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
          >
            Simple (Hourly)
          </button>
          <button 
            onClick={() => setQuoteType('detailed')}
            className={cn("px-6 py-2 rounded-lg font-bold transition-all", quoteType === 'detailed' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
          >
            Detailed (By Room)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card space-y-6">
            <h2 className="text-xl font-bold text-teal-900">Inputs</h2>
            {quoteType === 'hourly' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estimated Hours</label>
                  <input 
                    type="number" 
                    value={hourlyInputs.size} 
                    onChange={e => setHourlyInputs({...hourlyInputs, size: e.target.value})}
                    className="input-field" 
                    placeholder="e.g. 4" 
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Has Pets?</span>
                  <input type="checkbox" checked={hourlyInputs.pets} onChange={e => setHourlyInputs({...hourlyInputs, pets: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Inside Fridge?</span>
                  <input type="checkbox" checked={hourlyInputs.fridge} onChange={e => setHourlyInputs({...hourlyInputs, fridge: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Inside Oven?</span>
                  <input type="checkbox" checked={hourlyInputs.oven} onChange={e => setHourlyInputs({...hourlyInputs, oven: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bedrooms</label>
                    <input type="number" value={detailedInputs.rooms} onChange={e => setDetailedInputs({...detailedInputs, rooms: parseInt(e.target.value) || 0})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bathrooms</label>
                    <input type="number" value={detailedInputs.baths} onChange={e => setDetailedInputs({...detailedInputs, baths: parseInt(e.target.value) || 0})} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Stairs</label>
                    <input type="number" value={detailedInputs.stairs} onChange={e => setDetailedInputs({...detailedInputs, stairs: parseInt(e.target.value) || 0})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Windows</label>
                    <input type="number" value={detailedInputs.windows} onChange={e => setDetailedInputs({...detailedInputs, windows: parseInt(e.target.value) || 0})} className="input-field" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Blinds Cleaning?</span>
                  <input type="checkbox" checked={detailedInputs.blinds} onChange={e => setDetailedInputs({...detailedInputs, blinds: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Inside Fridge?</span>
                  <input type="checkbox" checked={detailedInputs.fridge} onChange={e => setDetailedInputs({...detailedInputs, fridge: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Inside Oven?</span>
                  <input type="checkbox" checked={detailedInputs.oven} onChange={e => setDetailedInputs({...detailedInputs, oven: e.target.checked})} className="w-5 h-5 accent-teal-900" />
                </div>
              </div>
            )}
          </div>

          <div className="card bg-teal-900 text-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-6">Estimated Total</h2>
              <div className="space-y-4">
                <div className="flex justify-between text-teal-100">
                  <span>Base Service</span>
                  <span>{quoteType === 'hourly' ? '$50/hr' : '$80.00'}</span>
                </div>
                {quoteType === 'hourly' ? (
                  <>
                    {hourlyInputs.pets && <div className="flex justify-between text-teal-100"><span>Pet Fee</span><span>$20.00</span></div>}
                    {hourlyInputs.fridge && <div className="flex justify-between text-teal-100"><span>Fridge Extra</span><span>$25.00</span></div>}
                    {hourlyInputs.oven && <div className="flex justify-between text-teal-100"><span>Oven Extra</span><span>$25.00</span></div>}
                  </>
                ) : (
                  <>
                    {detailedInputs.rooms > 0 && <div className="flex justify-between text-teal-100"><span>Bedrooms ({detailedInputs.rooms})</span><span>{formatCurrency(detailedInputs.rooms * 30)}</span></div>}
                    {detailedInputs.baths > 0 && <div className="flex justify-between text-teal-100"><span>Bathrooms ({detailedInputs.baths})</span><span>{formatCurrency(detailedInputs.baths * 40)}</span></div>}
                    {detailedInputs.blinds && <div className="flex justify-between text-teal-100"><span>Blinds Extra</span><span>$30.00</span></div>}
                  </>
                )}
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-teal-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-teal-300 text-sm">Total Estimate</p>
                  <p className="text-4xl font-bold text-gold-500">{formatCurrency(calculateTotal())}</p>
                </div>
                <button className="btn-secondary">
                  <FileText size={20} /> Save Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-teal-900 p-6 flex flex-col gap-8 fixed h-full z-20">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-teal-900">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Briefcase size={24} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">{settings.brand_name}</h2>
            <p className="text-teal-400 text-xs font-medium uppercase tracking-wider">{settings.brand_subtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label={t.clients} active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={Calendar} label={t.services} active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          <SidebarItem icon={Calculator} label={t.quotation} active={activeTab === 'quotation'} onClick={() => setActiveTab('quotation')} />
          <SidebarItem icon={FileText} label={t.reports} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          {role === 'admin' && (
            <SidebarItem icon={Settings} label={t.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          )}
        </nav>

        <div className="pt-6 border-t border-teal-800 space-y-2">
          <div className="px-4 py-3 bg-teal-800/50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-teal-900 font-bold text-sm">
              {role === 'admin' ? 'A' : 'S'}
            </div>
            <div>
              <p className="text-white text-sm font-bold">{role === 'admin' ? settings.brand_name.split(' ')[2] || 'Ana' : 'Staff Member'}</p>
              <p className="text-teal-400 text-xs capitalize">{role === 'admin' ? t.admin : t.staff}</p>
            </div>
          </div>
          <button 
            onClick={() => setRole(role === 'admin' ? 'staff' : 'admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-teal-400 hover:text-white transition-colors text-sm"
          >
            <Settings size={18} />
            <span>{t.switchRole} {role === 'admin' ? t.staff : t.admin}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-rose-300 transition-colors text-sm">
            <LogOut size={18} />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        <header className="flex justify-end mb-8 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-teal-900 transition-colors relative"
          >
            <Clock size={20} />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-teal-900">{t.notifications}</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400 hover:text-teal-900">{t.close}</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markAsRead(n.id)}
                        className={cn(
                          "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors",
                          !n.is_read && "bg-teal-50/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg mt-1",
                            n.type === 'service_reminder' ? "bg-blue-100 text-blue-600" :
                            n.type === 'payment_due' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {n.type === 'service_reminder' ? <Calendar size={14} /> : 
                             n.type === 'payment_due' ? <DollarSign size={14} /> : <Calculator size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-teal-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{format(new Date(n.created_at), 'MMM dd, HH:mm')}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <Clock size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t.noNotifications}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'clients' && renderClients()}
            {activeTab === 'services' && renderServices()}
            {activeTab === 'quotation' && renderQuotation()}
            {activeTab === 'reports' && role === 'admin' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-teal-900">{t.financialReports}</h1>
                    <p className="text-slate-500">Analyze your business performance and growth</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button 
                      onClick={() => handleFilterChange('week')}
                      className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterType === 'week' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                    >
                      {t.lastWeek}
                    </button>
                    <button 
                      onClick={() => handleFilterChange('month')}
                      className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterType === 'month' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                    >
                      {t.lastMonth}
                    </button>
                    <button 
                      onClick={() => handleFilterChange('custom')}
                      className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterType === 'custom' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                    >
                      {t.custom}
                    </button>
                  </div>
                </div>

                {filterType === 'custom' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-end bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.startDate}</label>
                      <input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="input-field py-1" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.endDate}</label>
                      <input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="input-field py-1" 
                      />
                    </div>
                  </motion.div>
                )}

                {reportData && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="card bg-teal-900 text-white">
                        <p className="text-teal-300 text-sm font-medium">Total Revenue</p>
                        <h3 className="text-3xl font-bold mt-1">{formatCurrency(reportData.summary.revenue)}</h3>
                        <div className="mt-4 flex items-center gap-2 text-xs text-teal-400">
                          <TrendingUp size={14} />
                          <span>For selected period</span>
                        </div>
                      </div>
                      <div className="card">
                        <p className="text-slate-500 text-sm font-medium">Staff Payments</p>
                        <h3 className="text-3xl font-bold mt-1 text-teal-900">{formatCurrency(reportData.summary.staffPay)}</h3>
                        <div className="mt-4 flex items-center gap-2 text-xs text-rose-500">
                          <DollarSign size={14} />
                          <span>Total expenses</span>
                        </div>
                      </div>
                      <div className="card border-gold-500/30 bg-gold-50/30">
                        <p className="text-gold-700 text-sm font-medium">Net Profit</p>
                        <h3 className="text-3xl font-bold mt-1 text-gold-600">{formatCurrency(reportData.summary.profit)}</h3>
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
                          <Briefcase size={14} />
                          <span>Available margin</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="card">
                        <h3 className="text-lg font-bold text-teal-900 mb-6">Revenue vs Profit</h3>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={reportData.dailyData}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#004d4d" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#004d4d" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(str) => format(new Date(str), 'MMM dd')}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(val) => `$${val}`}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                labelFormatter={(str) => format(new Date(str), 'MMMM dd, yyyy')}
                              />
                              <Legend verticalAlign="top" height={36}/>
                              <Area type="monotone" dataKey="revenue" stroke="#004d4d" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                              <Area type="monotone" dataKey="profit" stroke="#d4af37" strokeWidth={3} fillOpacity={1} fill="url(#colorProf)" name="Net Profit" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="card">
                        <h3 className="text-lg font-bold text-teal-900 mb-6">Staff Expenses</h3>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData.dailyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(str) => format(new Date(str), 'MMM dd')}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(val) => `$${val}`}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                labelFormatter={(str) => format(new Date(str), 'MMMM dd, yyyy')}
                              />
                              <Bar dataKey="staffPay" fill="#004d4d" radius={[4, 4, 0, 0]} name="Staff Payments" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'reports' && role === 'staff' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <FileText size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-bold">Access Restricted</h2>
                <p>Only administrators can view financial reports.</p>
              </div>
            )}
            {activeTab === 'settings' && role === 'admin' && (
              <div className="max-w-2xl mx-auto space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-teal-900">{t.settings}</h1>
                  <p className="text-slate-500">Manage your brand identity and company information</p>
                </div>

                <div className="card space-y-6">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData.entries());
                    saveSettings(data);
                  }} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.brandName}</label>
                        <input name="brand_name" type="text" defaultValue={settings.brand_name} className="input-field" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.brandSubtitle}</label>
                        <input name="brand_subtitle" type="text" defaultValue={settings.brand_subtitle} className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.companyAddress}</label>
                        <textarea name="company_address" defaultValue={settings.company_address} className="input-field min-h-[100px]" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.logoUrl}</label>
                        <input name="logo_url" type="url" defaultValue={settings.logo_url} className="input-field" placeholder="https://example.com/logo.png" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.language}</label>
                        <select name="language" defaultValue={settings.language} className="input-field">
                          <option value="en">{t.english}</option>
                          <option value="pt">{t.portuguese}</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button type="submit" className="btn-primary">
                        {t.saveSettings}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="card bg-gold-50 border-gold-200">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gold-500 text-white rounded-xl h-fit">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gold-900">Receipt Preview</h4>
                      <p className="text-sm text-gold-700 mt-1">These settings will be automatically applied to all generated PDF receipts and the application header.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals (Simplified for brevity) */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-teal-900 mb-6">{t.addClient}</h2>
            <form className="space-y-4" onSubmit={async (e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...data,
                  type: clientType,
                  since: format(new Date(), 'yyyy-MM-dd')
                })
              });
              setIsAddingClient(false); 
              fetchData(); 
            }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  type="button" 
                  onClick={() => setClientType('regular')}
                  className={cn("p-3 border-2 rounded-xl font-bold transition-all", clientType === 'regular' ? "border-teal-900 bg-teal-50 text-teal-900" : "border-slate-100 text-slate-400")}
                >
                  {t.regular}
                </button>
                <button 
                  type="button" 
                  onClick={() => setClientType('airbnb')}
                  className={cn("p-3 border-2 rounded-xl font-bold transition-all", clientType === 'airbnb' ? "border-rose-500 bg-rose-50 text-rose-500" : "border-slate-100 text-slate-400")}
                >
                  {t.airbnb}
                </button>
              </div>
              
              <div className="space-y-3">
                <input name="name" type="text" placeholder={clientType === 'airbnb' ? t.ownerName : t.clientName} className="input-field" required />
                {clientType === 'airbnb' && (
                  <>
                    <input name="property_name" type="text" placeholder={t.propertyName} className="input-field" required />
                    <input name="property_link" type="url" placeholder="Airbnb Link" className="input-field" />
                  </>
                )}
                <input name="address" type="text" placeholder={t.address} className="input-field" required />
                <div className="grid grid-cols-2 gap-4">
                  <input name="email" type="email" placeholder={t.email} className="input-field" />
                  <input name="phone" type="tel" placeholder={t.phone} className="input-field" />
                </div>
                <select name="frequency" className="input-field">
                  <option value="weekly">{t.weekly}</option>
                  <option value="biweekly">{t.biweekly}</option>
                  <option value="monthly">{t.monthly}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsAddingClient(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold">{t.cancel}</button>
                <button type="submit" className="flex-1 btn-primary justify-center">{t.saveClient}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isAddingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-teal-900 mb-6">{t.scheduleService}</h2>
            <form className="space-y-4" onSubmit={async (e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  client_id: parseInt(data.client_id as string),
                  service_type: data.service_type,
                  service_date: data.service_date,
                  service_value: parseFloat(data.service_value as string),
                  staff_pay: parseFloat(data.staff_pay as string),
                  payment_method: 'Pending',
                  extras: []
                })
              });
              setIsAddingService(false); 
              fetchData(); 
            }}>
              <select name="client_id" className="input-field" required>
                <option value="">{t.selectClient}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select name="service_type" className="input-field" required>
                <option value="Regular Cleaning">Regular Cleaning</option>
                <option value="Deep Clean">Deep Clean</option>
                <option value="Move-in / Move-out">Move-in / Move-out</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input name="service_date" type="date" className="input-field" required />
                <input name="service_value" type="number" step="0.01" placeholder={t.serviceValue} className="input-field" required />
              </div>
              <input name="staff_pay" type="number" step="0.01" placeholder={t.staffPay} className="input-field" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingService(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold">{t.cancel}</button>
                <button type="submit" className="flex-1 btn-primary justify-center">{t.schedule}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <InspectionModal 
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        report={inspectionReport}
        t={t}
        role={role}
        onUpload={(category, type, files) => uploadInspectionPhotos(inspectionReport.id, category, type, files)}
        onComment={(msg) => addInspectionComment(inspectionReport.id, msg)}
        uploading={uploadingPhotos}
      />

      <ChecklistManager 
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        client={selectedClientForChecklist}
        t={t}
      />
    </div>
  );
}
