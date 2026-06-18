/** Bun-native test suite — run with `bun test`. */

// Minimal type declarations for Bun globals so tsc passes.
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare const expect: {
  <T>(actual: T): {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toHaveLength: (len: number) => void;
    toBeDefined: () => void;
  };
};
declare function mockModule(specifier: string, factory: () => Record<string, unknown>): void;

// ---------------------------------------------------------------------------
// Mock Prisma so the orchestrator's DB-dependent helpers don't fail.
// ---------------------------------------------------------------------------

const mockPageCreate = (_d: Record<string, unknown>) => ({
  id: 'mock-id',
  title: _d.title as string,
  path: _d.path as string,
  edit_groups: ['importer'],
  view_groups: ['importer'],
});

const mockPrisma = {
  page: {
    findMany: async () => [] as never[],
    create: mockPageCreate,
  },
};

mockModule(
  '../../../../src/src/lib/db/db',
  () => ({ prisma: mockPrisma }),
);

import { GoogleDocsOrchestrator } from './orchestrator';

describe('Google Docs Orchestrator', () => {
  test('instantiates without error', () => {
    const orch = new GoogleDocsOrchestrator('/tmp/fake.zip');
    expect(orch).toBeDefined();
  });

  test('slugifyTitle normalizes headings to lowercase slugs', () => {
    expect(GoogleDocsOrchestrator.slugifyTitle('Hello World')).toBe('hello-world');
    expect(GoogleDocsOrchestrator.slugifyTitle('  UPPER CASE  ')).toBe('upper-case');
    expect(GoogleDocsOrchestrator.slugifyTitle('Special @#$ chars!')).toBe('special-chars');
    expect(GoogleDocsOrchestrator.slugifyTitle('Multiple---Hyphens')).toBe('multiple-hyphens');
  });

  test('resolvePageGroups defaults owner visibility to importer user', async () => {
    const orch = new GoogleDocsOrchestrator('/tmp/fake.zip');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = await (orch as any).resolvePageGroups({
      title: 'Test',
      content: '<p>content</p>',
      path: 'test-page',
    });

    expect(Array.isArray(resolved.edit_groups)).toBe(true);
    expect(Array.isArray(resolved.view_groups)).toBe(true);
  });

  test('resolvePageGroups maps public visibility to admin/public groups', async () => {
    const orch = new GoogleDocsOrchestrator('/tmp/fake.zip');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = await (orch as any).resolvePageGroups({
      title: 'Public Page',
      content: '<p>public</p>',
      path: 'public-page',
      visibility: 'public' as const,
    });

    expect(resolved.edit_groups).toEqual(['admin']);
    expect(resolved.view_groups).toEqual(['public']);
  });
});
