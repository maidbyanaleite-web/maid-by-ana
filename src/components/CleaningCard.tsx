import React, { useState } from 'react';
import { Cleaning } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../services/firebase';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Camera,
  User,
  Save,
  Edit,
  Trash2
} from 'lucide-react';

interface CleaningCardProps {
  cleaning: Cleaning;
  isAdmin: boolean;
  onEdit?: (cleaning: Cleaning) => void;
  onDelete?: (cleaningId: string) => void;
}

export default function CleaningCard({ cleaning, isAdmin, onEdit, onDelete }: CleaningCardProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState(cleaning.adminNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAdminNotes = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleaning.id) return;
    setIsSaving(true);
    try {
      await db.collection('cleanings').doc(cleaning.id).update({ adminNotes });
    } catch (error) {
      console.error("Error saving admin notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhotoGallery = (photos: string[] | undefined, title: string) => {
    if (!photos || photos.length === 0) {
      return <p className="text-xs text-slate-400">{t('noPhotos')}</p>;
    }
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {photos.map((url, i) => (
          <img key={i} src={url} alt={title} className="w-full h-24 object-cover rounded-lg" />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button 
        className="w-full p-4 text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-bold text-petrol">{cleaning.date}</p>
            <div className="flex items-center gap-2">
              <p className={`text-xs font-bold uppercase ${cleaning.status === 'completed' ? 'text-emerald-500' : 'text-gold'}`}>
                {t(cleaning.status)}
              </p>
              {cleaning.isSameDayCheckIn && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {t('sameDayCheckIn')}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(cleaning);
                }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-petrol"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(cleaning.id!);
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-300 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-100 space-y-6">
          {/* Admin Notes Section */}
          {isAdmin && (
            <div className="bg-sky-50 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-sky-800 mb-2 flex items-center gap-2">
                <MessageSquare size={16} /> {t('adminNotesForStaff')}
              </h4>
              <textarea
                className="input w-full text-sm"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('adminNotesPlaceholder')}
              />
              <div className="text-right mt-2">
                <button onClick={handleSaveAdminNotes} disabled={isSaving} className="btn-secondary btn-sm flex items-center gap-1">
                  <Save size={14} />
                  {isSaving ? t('processing') : t('save')}
                </button>
              </div>
            </div>
          )}

          {/* Staff Report Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <User size={16} /> {t('staffReport')}
            </h4>
            {cleaning.staffNotes && <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-md">{cleaning.staffNotes}</p>}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Camera size={14} /> {t('photosBefore')}</h5>
              {renderPhotoGallery(cleaning.photosBefore, t('photosBefore'))}
            </div>
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Camera size={14} /> {t('photosAfter')}</h5>
              {renderPhotoGallery(cleaning.photosAfter, t('photosAfter'))}
            </div>
          </div>

          {/* Client Feedback Section */}
          <div className="space-y-4 pt-6 border-t border-dashed">
            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <User size={16} /> {t('clientFeedback')}
            </h4>
            {cleaning.clientFeedback && <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-md">{cleaning.clientFeedback}</p>}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Camera size={14} /> {t('photosByClient')}</h5>
              {renderPhotoGallery(cleaning.photosByClient, t('photosByClient'))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
