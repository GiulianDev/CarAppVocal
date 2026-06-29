import { Navigate } from 'react-router-dom';
import App from './App';
import { AddVehicleView } from './features/AddVehicle/AddVehicleView';
import { VehicleDetailView } from './features/vehicleDetail/VehicleDetailView';
import { GaragePage } from './features/GaragePage/GaragePage';
import { CalendarPage } from './features/vehicleDetail/CalendarPage';
import { VehicleEventPage } from './features/EventManagment/VehicleEventPage';

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
        element: <VehicleDetailView />,
        handle: { title: 'Dettaglio veicolo' },
      },
      {
        path: '/detail/:id/event/new',
        element: <VehicleEventPage />,
        handle: { title: 'Nuovo Evento' },
      },
      {
        path: '/detail/:id/event/:eventId',
        element: <VehicleEventPage />,
        handle: { title: 'Dettaglio ed Editor Evento' },
      },
      {
        path: '/detail',
        element: <Navigate to="/add-vehicle" replace />,
      },
      {
        path: '/add-vehicle/',
        element: <AddVehicleView />,
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
