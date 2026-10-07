import { useLocalization } from '../localization/use-localization';
import { RotateCcw } from 'lucide-react';
import { Button } from './button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './empty';

interface LoadErrorStateProperties {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel: string;
}

export function LoadErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: LoadErrorStateProperties): UIElement {
  const { t } = useLocalization();

  return (
    <Empty role="alert" className="min-h-80 gap-5 rounded-xl border border-border bg-card/40">
      <svg
        aria-hidden="true"
        width="160"
        height="112"
        viewBox="0 0 160 112"
        fill="none"
        className="text-primary"
      >
        <ellipse cx="80" cy="100" rx="54" ry="5" fill="currentColor" opacity=".05" />
        <rect
          x="28"
          y="18"
          width="92"
          height="70"
          rx="8"
          fill="var(--card)"
          stroke="currentColor"
          strokeOpacity=".3"
        />
        <path d="M28 36h92" stroke="currentColor" strokeOpacity=".2" />
        <circle cx="38" cy="27" r="2" fill="currentColor" opacity=".6" />
        <circle cx="46" cy="27" r="2" fill="currentColor" opacity=".3" />
        <path
          d="M43 51h25m-25 10h17m-17 10h29"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".25"
        />
        <circle cx="108" cy="70" r="23" fill="var(--card)" stroke="currentColor" strokeWidth="2" />
        <path d="m125 87 13 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M101 70h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <EmptyHeader className="max-w-md">
        <EmptyTitle>{t(title)}</EmptyTitle>
        <EmptyDescription>{t(message)}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw aria-hidden="true" />
        {t(retryLabel)}
      </Button>
    </Empty>
  );
}
