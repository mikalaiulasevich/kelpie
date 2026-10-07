import { Component, Suspense, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Button } from '../components/button';
import { ApplicationMessages } from './application-messages';

interface DeferredViewProperties {
  children: ReactNode;
  loading: ReactNode;
}

interface DeferredViewState {
  failed: boolean;
}

export class DeferredView extends Component<DeferredViewProperties, DeferredViewState> {
  override state: DeferredViewState = { failed: false };

  static getDerivedStateFromError(): DeferredViewState {
    return { failed: true };
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <Alert variant="destructive">
          <AlertTitle>{ApplicationMessages.ViewUnavailable}</AlertTitle>
          <AlertDescription>
            {ApplicationMessages.ViewRecovery}
            <Button
              variant="outline"
              className="mt-3 w-fit"
              onClick={() => globalThis.location.reload()}
            >
              {ApplicationMessages.Reload}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return <Suspense fallback={this.props.loading}>{this.props.children}</Suspense>;
  }
}
