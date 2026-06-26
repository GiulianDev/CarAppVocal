import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAT9QLi_BSfoJZdpdSX-RbL6uYUpN_DL0g",
  authDomain: "carapp-92ee6.firebaseapp.com",
  projectId: "carapp-92ee6",
  storageBucket: "carapp-92ee6.firebasestorage.app",
  messagingSenderId: "843775774794",
  appId: "1:843775774794:web:5a3b059991a8cad9a6d6b3",
  measurementId: "G-6FCCYXJHSW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export { provider };
const analytics = getAnalytics(app);


