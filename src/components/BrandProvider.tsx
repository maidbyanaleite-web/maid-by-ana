import { useEffect } from 'react';
import { db } from '../services/firebase';

export default function BrandProvider() {
  useEffect(() => {
    const unsub = db.collection('settings').doc('brand').onSnapshot((doc) => {
      if (doc.exists) {
        const settings = doc.data();
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.primaryColor);
        root.style.setProperty('--color-secondary', settings.secondaryColor);
      }
    });
    return () => unsub();
  }, []);

  return null;
}
