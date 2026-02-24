import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';

// This is initialized in index.html
export const messaging = (window as any).messaging;

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await messaging.getToken({
        vapidKey: 'BMPdaxgx16yJ0Rurg3Fb0qbwGNwMKdDsDgG9H4w8fcAVrJVdKfWocGqAOkz-TuNEVpMPtZKd3FF8pLdx7A8y9WA' // User needs to generate this in Firebase Console
      });
      
      if (token) {
        // Save token to user profile in Firestore
        await (window as any).db.collection('users').doc(userId).update({
          fcmToken: token
        });
        return token;
      }
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    messaging.onMessage((payload: any) => {
      resolve(payload);
    });
  });
