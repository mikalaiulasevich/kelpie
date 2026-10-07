import { describe, expect, it } from 'vitest';
import { ConfigurationLibrary } from '../../source/configuration-management/configuration-library';
import { ConfigurationLibraryFixture } from '../fixtures/configuration-library-fixtures';

describe('configuration library selection', () => {
  it('sorts numeric versions without reordering the server page or inferring unloaded results', () => {
    const collection = ConfigurationLibraryFixture.collection();

    expect(
      ConfigurationLibrary.select(collection, { search: '', status: 'all', descending: true }).map(
        (version) => version.version,
      ),
    ).toEqual([10, 2, 1]);
    expect(
      ConfigurationLibrary.select(collection, { search: '', status: 'all', descending: false }).map(
        (version) => version.version,
      ),
    ).toEqual([1, 2, 10]);
    expect(collection.items.map((version) => version.version)).toEqual([2, 10, 1]);
    expect(collection.nextOffset).toBe(25);
  });

  it('combines normalized checksum search with the live status and returns no matches distinctly', () => {
    const collection = ConfigurationLibraryFixture.collection();

    expect(
      ConfigurationLibrary.select(collection, {
        search: ' aabb ',
        status: 'live',
        descending: true,
      }).map((version) => version.version),
    ).toEqual([2]);
    expect(
      ConfigurationLibrary.select(collection, {
        search: ' aabb ',
        status: 'draft',
        descending: true,
      }),
    ).toEqual([]);
    expect(
      ConfigurationLibrary.select(collection, {
        search: 'missing',
        status: 'all',
        descending: true,
      }),
    ).toEqual([]);
  });

  it('resolves activity versions from the loaded page and keeps an identifier fallback for other pages', () => {
    const collection = ConfigurationLibraryFixture.collection();

    expect(ConfigurationLibrary.versionLabel(collection, 'version-ten')).toBe('v10');
    expect(ConfigurationLibrary.versionLabel(collection, 'off-page-version')).toBe('off-page…');
  });
});
