// src/components/Header/AuthButton/AuthMenu.tsx
import { useNavigate } from 'react-router-dom';

interface AuthMenuProps {
  user: any; // Se usi TypeScript in modo stretto, sostituisci 'any' col tipo corretto (es. User | null)
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

export function AuthMenu({ user, onClose, onLogin, onLogout }: AuthMenuProps) {
  
  const navigate = useNavigate();

  const handleGoToGarage = () => {
    navigate('/garage/');
    onClose();
  };

  const handleLogin = () => {
    onLogin();
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <div className="absolute right-0 top-[65px] w-48 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 z-50">
      <div className="flex flex-col py-1.5">
        
        {/* Voce SEMPRE VISIBILE: Vai al Garage */}
        <button
          onClick={handleGoToGarage}
          className="px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left flex items-center gap-2.5 w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Vai al garage
        </button>

        {/* Separatore */}
        <div className="h-px bg-zinc-700/50 my-1 mx-3" />

        {/* Rendering condizionale per Log In / Log Out */}
        {user ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left flex items-center gap-2.5 w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log out
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="px-4 py-2.5 text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors text-left flex items-center gap-2.5 w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Log in
          </button>
        )}

      </div>
    </div>
  );
}