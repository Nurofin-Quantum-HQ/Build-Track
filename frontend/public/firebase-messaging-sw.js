// This file handles background push notifications in the browser

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDdIdFhcwFW0jUWYHoNoc7oBGag4xxSRyY",
  authDomain: "buildtrack-81b09.firebaseapp.com",
  projectId: "buildtrack-81b09",
  storageBucket: "buildtrack-81b09.firebasestorage.app",
  messagingSenderId: "715728014325",
  appId: "1:715728014325:web:1f2b2109238aa47483aebc"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/vite.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[firebase-messaging-sw.js] Failed to initialize: ', e);
}
