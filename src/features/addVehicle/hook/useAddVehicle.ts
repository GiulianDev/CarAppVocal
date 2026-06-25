import { useCarContext } from '../../../shared/context/CarContext';

export function useAddVehicle() {
  const { addCar } = useCarContext();
  return { addCar };
}