import { createContext, type Dispatch, type SetStateAction } from 'react';

type SidebarContextProperties = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

export const SidebarContext = createContext<SidebarContextProperties | null>(null);

export type { SidebarContextProperties };

export interface SidebarStateOptions {
  readonly defaultOpen?: boolean;
  readonly open?: Optional<boolean>;
  readonly onOpenChange?: Optional<(open: boolean) => void>;
}
