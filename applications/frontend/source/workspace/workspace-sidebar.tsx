import { useSidebar } from '../navigation/use-sidebar';
// Composition adapted from the official shadcn/ui sidebar-07 block.
import { BarChart3, Command, Files, History, LogOut, Layers3 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '../components/sidebar';
import { Avatar, AvatarFallback } from '../components/avatar';
import { WorkspaceNavigation, WorkspacePage } from './workspace-navigation';
import { WorkspaceContent } from './workspace-content';
import type { AdministratorIdentity } from '../administration/administration-types';

interface WorkspaceSidebarProperties {
  page: WorkspacePage;
  funnelIdentifier: string;
  identity: AdministratorIdentity;
  signOut: () => void;
  pending: boolean;
}

const navigationItems = [
  { page: WorkspacePage.Analytics, label: WorkspaceContent.Analytics, icon: BarChart3 },
  { page: WorkspacePage.Versions, label: WorkspaceContent.Versions, icon: Files },
  { page: WorkspacePage.History, label: WorkspaceContent.History, icon: History },
] as const;

export function WorkspaceSidebar({
  page,
  funnelIdentifier,
  identity,
  signOut,
  pending,
}: WorkspaceSidebarProperties): UIElement {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-16 justify-center border-b px-4 py-2 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a
                href={WorkspaceNavigation.href(WorkspacePage.Analytics, funnelIdentifier)}
                onClick={() => setOpenMobile(false)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8">
                  <Command />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-lg font-semibold tracking-tight">
                    {WorkspaceContent.Name}
                  </span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-5 pt-6 pb-0 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3 className="size-3.5" aria-hidden="true" />
            {WorkspaceContent.CurrentFunnel}
          </div>
          <p className="mt-2 truncate text-sm font-medium" title={funnelIdentifier}>
            {funnelIdentifier}
          </p>
        </SidebarGroup>
        <SidebarGroup className="px-3 py-5 group-data-[collapsible=icon]:p-2">
          <SidebarGroupLabel>{WorkspaceContent.Scope}</SidebarGroupLabel>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.page}>
                <SidebarMenuButton
                  className="group-data-[collapsible=icon]:justify-center"
                  size="lg"
                  asChild
                  isActive={
                    page === item.page ||
                    (page === WorkspacePage.Version && item.page === WorkspacePage.Versions)
                  }
                  tooltip={item.label}
                >
                  <a
                    aria-label={item.label}
                    href={WorkspaceNavigation.href(item.page, funnelIdentifier)}
                    aria-current={page === item.page ? 'page' : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:p-0">
              <Avatar className="size-8">
                <AvatarFallback>{identity.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{identity.username}</span>
                <span className="text-xs text-muted-foreground">
                  {WorkspaceContent.Administrator}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={pending ? WorkspaceContent.SigningOut : WorkspaceContent.SignOut}
              onClick={signOut}
              disabled={pending}
              tooltip={WorkspaceContent.SignOut}
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">
                {pending ? WorkspaceContent.SigningOut : WorkspaceContent.SignOut}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
