import { useMatches } from 'react-router';
import './Header.css';
import { AuthButton } from './AuthButton/AuthButton';

// Opzionale ma consigliato: tipizzare cosa ci aspettiamo nell'handle
interface RouteHandle {
  title?: string;
}

export function Header() {
  const matches = useMatches();

  // Cerchiamo l'ultimo match (la rotta foglia attuale) che contiene un title nell'handle.
  // Usiamo reverse() per partire dalla rotta più specifica (es: /search) 
  // andando verso il parent (es: /)
  const currentMatch = [...matches].reverse().find(
    (match) => (match.handle as RouteHandle)?.title
  );

  // Estraiamo il titolo o usiamo un fallback di default
  const pageTitle = (currentMatch?.handle as RouteHandle)?.title || 'FinancialApp';

  return (
    <header className="header--container">

      <div className="header--title">
        <h1>{pageTitle}</h1>
      </div>
      
      {/* Bottone di autenticazione */}
      <AuthButton/>

    </header>
  );
}