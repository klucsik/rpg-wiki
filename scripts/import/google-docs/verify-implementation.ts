import { GoogleDocsOrchestrator } from './orchestrator';
import { prisma } from '../../../../src/src/lib/db/db';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';

async function runTest() {
  const testDir = join(tmpdir(), `gdoc-test-${Date.now()}`);
  console.log(`Creating test directory: ${testDir}`);
  mkdirSync(testDir, { recursive: true });

  try {
    // Cleanup database before test
    console.log('Cleaning up database...');
    await prisma.page.deleteMany({});
    await prisma.media.deleteMany({});

    // 1. Create sample Markdown file and image in a directory
    const sampleDir = join(testDir, 'sample');
    mkdirSync(sampleDir, { recursive: true });
    
    const mdContent = `
# Test Page 1
This is the content of the first page.

## Test Page 2
This is the content of the second page. It has an image.

![Test Image](images/test-image.png)
`;
    const mdPath = join(sampleDir, 'test.md');
    writeFileSync(mdPath, mdContent);

    const imagesDir = join(sampleDir, 'images');
    mkdirSync(imagesDir, { recursive: true });
    const imagePath = join(imagesDir, 'test-image.png');
    writeFileSync(imagePath, Buffer.from('fake-image-data'));

    console.log('Created sample MD and image in sample directory.');

    // 2. Create a ZIP archive of the sample directory
    const zipPath = join(testDir, 'test.zip');
    const zip = new AdmZip();
    zip.addLocalFolder(sampleDir, '');
    zip.writeZip(zipPath);
    console.log(`Created ZIP archive: ${zipPath}`);

    // 3. Run Orchestrator
    console.log('Running orchestrator...');
    const orchestrator = new GoogleDocsOrchestrator(zipPath);
    await orchestrator.run({ importPath: testDir, dryRun: false });

    // 4. Verify results in DB
    console.log('Verifying results in DB...');

    // Check pages
    const pages = await prisma.page.findMany({
      where: {
        OR: [
          { title: 'Test Page 1' },
          { title: 'Test Page 2' }
        ]
      }
    });

    if (pages.length < 2) {
      throw new Error(`Expected at least 2 pages, found ${pages.length}`);
    }
    console.log('✅ Pages created successfully.');

    // Check image
    const media = await prisma.media.findFirst({
      where: { filename: 'test-image.png' }
    });

    if (!media) {
      throw new Error('Image not found in DB.');
    }
    console.log('✅ Image uploaded successfully.');

    // Check if content was updated with new image URL
    const page2 = pages.find(p => p.title === 'Test Page 2');
    if (!page2 || !page2.content.includes(`/api/images/${media.id}`)) {
      throw new Error(`Image URL not correctly replaced in Page 2 content. Found: ${page2?.content}`);
    }
    console.log('✅ Image URL replacement verified.');

    // Check metadata fields — edit_groups and view_groups must be set.
    for (const page of pages) {
      if (!page.edit_groups?.length || !Array.isArray(page.edit_groups)) {
        throw new Error(`Page "${page.title}" missing non-empty edit_groups. Found: ${JSON.stringify(page.edit_groups)}`);
      }
      if (!page.view_groups?.length || !Array.isArray(page.view_groups)) {
        throw new Error(`Page "${page.title}" missing non-empty view_groups. Found: ${JSON.stringify(page.view_groups)}`);
      }
    }
    console.log('✅ edit_groups and view_groups correctly set on all pages.');

    // Check that paths are unique.
    const pathSet = new Set(pages.map(p => p.path));
    if (pathSet.size !== pages.length) {
      throw new Error(`Duplicate paths detected: ${pages.filter((p, i, arr) => arr.findIndex(a => a.path === p.path) !== i).map(p => `"${p.title}" → "${p.path}"`).join(', ')}`);
    }
    console.log('✅ All page paths are unique.');

    // Check that empty-path fallback works: if the parser produces an empty path,
    // it should have been replaced with a generated one.
    for (const p of pages) {
      if (!p.path || !p.path.trim()) {
        throw new Error(`Page "${p.title}" has empty/null/blank path after import.`);
      }
    }
    console.log('✅ All page paths are non-empty.');

    // Check content integrity — verify parser did NOT alter original text.
    const page1 = pages.find(p => p.title === 'Test Page 1');
    if (!page1 || !page1.content.includes('This is the content of the first page.')) {
      throw new Error(`Content fidelity check failed: original text not preserved in parsed output.`);
    }
    const expectedPage2Text = 'It has an image';
    if (expectedPage2Text && (!page2 || !page2.content.includes(expectedPage2Text))) {
      throw new Error('Content integrity: second page text was altered during parsing.');
    }

    console.log('\n✨ ALL TESTS PASSED! ✨');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error(error);
    process.exit(1);
  } finally {
    if (existsSync(testDir)) {
      console.log(`Cleaning up test directory: ${testDir}`);
      rmSync(testDir, { recursive: true, force: true });
    }
    await prisma.$disconnect();
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
