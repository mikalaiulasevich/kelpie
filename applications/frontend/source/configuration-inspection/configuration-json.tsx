import { ConfigurationInspectionFormat } from './configuration-inspection-format';

export function ConfigurationJson({ value }: { readonly value: unknown }) {
  return (
    <pre className="max-h-[32rem] min-w-0 overflow-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed">
      <code>{ConfigurationInspectionFormat.json(value)}</code>
    </pre>
  );
}
