import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Search,
  CheckCircle2,
  Clock,
  Printer
} from 'lucide-react';
import { Job, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Reports() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'Single' | 'Bi-weekly' | 'Monthly'>('Single');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsData, clientsData] = await Promise.all([
        firebaseService.getJobs(),
        firebaseService.getClients()
      ]);
      setJobs(jobsData.filter((j: any) => j.status === 'Finished'));
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(j => {
    if (!selectedClientId) return false;
    if (j.client_id !== selectedClientId) return false;
    
    // For simplicity, we'll just show all completed for now
    // In a real app, we'd filter by date range based on reportType
    return true;
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const downloadPDF = async () => {
    if (!receiptRef.current) return;
    
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Receipt_${selectedClient?.name || 'Client'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('reports')}</h2>
          <p className="text-slate-500">{t('generate_estimates')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-petroleum" />
              {t('actions')}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('type')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['Single', 'Bi-weekly', 'Monthly'] as const).map((t_type) => (
                    <button
                      key={t_type}
                      onClick={() => setReportType(t_type)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium text-left transition-all border",
                        reportType === t_type 
                          ? "bg-petroleum/5 border-petroleum text-petroleum font-bold" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {t_type} Receipt
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('client')}</label>
                <select 
                  className="input-field"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">{t('view_all')}...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClientId && (
              <button 
                onClick={downloadPDF}
                className="w-full btn-primary justify-center py-3"
              >
                <Download className="w-5 h-5" />
                Download PDF Receipt
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedClientId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Receipt Preview</h3>
                <span className="text-xs text-slate-400 italic">This is how the PDF will look</span>
              </div>
              
              {/* Receipt Preview Area */}
              <div className="bg-slate-200 p-8 rounded-2xl overflow-x-auto">
                <div 
                  ref={receiptRef}
                  className="bg-white w-[210mm] min-h-[297mm] mx-auto p-12 shadow-2xl text-slate-800"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {/* Receipt Header */}
                  <div className="flex justify-between items-start border-b-4 border-petroleum pb-8 mb-10">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-petroleum rounded-full flex items-center justify-center">
                          <FileText className="text-gold w-7 h-7" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-black text-petroleum tracking-tighter">MAID BY ANA</h1>
                          <p className="text-xs font-bold text-gold uppercase tracking-widest">Premium Cleaning Services</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 space-y-1">
                        <p>123 Cleaning St, Suite 100</p>
                        <p>City, State 12345</p>
                        <p>ana@maidbyana.com | (555) 000-0000</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-5xl font-black text-slate-200 mb-4">RECEIPT</h2>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-bold">{t('date')}:</span> {format(new Date(), 'MMMM dd, yyyy')}</p>
                        <p><span className="font-bold">Receipt #:</span> {Math.floor(100000 + Math.random() * 900000)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                      <h4 className="text-xs font-black text-petroleum uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">BILL TO</h4>
                      <p className="text-xl font-bold text-slate-900">{selectedClient?.name}</p>
                      <p className="text-slate-500 mt-1">{selectedClient?.address}</p>
                      <p className="text-slate-500">{selectedClient?.email}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <h4 className="text-xs font-black text-petroleum uppercase tracking-widest mb-3">SUMMARY</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{t('type')}:</span>
                          <span className="font-bold">{reportType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{t('jobs')}:</span>
                          <span className="font-bold">{filteredJobs.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full mb-12">
                    <thead>
                      <tr className="bg-petroleum text-white">
                        <th className="text-left py-4 px-6 rounded-l-xl font-bold uppercase text-xs tracking-widest">{t('date')}</th>
                        <th className="text-left py-4 px-6 font-bold uppercase text-xs tracking-widest">{t('notes')}</th>
                        <th className="text-right py-4 px-6 rounded-r-xl font-bold uppercase text-xs tracking-widest">{t('service_value')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredJobs.map((job) => (
                        <tr key={job.id}>
                          <td className="py-4 px-6 text-sm font-medium">{format(new Date(job.cleaning_date), 'MMM dd, yyyy')}</td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-bold text-slate-900">{job.service_type} Cleaning</p>
                            <p className="text-xs text-slate-400 mt-0.5">{job.notes || 'Standard professional cleaning'}</p>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(job.service_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mb-20">
                    <div className="w-64 space-y-3">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(filteredJobs.reduce((acc, j) => acc + j.service_value, 0))}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax (0%)</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-petroleum">
                        <span className="text-petroleum font-black uppercase tracking-widest text-sm">Total Paid</span>
                        <span className="text-2xl font-black text-slate-900">
                          {formatCurrency(filteredJobs.reduce((acc, j) => acc + j.service_value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-12 border-t border-slate-100 text-center">
                    <p className="text-petroleum font-bold mb-2">Thank you for choosing Maid By Ana!</p>
                    <p className="text-xs text-slate-400">If you have any questions about this receipt, please contact us.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">{t('no_data')}</h4>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                Select a client and report type from the left panel to preview and download their receipt.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
