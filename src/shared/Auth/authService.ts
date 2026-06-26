import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, provider } from '../config/firebase';

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export function onAuthStateChangedListener(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
