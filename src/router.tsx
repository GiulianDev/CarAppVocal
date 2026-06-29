import { Navigate } from 'react-router-dom';
import App from './App';
import { AddVehiclePage } from './features/AddVehicle/AddVehiclePage';
import { VehicleDetailPage } from './features/VehicleDetail/VehicleDetailPage';
import { GaragePage } from './features/GaragePage/GaragePage';
import { CalendarPage } from './features/Calendar/CalendarPage';
import { VehicleEventsPage } from './features/Events/VehicleEventsPage';
import { useGarage } from './shared/Garage/useGarage';

/**
 * DEFINIZIONE CENTRALIZZATA DELLE ROUTE
 */


// 👈 Componente proxy per decidere dove atterrare all'avvio
const IndexRedirect = () => {
  const { vehicles, isLoading } = useGarage();
  
  if (isLoading) return null; // Evita redirect errati a UI scarica

  const favorite = vehicles.find(v => v.isFavorite) || vehicles[0];
  
  if (favorite) {
    return <Navigate to={`/detail/${favorite.id}`} replace />;
  }
  return <Navigate to="/add-vehicle" replace />;
};



export const routes = [
  {
    element: <App />,
    path: '/',
    children: [
      {
        index: true,
        element: <IndexRedirect />,
      },
      {
        path: '/detail/:id',
        element: <VehicleDetailPage />,
        handle: { title: 'Dettaglio veicolo' },
      },
      {
        path: '/detail/:id/event/new',
        element: <VehicleEventsPage />,
        handle: { title: 'Nuovo Evento' },
      },
      {
        path: '/detail/:id/event/:eventId',
        element: <VehicleEventsPage />,
        handle: { title: 'Dettaglio ed Editor Evento' },
      },
      {
        path: '/detail',
        element: <Navigate to="/add-vehicle" replace />,
      },
      {
        path: '/add-vehicle/',
        element: <AddVehiclePage />,
        handle: { title: 'Aggiungi veicolo' },
      },
      {
        path: '/garage/',
        element: <GaragePage />,
        handle: { title: 'Garage' },
      },
      {
        path: 'calendar',
        element: <CalendarPage />
      }
    ],
  },
];
