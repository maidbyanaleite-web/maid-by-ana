import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { BrandSettings } from '../types';
import { Save, Image as ImageIcon, Palette } from 'lucide-react';

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  appName: 'Maid By Ana',
  logoUrl: '',
  primaryColor: '#083344',
  secondaryColor: '#f59e0b',
  subtitle: 'Management System',
  logoSize: 8,
};

export default function BrandSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = db.collection('settings').doc('brand').onSnapshot((doc) => {
      if (doc.exists) {
        setSettings({ ...DEFAULT_BRAND_SETTINGS, ...doc.data() } as BrandSettings);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.collection('settings').doc('brand').set(settings);
      alert(t('save') + '!');
    } catch (error) {
      console.error("Error saving brand settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = storage.ref(`brand/logo-${new Date().getTime()}`);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      setSettings({ ...settings, logoUrl: downloadURL });
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-petrol">{t('brandSettings')}</h1>
        <p className="text-slate-500">{t('customizeYourBrand')}</p>
      </header>

      <div className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('appName')}</label>
          <input 
            type="text" 
            className="input"
            value={settings.appName}
            onChange={e => setSettings({...settings, appName: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('subtitle')}</label>
          <input 
            type="text" 
            className="input"
            value={settings.subtitle}
            onChange={e => setSettings({...settings, subtitle: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('primaryColor')}</label>
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="color" 
                className="input w-full h-12 p-2 pl-10"
                value={settings.primaryColor}
                onChange={e => setSettings({...settings, primaryColor: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('secondaryColor')}</label>
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="color" 
                className="input w-full h-12 p-2 pl-10"
                value={settings.secondaryColor}
                onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('logo')}</label>
          <div className="mt-2 flex items-center gap-4">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-slate-100 p-1" />
            ) : (
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="text-slate-400" size={32} />
              </div>
            )}
            <input type="file" accept="image/*" className="text-sm" onChange={handleLogoUpload} disabled={uploading} />
            {uploading && <p className="text-xs text-slate-500">{t('processing')}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('logoSize')} ({settings.logoSize * 4}px)</label>
          <input 
            type="range" 
            min="4" 
            max="24" 
            step="1" 
            className="w-full"
            value={settings.logoSize}
            onChange={e => setSettings({...settings, logoSize: parseInt(e.target.value, 10)})}
          />
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            <Save size={20} />
            {saving ? t('processing') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
