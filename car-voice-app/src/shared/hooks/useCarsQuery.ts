import { useCarContext } from '../context/CarContext';

export function useCarsQuery() {
  const { cars, isLoading } = useCarContext();
  return { cars, isLoading };
}