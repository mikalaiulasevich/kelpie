import { ConfigurationJson } from './configuration-json';
import { useState } from 'react';
import { ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
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
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <CardTitle className="break-words">{configuration.title}</CardTitle>
              <CardDescription className="break-words">{configuration.description}</CardDescription>
            </div>
            <Badge variant="outline">Read only</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Version {configuration.version}</Badge>
            <Badge variant="outline">{configuration.locale}</Badge>
            <Badge variant="outline">Schema {configuration.schemaVersion}</Badge>
            <Badge variant="outline">Document status: {configuration.status}</Badge>
          </div>
          {configuration.releaseNote && (
            <p className="break-words text-sm text-muted-foreground">{configuration.releaseNote}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="inspection-variant" className="text-sm font-medium">
              Inspect variant
            </label>
            <Select
              value={variant}
              onValueChange={(value) => {
                if (value === ExperimentVariant.A || value === ExperimentVariant.B) {
                  setVariant(value);
                }
              }}
            >
              <SelectTrigger id="inspection-variant" className="w-40">
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
          <p className="text-sm text-muted-foreground">
            Steps and results include this variant’s content overrides. Visibility and result rules
            are declarations, not a simulation of a participant’s answers.
          </p>
        </CardContent>
      </Card>
      <Tabs defaultValue="steps" className="min-w-0 gap-5">
        <div className="min-w-0 overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
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
