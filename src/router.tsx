import { Navigate } from 'react-router-dom';
import App from './App';
import { AddVehiclePage } from './features/AddVehicle/AddVehiclePage';
import { VehicleDetailPage } from './features/VehicleDetail/VehicleDetailPage';
import { GaragePage } from './features/GaragePage/GaragePage';
import { CalendarPage } from './features/Calendar/CalendarPage';
import { VehicleEventsPage } from './features/Events/VehicleEventsPage';

/**
 * DEFINIZIONE CENTRALIZZATA DELLE ROUTE
 */
export const routes = [
  {
    element: <App />,
    path: '/',
    children: [
      {
        index: true,
        element: <Navigate to="/add-vehicle" replace/>,
      },
      // {
      //   element: <AddVehicleView />,
      //   children: [
      //     {
      //       path: '/search',
      //       element: <SearchPage />,
      //       handle: { title: 'Ricerca Asset per ISIN' },
      //     },
      //     {
      //       path: '/portfolio',
      //       element: <PortfolioPage />,
      //       handle: { title: 'Portfolio' },
      //     },
      //   ],
      // },
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
        handle: { title: 'Aggiunngi veicolo' },
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
