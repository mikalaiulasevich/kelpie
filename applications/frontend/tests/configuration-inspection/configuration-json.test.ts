import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfigurationJson } from '../../source/configuration-inspection/configuration-json';

describe('JSON syntax highlighting', () => {
  it('distinguishes keys, escaped strings, numbers, booleans and null without altering text', () => {
    const value = { 'quoted"key': 'true: "value"', amount: -1.25e30, active: false, empty: null };
    const markup = renderToStaticMarkup(createElement(ConfigurationJson, { value }));

    expect(markup).toContain('class="json-key"');
    expect(markup).toContain('class="json-string"');
    expect(markup).toContain('class="json-number">-1.25e+30</span>');
    expect(markup).toContain('class="json-boolean">false</span>');
    expect(markup).toContain('class="json-null">null</span>');
    const text = markup
      .replace(/<[^>]*>/g, '')
      .replaceAll('&quot;', '"')
      .replaceAll('&#x27;', "'")
      .replaceAll('&amp;', '&');
    expect(text).toBe(JSON.stringify(value, null, 2));
  });

  it('escapes HTML from configurations instead of inserting executable markup', () => {
    const markup = renderToStaticMarkup(
      createElement(ConfigurationJson, { value: { content: '<script>alert(1)</script>' } }),
    );

    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('retains the undeclared fallback and keyboard access to scrollable content', () => {
    const markup = renderToStaticMarkup(createElement(ConfigurationJson, { value: undefined }));

    expect(markup.replace(/<[^>]*>/g, '')).toBe('Not declared');
    expect(markup).toContain('tabindex="0"');
  });
});
