import { describe, expect, it } from 'vitest';
import { AnalyticsMarketingMetrics } from '../../source/analytics/analytics-marketing-metrics';
import { AnalyticsMarketingFixtures } from '../fixtures/analytics-marketing-fixtures';

describe('marketing analytics metrics', () => {
  it('colors displayed negative differences red, positive green and zero or missing neutral', () => {
    expect(AnalyticsMarketingMetrics.difference(-9.5)).toBe('-9.5 PP');
    expect(AnalyticsMarketingMetrics.differenceColor(-9.5)).toBe('var(--destructive)');
    expect(AnalyticsMarketingMetrics.differenceColor(9.5)).toBe('var(--success)');
    expect(AnalyticsMarketingMetrics.differenceColor(0)).toBe('var(--muted-foreground)');
    expect(AnalyticsMarketingMetrics.differenceColor(null)).toBe('var(--muted-foreground)');
  });

  it('weights totals by sessions and expresses B minus A in percentage points', () => {
    const version = AnalyticsMarketingFixtures.version([
      AnalyticsMarketingFixtures.variant('B', 300, 240, 150),
      AnalyticsMarketingFixtures.variant('A', 100, 60, 20),
    ]);

    const metrics = AnalyticsMarketingMetrics.summarize(version);

    expect(metrics.started).toBe(400);
    expect(metrics.results).toBe(300);
    expect(metrics.clicks).toBe(170);
    expect(metrics.resultRate.value).toBe(0.75);
    expect(metrics.conversionRate.value).toBe(0.425);
    expect(metrics.clickThrough.value).toBeCloseTo(0.5666667);
    expect(metrics.conversionDifference).toBe(30);
    expect(AnalyticsMarketingMetrics.difference(metrics.conversionDifference)).toBe('+30 PP');
  });

  it('compares the selected rate with the same B-minus-A direction regardless of variant order', () => {
    const version = AnalyticsMarketingFixtures.version([
      AnalyticsMarketingFixtures.variant('B', 200, 100, 100),
      AnalyticsMarketingFixtures.variant('A', 100, 100, 25),
    ]);

    expect(AnalyticsMarketingMetrics.compare(version, 'resultCompletion')).toBe(-50);
    expect(AnalyticsMarketingMetrics.compare(version, 'ctaConversion')).toBe(25);
    expect(
      AnalyticsMarketingMetrics.compare(
        AnalyticsMarketingFixtures.version([AnalyticsMarketingFixtures.variant('A', 10, 10, 5)]),
        'resultCompletion',
      ),
    ).toBeNull();
  });

  it('uses the authoritative result-click population for click-through', () => {
    const variant = AnalyticsMarketingFixtures.variant('A', 100, 60, 40);
    const version = AnalyticsMarketingFixtures.version([
      { ...variant, ctaClickThrough: { numerator: 30, denominator: 60, value: 0.5 } },
    ]);

    const metrics = AnalyticsMarketingMetrics.summarize(version);

    expect(metrics.clicks).toBe(40);
    expect(metrics.conversionRate.value).toBe(0.4);
    expect(metrics.clickThrough).toEqual({ numerator: 30, denominator: 60, value: 0.5 });
  });

  it('leaves rates unavailable for empty cohorts rather than showing zero performance', () => {
    const version = AnalyticsMarketingFixtures.version([
      AnalyticsMarketingFixtures.variant('A', 0, 0, 0),
      AnalyticsMarketingFixtures.variant('B', 0, 0, 0),
    ]);

    const metrics = AnalyticsMarketingMetrics.summarize(version);

    expect(metrics.resultRate.value).toBeNull();
    expect(metrics.conversionRate.value).toBeNull();
    expect(metrics.clickThrough.value).toBeNull();
    expect(metrics.conversionDifference).toBeNull();
    expect(AnalyticsMarketingMetrics.ribbon([0, 0, 0], 0, 1)).toBe('');
  });

  it('does not infer a comparison when only one variant has traffic', () => {
    const version = AnalyticsMarketingFixtures.version([
      AnalyticsMarketingFixtures.variant('A', 10, 0, 0),
    ]);

    const metrics = AnalyticsMarketingMetrics.summarize(version);

    expect(metrics.conversionRate.value).toBe(0);
    expect(metrics.clickThrough.value).toBeNull();
    expect(metrics.conversionDifference).toBeNull();
    expect(AnalyticsMarketingMetrics.difference(metrics.conversionDifference)).toBe(
      'Not available',
    );
  });

  it('keeps a negative difference signed and renders zero-count milestones at zero width', () => {
    const version = AnalyticsMarketingFixtures.version([
      AnalyticsMarketingFixtures.variant('A', 100, 100, 50),
      AnalyticsMarketingFixtures.variant('B', 100, 50, 25),
    ]);

    expect(
      AnalyticsMarketingMetrics.difference(
        AnalyticsMarketingMetrics.summarize(version).conversionDifference,
      ),
    ).toBe('-25 PP');
    expect(AnalyticsMarketingMetrics.ribbon([100, 50, 0], 100, 1)).toContain('L 600 90 L 600 90');
  });
});
