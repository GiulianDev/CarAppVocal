import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAcPUgILOecfoJAkkF1wnTjprNOh8Gmbds",
  authDomain: "financialapp-c7cf0.firebaseapp.com",
  projectId: "financialapp-c7cf0",
  storageBucket: "financialapp-c7cf0.firebasestorage.app",
  messagingSenderId: "629230247075",
  appId: "1:629230247075:web:057eca3c5be9d9c79f3316",
  measurementId: "G-6JEYC12CYR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export { provider };