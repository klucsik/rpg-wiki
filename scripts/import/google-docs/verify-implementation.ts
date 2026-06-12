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
