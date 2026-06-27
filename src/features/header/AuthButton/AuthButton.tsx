// src/components/Header/AuthButton/AuthButton.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../shared/Auth/AuthContext';
import { AuthMenu } from './AuthMenu';
import './AuthButton.css';

export function AuthButton() {
  const { user, authLoading, signIn, signOut } = useAuth();
  
  // Stati e Ref per il menu a tendina
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hook per chiudere il menu cliccando al di fuori di esso
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Gestore del click sul bottone principale
  const handleMainAction = () => {
    // Ora apre o chiude SEMPRE il menu, a prescindere dal login
    setIsMenuOpen((prev) => !prev); 
  };

  return (
    <div className="auth--container">
      {/* Aggiungiamo il ref al wrapper per intercettare i click */}
      <div className="auth-wrapper relative" ref={menuRef}>
        
        <button
          className="auth-button"
          onClick={handleMainAction}
          disabled={authLoading}
          aria-label={user ? 'Apri menu utente' : 'Apri menu login'}
          title={user ? 'Menu utente' : 'Menu'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v1h20v-1c0-3.3-6.7-5-10-5z" />
          </svg>
        </button>
        
        {user && user.displayName ? (
          <div className="auth-username">{user.displayName}</div>
        ) : (
          <div className="auth-username">Menu</div>
        )}

        {/* Rimosso il controllo "&& user" per permettere al menu di aprirsi sempre */}
        {isMenuOpen && (
          <AuthMenu 
            user={user}
            onClose={() => setIsMenuOpen(false)} 
            onLogin={signIn}
            onLogout={signOut} 
          />
        )}
        
      </div>
    </div>
  );
}