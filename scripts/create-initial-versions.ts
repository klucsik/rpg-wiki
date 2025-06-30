// This script creates initial versions for existing pages that don't have versions yet
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function createInitialVersions() {
  console.log('Creating initial versions for existing pages...');
  
  // Find all pages that don't have versions
  const pagesWithoutVersions = await prisma.page.findMany({
    where: {
      versions: {
        none: {}
      }
    }
  });

  console.log(`Found ${pagesWithoutVersions.length} pages without versions`);

  for (const page of pagesWithoutVersions) {
    console.log(`Creating initial version for page: ${page.title}`);
    
    await prisma.pageVersion.create({
      data: {
        page_id: page.id,
        version: 1,
        title: page.title,
        content: page.content,
        path: page.path,
        edit_groups: page.edit_groups,
        view_groups: page.view_groups,
        edited_by: 'System Migration',
        change_summary: 'Initial version created during migration',
      },
    });
  }

  console.log('Initial versions created successfully');
}

createInitialVersions()
  .catch((e) => {
    console.error('Error creating initial versions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
