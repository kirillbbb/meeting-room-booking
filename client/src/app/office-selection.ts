import { useOutletContext } from 'react-router-dom';

export interface OfficeSelectionContextValue {
  selectedOfficeId: string;
  setSelectedOfficeId: (officeId: string) => void;
}

export function useOfficeSelection(): OfficeSelectionContextValue {
  return useOutletContext<OfficeSelectionContextValue>();
}
