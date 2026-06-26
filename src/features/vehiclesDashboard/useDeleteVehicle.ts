import { useCarContext } from "../../shared/Garage/CarContext";

export function useDeleteVehicle() {
  const { deleteCar } = useCarContext();
  return { deleteCar };
}