import { ConfigurationJson } from './configuration-json';
import { useState } from 'react';
import {
  Activity,
  Braces,
  Info,
  FilePenLine,
  Flag,
  GitBranch,
  ListOrdered,
  SlidersHorizontal,
} from 'lucide-react';
import { ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import {
  ConfigurationStepsPanel,
  ConfigurationVariantsPanel,
  ConfigurationResultsPanel,
  ConfigurationEventsPanel,
} from './configuration-inspection-panels';

interface ConfigurationInspectionProperties {
  readonly configuration: FunnelConfiguration;
}

export function ConfigurationInspection({ configuration }: ConfigurationInspectionProperties) {
  const [variant, setVariant] = useState<ExperimentVariant>(ExperimentVariant.A);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <section
          aria-label="Version information"
          className="min-w-0 flex-1 rounded-lg bg-muted/40 px-4 py-3"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">Description</h3>
                <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {configuration.description}
                </p>
              </div>
            </div>
            {configuration.releaseNote && (
              <div className="flex items-start gap-2.5">
                <FilePenLine className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="mb-1 text-xs font-medium text-muted-foreground">What changed</h3>
                  <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {configuration.releaseNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="inspection-variant" className="text-sm text-muted-foreground">
            Preview
          </label>
          <Select
            value={variant}
            onValueChange={(value) => {
              if (value === ExperimentVariant.A || value === ExperimentVariant.B) {
                setVariant(value);
              }
            }}
          >
            <SelectTrigger id="inspection-variant" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ExperimentVariant.A}>Variant A</SelectItem>
                <SelectItem value={ExperimentVariant.B}>Variant B</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs defaultValue="steps" className="min-w-0 gap-5">
        <div className="min-w-0 overflow-x-auto pb-1">
          <TabsList variant="line" className="w-max">
            <TabsTrigger value="steps">
              <ListOrdered aria-hidden="true" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="variants">
              <GitBranch aria-hidden="true" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="results">
              <Flag aria-hidden="true" />
              Results
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity aria-hidden="true" />
              Events
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SlidersHorizontal aria-hidden="true" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="json">
              <Braces aria-hidden="true" />
              JSON
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="steps" className="min-w-0">
          <ConfigurationStepsPanel configuration={configuration} variant={variant} />
        </TabsContent>
        <TabsContent value="variants" className="min-w-0">
          <ConfigurationVariantsPanel configuration={configuration} />
        </TabsContent>
        <TabsContent value="results" className="min-w-0">
          <ConfigurationResultsPanel configuration={configuration} variant={variant} />
        </TabsContent>
        <TabsContent value="events" className="min-w-0">
          <ConfigurationEventsPanel configuration={configuration} />
        </TabsContent>
        <TabsContent value="settings" className="min-w-0">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Session</CardTitle>
                <CardDescription>Lifetime, persistence and version pinning.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigurationJson value={configuration.session} />
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Visible steps and excluded step types.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigurationJson value={configuration.progress} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="json" className="min-w-0">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Original configuration</CardTitle>
              <CardDescription>
                The persisted document, formatted for reading. Variant overrides are not merged into
                this view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigurationJson value={configuration} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
