import { useContext } from 'react';
import { SidebarContext } from './sidebar-context';
import { SidebarMessages } from './sidebar-messages';

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error(SidebarMessages.ProviderRequired);
  }

  return context;
}
