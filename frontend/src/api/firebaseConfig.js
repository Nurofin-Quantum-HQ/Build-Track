import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
import api from "./index"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdIdFhcwFW0jUWYHoNoc7oBGag4xxSRyY",
  authDomain: "buildtrack-81b09.firebaseapp.com",
  projectId: "buildtrack-81b09",
  storageBucket: "buildtrack-81b09.firebasestorage.app",
  messagingSenderId: "715728014325",
  appId: "1:715728014325:web:1f2b2109238aa47483aebc",
  measurementId: "G-050ZMD229D"
};

let app, messaging, analytics;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase not initialized. Check your credentials.");
}

export const requestFirebaseToken = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: "BCgR2Qujw2zwp5UWsN4eStLnfTTDB5Eww_1WTseCTEzuwE-l5iCtP8AdrPT7w_FMxWBDDd24eCzqqAgwAlN1eoI" });
      if (token) {
        // Send to backend
        try {
          await api.post("/notifications/device-token", { token });
          console.log("FCM Token registered");
        } catch (e) {
          console.error("Failed to register FCM token with backend", e);
        }
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error("Error requesting Firebase token", error);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return;
  return onMessage(messaging, callback);
};
