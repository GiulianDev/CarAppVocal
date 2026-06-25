import { useCarContext } from "../../shared/context/CarContext";

export function useDeleteVehicle() {
  const { deleteCar } = useCarContext();
  return { deleteCar };
}