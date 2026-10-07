import { Kbd, KbdGroup } from '../components/kbd';
import { ActionShortcutCatalog } from './action-shortcuts';
import { useCallback, useRef, useState } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog';
import { Button } from '../components/button';
import { WorkspaceShortcutCatalog } from './workspace-shortcuts';
import { useWorkspaceShortcuts } from './use-workspace-shortcuts';

interface WorkspaceShortcutHelpProperties {
  funnelIdentifier: string;
}

export function WorkspaceShortcutHelp({
  funnelIdentifier,
}: WorkspaceShortcutHelpProperties): UIElement {
  const [open, setOpen] = useState(false);
  const returnTarget = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openHelp = useCallback(() => {
    returnTarget.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  useWorkspaceShortcuts(funnelIdentifier, openHelp);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          ref={trigger}
          className="workspace-shortcut-trigger"
          variant="ghost"
          size="icon"
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="Alt+/"
          title="Keyboard shortcuts · Alt /"
          onClick={() => {
            returnTarget.current = trigger.current;
          }}
        >
          <Keyboard strokeWidth={1.5} aria-hidden="true" />
          <span className="workspace-shortcut-label">Keyboard shortcuts</span>
          <Kbd className="workspace-shortcut-key" aria-hidden="true">
            ⌥/
          </Kbd>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="workspace-shortcut-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault();

          if (returnTarget.current?.isConnected) {
            returnTarget.current.focus({ preventScroll: true });
          } else {
            trigger.current?.focus({ preventScroll: true });
          }
        }}
      >
        <DialogTitle>Take the short route.</DialogTitle>
        <DialogDescription>
          Move around your workspace without leaving the keyboard. Your selected funnel stays with
          you.
        </DialogDescription>
        <dl className="workspace-shortcut-list">
          {WorkspaceShortcutCatalog.Navigation.map((item) => (
            <div key={item.page} className="workspace-shortcut-row">
              <dt>{item.label}</dt>
              <dd>
                <Kbd>Alt</Kbd>
                <Kbd>{item.key}</Kbd>
              </dd>
            </div>
          ))}
          {Object.entries(ActionShortcutCatalog).map(([label, shortcut]) => (
            <div key={shortcut.code} className="workspace-shortcut-row">
              <dt>
                {label} <span className="text-xs text-muted-foreground">where available</span>
              </dt>
              <dd>
                <KbdGroup>
                  <Kbd>Alt</Kbd>
                  <Kbd>{shortcut.key}</Kbd>
                </KbdGroup>
              </dd>
            </div>
          ))}
          <div className="workspace-shortcut-row">
            <dt>Keyboard shortcuts</dt>
            <dd>
              <Kbd>Alt</Kbd>
              <Kbd>/</Kbd>
            </dd>
          </div>
          <div className="workspace-shortcut-row">
            <dt>Close a dialog</dt>
            <dd>
              <Kbd>Esc</Kbd>
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          On Mac, use Option (⌥) for Alt. Shortcuts pause while you type or use a dialog or menu.
        </p>
      </DialogContent>
    </Dialog>
  );
}
