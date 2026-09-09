import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Firebase Console > Project Settings altındaki kendi bilgilerinle doldur:
const firebaseConfig = {
  apiKey: "AIzaSyBe8HwdeJiAJ2wilWALm5yl5deYKV2V5k4",
  authDomain: "projepofuduk.firebaseapp.com",
  projectId: "projepofuduk",
  storageBucket: "projepofuduk.firebasestorage.app",
  messagingSenderId: "112143920020",
  appId: "1:112143920020:web:3cdb0d3795520ac2103d81"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// İnternet çekmese bile eşinin listeyi görebilmesi için offline cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Admin yetkisi için senin Firebase Auth UID değerin:
export const ADMIN_UID = "ILgq1oNPYjbIepVXlIDRLMxmzn92";
