import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import type { AnalyticsVariant } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsRatioValue } from './analytics-ratio-value';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';

import { Route } from 'lucide-react';

interface AnalyticsPathTableProperties {
  readonly variant: AnalyticsVariant;
}

export function AnalyticsPathTable({ variant }: AnalyticsPathTableProperties) {
  const { t: translate } = useLocalization();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {translate(AnalyticsContent.Variant)} {variant.variant}{' '}
          {translate(AnalyticsContent.VariantTransitions)}
        </CardTitle>
        <CardDescription>{translate(AnalyticsContent.PathsDescription)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>{translate(AnalyticsContent.PathsCaption)}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{translate(AnalyticsContent.Path)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Transitions)}</TableHead>
              <TableHead>{translate(AnalyticsContent.ObservedConversion)}</TableHead>
              <TableHead>{translate(AnalyticsContent.BranchShare)}</TableHead>
              <TableHead>{translate(AnalyticsContent.TransitionToView)}</TableHead>
              <TableHead>{translate(AnalyticsContent.DestinationPending)}</TableHead>
              <TableHead>{translate(AnalyticsContent.DestinationExpired)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variant.edges.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Route className="size-5 text-muted-foreground" />
                    <span className="font-medium">{translate(AnalyticsContent.EmptyPaths)}</span>
                    <span className="text-xs text-muted-foreground">
                      {translate(AnalyticsContent.EmptyPathsDescription)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {variant.edges.map((edge) => (
              <TableRow key={`${edge.fromStepIdentifier}:${edge.toStepIdentifier}`}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{edge.fromStepIdentifier}</span>
                    <span className="text-xs text-muted-foreground">→ {edge.toStepIdentifier}</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {AnalyticsFormat.count(edge.transitions)}
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.observedConversion} />
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.branchShare} />
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.transitionToView} />
                </TableCell>
                <TableCell
                  data-nonzero={edge.destinationNonreach.open > 0}
                  className="tabular-nums data-[nonzero=true]:text-warning"
                >
                  {AnalyticsFormat.count(edge.destinationNonreach.open)}
                </TableCell>
                <TableCell
                  data-nonzero={edge.destinationNonreach.expired > 0}
                  className="font-medium tabular-nums data-[nonzero=true]:text-destructive"
                >
                  {AnalyticsFormat.count(edge.destinationNonreach.expired)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
