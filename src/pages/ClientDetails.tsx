import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Client } from '../types';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  FileText, 
  Image as ImageIcon,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Clock,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { generateReceipt } from '../utils/pdfGenerator';
import { format } from 'date-fns';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = db.collection('clients').doc(id).onSnapshot((doc) => {
      if (doc.exists) {
        setClient({ id: doc.id, ...doc.data() } as Client);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !client) return;
    const file = e.target.files[0];
    const storageRef = storage.ref(`clients/${id}/${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
    await db.collection('clients').doc(id).update({
      gallery: [...(client.gallery || []), url]
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!client) return <div className="p-8 text-center">Client not found.</div>;

  return (
    <div className="space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-petrol transition-colors">
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-petrol">{client.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${client.type === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    {client.type}
                  </span>
                </div>
                <p className="text-slate-500 flex items-center gap-2">
                  <MapPin size={16} />
                  {client.address}
                </p>
              </div>
              {isAdmin && (
                <button className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone size={18} className="text-petrol" />
                  {client.phone}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail size={18} className="text-petrol" />
                  {client.email}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar size={18} className="text-petrol" />
                  Since: {client.clientSince}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={18} className="text-petrol" />
                  Frequency: <span className="capitalize font-medium">{client.frequency}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <FileText size={18} className="text-petrol" />
                  Service: <span className="capitalize font-medium">{client.serviceType.replace('_', ' ')}</span>
                </div>
                {client.type === 'airbnb' && client.propertyLink && (
                  <a href={client.propertyLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-600 hover:underline">
                    <ExternalLink size={18} />
                    View Property
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <ImageIcon size={20} />
                Service Gallery
              </h2>
              <label className="btn-secondary text-sm cursor-pointer">
                <Plus size={16} className="inline mr-1" />
                Add Photo
                <input type="file" className="hidden" onChange={handleUploadImage} />
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {client.gallery?.map((url, i) => (
                <motion.img 
                  key={i} 
                  src={url} 
                  alt="Cleaning" 
                  className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  whileHover={{ scale: 1.02 }}
                />
              ))}
              {(!client.gallery || client.gallery.length === 0) && (
                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                  No photos uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Actions */}
        <div className="space-y-8">
          <div className="card bg-petrol text-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <DollarSign size={20} className="text-gold" />
              Financial Details
            </h3>
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/70">Service Value</span>
                  <span className="text-xl font-bold">${client.serviceValue}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/70">Team Payment</span>
                <span className="text-xl font-bold text-gold">${client.teamPaymentValue}</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-white/70">Net Profit</span>
                  <span className="text-xl font-bold text-emerald-400">${client.serviceValue - client.teamPaymentValue}</span>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="card space-y-4">
              <h3 className="font-bold text-petrol mb-2">Actions</h3>
              <button 
                onClick={() => generateReceipt(client, format(new Date(), 'MM/dd/yyyy'), client.serviceValue)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                Generate Receipt
              </button>
              <button className="w-full btn-secondary">
                Edit Client Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
