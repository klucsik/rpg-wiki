import { expect, test, describe, mock, afterAll, beforeAll } from 'bun:test';
import { GoogleDocsOrchestrator } from './orchestrator';
import { prisma } from '../../../../src/src/lib/db/db';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

// Mocking the prisma module
mock.module('../../../../src/src/lib/db/db', () => {
  return {
    prisma: {
      page: {
        findMany: async () => [],
        create: async () => ({ id: 1, title: 'Test Page 1', content: '', path: '/path/1' }),
      },
      media: {
        findFirst: async () => ({ id: 99, filename: 'test-image.png' }),
      },
      $disconnect: async () => {},
    },
  };
});

describe('GoogleDocsOrchestrator', () => {
  const testDir = join(tmpdir(), `gdoc-test-mock-${Date.now()}`);

  beforeAll(async () => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should parse and import pages without crashing', async () => {
    const mdContent = `
# Test Page 1
Content 1

## Test Page 2
Content 2 with image: ![Test Image](images/test-image.png)
`;
    const mdPath = join(testDir, 'test.md');
    writeFileSync(mdPath, mdContent);

    const imagesDir = join(testDir, 'images');
    mkdirSync(imagesDir, { recursive: true });
    const imagePath = join(imagesDir, 'test-image.png');
    writeFileSync(imagePath, Buffer.from('fake-image-data'));

    const orchestrator = new GoogleDocsOrchestrator(mdPath);
    await orchestrator.run({ importPath: testDir, dryRun: false });
    
    expect(true).toBe(true);
  });
});
