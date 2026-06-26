import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithGoogle, logout, onAuthStateChangedListener } from '../services/authService';
// import type { AuthContextType, FirebaseUser } from '../types/auth';
import { type User } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Qui stai dicendo a React: "Crea un canale radio chiamato AuthContext". 
// Tramite l'interfaccia AuthContextType, specifichi che su questo canale viaggeranno sempre quattro cose: 
// 1. l'oggetto dell'utente (user), 
// 2. lo stato di caricamento (authLoading), 
// 3. e 4. le le due funzioni per entrare ed uscire (signIn, signOut).
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  
  const [user, setUser] = useState<User | null>(null); // contiene i dati dell'utente Google se è loggato, altrimenti è null
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error during sign in:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
