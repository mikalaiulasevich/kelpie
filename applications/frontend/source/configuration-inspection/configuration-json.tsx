import { useLocalization } from '../localization/use-localization';
import { useMemo } from 'react';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

const JsonHighlighting = {
  // Strings are consumed whole, including escapes, before matching other JSON tokens.
  tokens(text: string) {
    return Array.from(
      text.matchAll(
        /("(?:\\.|[^"\\])*"\s*(?=:))|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],:])|(\s+|.)/g,
      ),
      (token) => ({ text: token[0], offset: token.index, kind: this.kind(token) }),
    );
  },

  kind(token: RegExpMatchArray): string {
    if (token[1]) {
      return 'key';
    }

    if (token[2]) {
      return 'string';
    }

    if (token[3]) {
      return 'number';
    }

    if (token[4]) {
      return 'boolean';
    }

    if (token[5]) {
      return 'null';
    }

    if (token[6]) {
      return 'punctuation';
    }

    return 'plain';
  },
} as const;

export function ConfigurationJson({ value }: { readonly value: unknown }) {
  const { t } = useLocalization();
  const tokens = useMemo(
    () => JsonHighlighting.tokens(ConfigurationInspectionFormat.json(value)),
    [value],
  );

  return (
    <pre
      tabIndex={0}
      aria-label={t("JSON configuration")}
      className="configuration-json max-h-[32rem] min-w-0 overflow-auto rounded-md border p-4 text-xs leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <code>
        {tokens.map((token) => (
          <span key={token.offset} className={`json-${token.kind}`}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}
