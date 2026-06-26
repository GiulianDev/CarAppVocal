import { useAuth } from '../../../shared/contexts/AuthContext';
import './AuthButton.css';

export function AuthButton() {
  const { user, authLoading, signIn, signOut } = useAuth();
  return (
    <div className="auth--container">
      <div className="auth-wrapper">
        <button
          className="auth-button"
          onClick={user ? signOut : signIn}
          disabled={authLoading}
          aria-label={user ? 'Esci da Google' : 'Login con Google'}
          title={user ? 'Esci' : 'Login'}
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
          <div className="auth-username">Log in</div>
        )}
      </div>
    </div>
  );
}
