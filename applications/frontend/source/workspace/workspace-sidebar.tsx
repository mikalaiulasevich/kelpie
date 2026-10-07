import { useSidebar } from '../navigation/use-sidebar';
// Composition adapted from the official shadcn/ui sidebar-07 block.
import { BarChart3, Command, Files, History, LogOut } from 'lucide-react';
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
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a
                href={WorkspaceNavigation.href(WorkspacePage.Analytics, funnelIdentifier)}
                onClick={() => setOpenMobile(false)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command />
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold tracking-tight">{WorkspaceContent.Name}</span>
                  <span className="text-xs text-muted-foreground">{WorkspaceContent.Area}</span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{WorkspaceContent.Scope}</SidebarGroupLabel>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.page}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    page === item.page ||
                    (page === WorkspacePage.Version && item.page === WorkspacePage.Versions)
                  }
                  tooltip={item.label}
                >
                  <a
                    href={WorkspaceNavigation.href(item.page, funnelIdentifier)}
                    aria-current={page === item.page ? 'page' : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <div className="mx-4 mt-auto rounded-xl border border-sidebar-border p-4 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          {WorkspaceContent.Support}
        </div>
      </SidebarContent>
      <SidebarFooter className="p-4">
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
              onClick={signOut}
              disabled={pending}
              tooltip={WorkspaceContent.SignOut}
            >
              <LogOut />
              <span>{pending ? WorkspaceContent.SigningOut : WorkspaceContent.SignOut}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
