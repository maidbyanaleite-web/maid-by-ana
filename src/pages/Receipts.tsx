import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Client } from '../types';
import { 
  FileText, 
  Download, 
  Search,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { generateReceipt, generateBatchReceipt } from '../utils/pdfGenerator';
import { format } from 'date-fns';

type ReceiptType = 'single' | 'biweekly' | 'monthly';

export default function Receipts() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('single');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = db.collection('clients').onSnapshot((snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleDownload = () => {
    if (!selectedClient) return;

    if (receiptType === 'single') {
      generateReceipt(selectedClient, format(new Date(), 'yyyy-MM-dd'), selectedClient.serviceValue);
    } else {
      // For batch receipts, we'd ideally fetch actual cleaning dates, 
      // but for now we'll simulate based on frequency or last cleanings
      const period = receiptType === 'biweekly' ? 'Bi-weekly' : 'Monthly';
      const count = receiptType === 'biweekly' ? 2 : 4;
      const dates = Array.from({ length: count }).map((_, i) => 
        format(new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      );
      generateBatchReceipt(selectedClient, dates, selectedClient.serviceValue * count, period);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-petrol">{t('reports')}</h1>
        <p className="text-slate-500">{t('generateAccurateEstimates')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actions Sidebar */}
        <div className="card space-y-6 h-fit">
          <div className="flex items-center gap-2 text-petrol font-bold border-b pb-4">
            <Filter size={20} />
            {t('actions')}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('type')}</label>
              <div className="flex flex-col gap-2">
                {(['single', 'biweekly', 'monthly'] as ReceiptType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReceiptType(type)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border ${
                      receiptType === type 
                        ? 'bg-petrol/5 border-petrol text-petrol shadow-sm' 
                        : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {t(type + 'Receipt' as any)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('client')}</label>
              <select 
                className="input"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">{t('allClients')}...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <button 
                onClick={handleDownload}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4 mt-4"
              >
                <Download size={20} />
                {t('downloadReceipt')}
              </button>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-petrol">{t('receiptPreview')}</h2>
            <span className="text-[10px] text-slate-400 italic">This is how the PDF will look</span>
          </div>

          {selectedClient ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[600px] flex flex-col"
            >
              {/* Receipt Header */}
              <div className="p-12 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-petrol rounded-2xl flex items-center justify-center text-gold">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-petrol tracking-tight">MAID BY ANA</h2>
                    <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Premium Cleaning Services</p>
                    <div className="mt-4 text-[10px] text-slate-400 space-y-1">
                      <p>123 Cleaning St, Suite 100</p>
                      <p>City, State 12345</p>
                      <p>ana@maidbyana.com | (555) 000-0000</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-6xl font-black text-slate-100 tracking-tighter mb-4">RECEIPT</h1>
                  <p className="text-sm font-bold text-petrol">Data: <span className="text-slate-400 font-medium">{format(new Date(), 'MMMM dd, yyyy')}</span></p>
                  <p className="text-sm font-bold text-petrol">Receipt #: <span className="text-slate-400 font-medium">{Math.floor(Math.random() * 900000) + 100000}</span></p>
                </div>
              </div>

              <div className="px-12 py-8 border-t border-petrol border-b-4 border-b-petrol grid grid-cols-2 gap-12">
                <div>
                  <h3 className="text-[10px] font-black text-petrol uppercase tracking-widest mb-4">{t('billTo')}</h3>
                  <p className="text-2xl font-black text-petrol">{selectedClient.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{selectedClient.email}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="text-[10px] font-black text-petrol uppercase tracking-widest mb-4">{t('summary')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">type:</span>
                      <span className="font-bold text-petrol capitalize">{receiptType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Agenda:</span>
                      <span className="font-bold text-petrol">{receiptType === 'single' ? 1 : receiptType === 'biweekly' ? 2 : 4}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t('paymentMethod')}:</span>
                      <span className="font-bold text-petrol capitalize">{selectedClient.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t('status')}:</span>
                      <span className="font-bold text-emerald-500">{t('paid')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto p-12 flex justify-between items-end">
                <div className="max-w-xs">
                  <div className="bg-petrol text-white px-6 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest inline-block">
                    {t('notes')}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-b-xl rounded-r-xl border border-slate-100 text-xs text-slate-500 italic">
                    Thank you for choosing Maid By Ana. We appreciate your business!
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-petrol text-white px-8 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest inline-block">
                    {t('serviceValue')}
                  </div>
                  <div className="p-8 bg-slate-50 rounded-b-xl rounded-l-xl border border-slate-100">
                    <p className="text-5xl font-black text-petrol">
                      <span className="text-gold text-2xl mr-1">$</span>
                      {receiptType === 'single' 
                        ? selectedClient.serviceValue 
                        : receiptType === 'biweekly' 
                          ? selectedClient.serviceValue * 2 
                          : selectedClient.serviceValue * 4}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-petrol">{t('noDataFound')}</h3>
                <p className="text-slate-400 max-w-xs mx-auto">{t('selectClientToPreview')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
