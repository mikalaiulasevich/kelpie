import { useLocalization } from '../localization/use-localization';
import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { isNull } from 'es-toolkit/predicate';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { ManagementPolicy } from '../management/management-policy';
import { AnalyticsPagePolicy } from './analytics-policy';
import { useAnalyticsVersionOptions } from './use-analytics';

interface AnalyticsVersionPickerProperties {
  readonly funnelIdentifier: string;
  readonly refreshSequence: number;
  readonly selectedIdentifier: string;
  readonly selectedLabel: string;
  readonly onUnauthorized: () => void;
  readonly onRefresh: () => void;
  readonly onSelect: (identifier: string, label: string) => void;
}

export function AnalyticsVersionPicker({
  funnelIdentifier,
  refreshSequence,
  selectedIdentifier,
  selectedLabel,
  onUnauthorized,
  onRefresh,
  onSelect,
}: AnalyticsVersionPickerProperties) {
  const { t } = useLocalization();

  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const query = useMemo(
    () => ({ funnelIdentifier, limit: AnalyticsPagePolicy.VersionOptionsPerPage, offset }),
    [funnelIdentifier, offset],
  );
  const versions = useAnalyticsVersionOptions(query, refreshSequence, onUnauthorized);
  const visibleVersions =
    versions.status === 'ready'
      ? versions.response.items.filter((version) =>
          t('Version {version}', { version: version.version })
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
      : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between sm:w-64"
          aria-label={t('Choose version: {version}', { version: selectedLabel })}
        >
          <GitBranch data-icon="inline-start" />
          {selectedLabel}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] p-3"
        aria-label={t('Choose configuration version')}
      >
        <div className="flex flex-col gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t('Search this page')}
            placeholder={t('Search this page…')}
          />
          <p className="text-xs text-muted-foreground">
            {t('Page')} {Math.floor(offset / AnalyticsPagePolicy.VersionOptionsPerPage) + 1}{' '}
            {t('· up to')} {t(' ')}
            {AnalyticsPagePolicy.VersionOptionsPerPage} {t('versions. Search covers this page.')}
          </p>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {versions.status === 'loading' && (
              <p className="p-3 text-sm text-muted-foreground" role="status">
                {t('Loading versions…')}
              </p>
            )}
            {versions.status === 'failed' && (
              <div className="p-3 text-sm">
                <p>{t(versions.message)}</p>
                <Button variant="link" onClick={onRefresh}>
                  {t('Retry')}
                </Button>
              </div>
            )}
            {versions.status === 'ready' && visibleVersions.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                {t('No matching versions on this page. Try another page or clear the search.')}
              </p>
            )}
            {visibleVersions.map((version) => (
              <Button
                key={version.identifier}
                variant="ghost"
                className="justify-between"
                aria-pressed={selectedIdentifier === version.identifier}
                onClick={() => {
                  onSelect(version.identifier, `Version ${version.version}`);
                  setOpen(false);
                }}
              >
                {t('Version')} {version.version}
                {selectedIdentifier === version.identifier && <Check data-icon="inline-end" />}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || versions.status === 'loading'}
              onClick={() =>
                setOffset((current) =>
                  Math.max(0, current - AnalyticsPagePolicy.VersionOptionsPerPage),
                )
              }
            >
              <ChevronLeft data-icon="inline-start" />
              {t('Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                versions.status !== 'ready' ||
                isNull(versions.response.nextOffset) ||
                versions.response.nextOffset > ManagementPolicy.MaximumOffset
              }
              onClick={() => {
                if (
                  versions.status === 'ready' &&
                  !isNull(versions.response.nextOffset) &&
                  versions.response.nextOffset <= ManagementPolicy.MaximumOffset
                ) {
                  setOffset(versions.response.nextOffset);
                }
              }}
            >
              {t('Next')}
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
