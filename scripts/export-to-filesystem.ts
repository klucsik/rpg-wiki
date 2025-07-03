#!/usr/bin/env tsx

/**
 * Export Script for RPG Wiki
 * 
 * Exports all wiki pages and images to filesystem in a git-friendly format:
 * - Pages: exported as path/title.html with metadata in HTML comments
 * - Images: exported to images/ directory with original filenames
 * - Maintains hierarchical structure based on page paths
 * 
 * Usage:
 *   npx tsx scripts/export-to-filesystem.ts <export-path> [options]
 * 
 * Options:
 *   --include-drafts    Include draft versions in export
 *   --latest-only      Export only latest version of each page (default)
 *   --all-versions     Export all versions of pages
 *   --dry-run          Show what would be exported without creating files
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { prisma } from '../src/db';

interface ExportOptions {
  includeDrafts: boolean;
  latestOnly: boolean;
  allVersions: boolean;
  dryRun: boolean;
}

interface ExportStats {
  pagesExported: number;
  imagesExported: number;
  versionsExported: number;
  errors: number;
}

function parseArgs(): { exportPath: string; options: ExportOptions } {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/export-to-filesystem.ts <export-path> [options]');
    process.exit(1);
  }

  const exportPath = args[0];
  const options: ExportOptions = {
    includeDrafts: args.includes('--include-drafts'),
    latestOnly: !args.includes('--all-versions'),
    allVersions: args.includes('--all-versions'),
    dryRun: args.includes('--dry-run')
  };

  return { exportPath, options };
}

function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are problematic in filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function createMetadataHeader(page: any, version?: any): string {
  const data = version || page;
  const metadata = [
    `title: ${data.title}`,
    `path: ${data.path}`,
    `published: true`,
    `date: ${data.updated_at || data.edited_at}`,
    `created: ${page.created_at}`,
    data.edit_groups?.length ? `edit_groups: ${data.edit_groups.join(', ')}` : null,
    data.view_groups?.length ? `view_groups: ${data.view_groups.join(', ')}` : null,
    version ? `version: ${version.version}` : null,
    version ? `edited_by: ${version.edited_by}` : null,
    version?.change_summary ? `change_summary: ${version.change_summary}` : null,
    version?.is_draft ? `is_draft: ${version.is_draft}` : null
  ].filter(Boolean).join('\n');

  return `<!--\n${metadata}\n-->\n\n`;
}

function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function exportPages(exportPath: string, options: ExportOptions): Promise<number> {
  const pages = await prisma.page.findMany({
    include: {
      versions: options.allVersions ? {
        where: options.includeDrafts ? {} : { is_draft: false },
        orderBy: { version: 'asc' }
      } : false
    }
  });

  let exported = 0;

  for (const page of pages) {
    try {
      // Determine export directory based on page path
      const pathParts = page.path.split('/').filter(Boolean);
      const pageDir = pathParts.length > 1 
        ? join(exportPath, ...pathParts.slice(0, -1))
        : exportPath;
      
      // Sanitize the filename
      const filename = sanitizeFilename(page.title) + '.html';
      const filePath = join(pageDir, filename);

      if (options.dryRun) {
        console.log(`Would export: ${filePath}`);
        exported++;
        continue;
      }

      ensureDirectoryExists(filePath);

      if (options.latestOnly) {
        // Export latest version
        const content = createMetadataHeader(page) + page.content;
        writeFileSync(filePath, content, 'utf8');
        console.log(`Exported: ${page.path} -> ${filePath}`);
        exported++;
      }

      if (options.allVersions && 'versions' in page && page.versions && page.versions.length > 0) {
        // Export all versions
        for (const version of page.versions) {
          const versionFilename = sanitizeFilename(page.title) + `-v${version.version}.html`;
          const versionFilePath = join(pageDir, 'versions', versionFilename);
          
          ensureDirectoryExists(versionFilePath);
          
          const content = createMetadataHeader(page, version) + version.content;
          writeFileSync(versionFilePath, content, 'utf8');
          console.log(`Exported version: ${page.path} v${version.version} -> ${versionFilePath}`);
          exported++;
        }
      }
    } catch (error) {
      console.error(`Error exporting page ${page.path}:`, error);
    }
  }

  return exported;
}

async function exportImages(exportPath: string, options: ExportOptions): Promise<number> {
  const images = await prisma.image.findMany({
    include: {
      user: true
    }
  });

  let exported = 0;
  const imagesDir = join(exportPath, 'images');

  if (!options.dryRun && !existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  for (const image of images) {
    try {
      const filePath = join(imagesDir, image.filename);
      
      if (options.dryRun) {
        console.log(`Would export image: ${filePath}`);
        exported++;
        continue;
      }

      // Write image data
      writeFileSync(filePath, image.data);
      
      // Create metadata file
      const metadataPath = filePath + '.meta';
      const metadata = {
        id: image.id,
        filename: image.filename,
        mimetype: image.mimetype,
        createdAt: image.createdAt,
        userId: image.userId,
        userName: image.user.name || image.user.username
      };
      
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`Exported image: ${image.filename}`);
      exported++;
    } catch (error) {
      console.error(`Error exporting image ${image.filename}:`, error);
    }
  }

  return exported;
}

async function exportManifest(exportPath: string, stats: ExportStats): Promise<void> {
  const manifest = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    stats,
    structure: {
      pages: 'Organized by path hierarchy',
      images: 'All images in /images directory with .meta files',
      versions: 'Page versions in /versions subdirectories (if --all-versions used)'
    }
  };

  const manifestPath = join(exportPath, 'export-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Export manifest created: ${manifestPath}`);
}

async function main(): Promise<void> {
  const { exportPath, options } = parseArgs();
  
  console.log('RPG Wiki Export Tool');
  console.log('===================');
  console.log(`Export path: ${exportPath}`);
  console.log(`Options:`, options);
  console.log();

  if (options.dryRun) {
    console.log('DRY RUN MODE - No files will be created\n');
  }

  const stats: ExportStats = {
    pagesExported: 0,
    imagesExported: 0,
    versionsExported: 0,
    errors: 0
  };

  try {
    // Ensure export directory exists
    if (!options.dryRun && !existsSync(exportPath)) {
      mkdirSync(exportPath, { recursive: true });
    }

    // Export pages
    console.log('Exporting pages...');
    stats.pagesExported = await exportPages(exportPath, options);

    // Export images
    console.log('\nExporting images...');
    stats.imagesExported = await exportImages(exportPath, options);

    // Create export manifest
    if (!options.dryRun) {
      await exportManifest(exportPath, stats);
    }

    console.log('\nExport completed successfully!');
    console.log(`Pages exported: ${stats.pagesExported}`);
    console.log(`Images exported: ${stats.imagesExported}`);
    
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
