importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBgO3BpNX0Kuy5SAZlehoDVLMlEw08v3Yg",
  authDomain: "maid-by-ana-production.firebaseapp.com",
  projectId: "maid-by-ana-production",
  storageBucket: "maid-by-ana-production.firebasestorage.app",
  messagingSenderId: "507056939130",
  appId: "1:507056939130:web:3d31919b4adc9f7e089bc3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
