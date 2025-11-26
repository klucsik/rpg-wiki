#!/usr/bin/env tsx

/**
 * Import Script for RPG Wiki
 * 
 * Imports wiki pages and images from filesystem in the format created by export-to-filesystem.ts:
 * - Pages: imports from path/title.html with metadata in HTML comments
 * - Images: imports from images/ directory with .meta files
 * - Maintains hierarchical structure and recreates page paths
 * 
 * Usage:
 *   npx tsx scripts/import-from-filesystem.ts <import-path> [options]
 * 
 * Options:
 *   --skip-existing     Skip pages/images that already exist (default)
 *   --update-existing   Update existing pages/images instead of skipping
 *   --import-versions   Import all page versions (from versions/ subdirectories)
 *   --dry-run          Show what would be imported without making changes
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative, basename, dirname } from 'path';
import { prisma } from '../src/db';

interface ImportOptions {
  skipExisting: boolean;
  updateExisting: boolean;
  importVersions: boolean;
  dryRun: boolean;
}

interface ImportStats {
  pagesImported: number;
  imagesImported: number;
  versionsImported: number;
  pagesSkipped: number;
  imagesSkipped: number;
  errors: number;
}

interface PageMetadata {
  title: string;
  path: string;
  published: boolean;
  date: string;
  created?: string;
  edit_groups?: string[];
  view_groups?: string[];
  version?: number;
  edited_by?: string;
  change_summary?: string;
  is_draft?: boolean;
}

function parseArgs(): { importPath: string; options: ImportOptions } {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/import-from-filesystem.ts <import-path> [options]');
    process.exit(1);
  }

  const importPath = args[0];
  const options: ImportOptions = {
    skipExisting: !args.includes('--update-existing'),
    updateExisting: args.includes('--update-existing'),
    importVersions: args.includes('--import-versions'),
    dryRun: args.includes('--dry-run')
  };

  return { importPath, options };
}

function parseMetadata(content: string): { metadata: PageMetadata | null; htmlContent: string } {
  const metadataMatch = content.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n\n([\s\S]*)$/);
  
  if (!metadataMatch) {
    return { metadata: null, htmlContent: content };
  }

  const metadataText = metadataMatch[1];
  const htmlContent = metadataMatch[2];
  
  const metadata: Partial<PageMetadata> = {};
  
  metadataText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    switch (key) {
      case 'title':
        metadata.title = value;
        break;
      case 'path':
        metadata.path = value;
        break;
      case 'published':
        metadata.published = value === 'true';
        break;
      case 'date':
        metadata.date = value;
        break;
      case 'created':
        metadata.created = value;
        break;
      case 'edit_groups':
        metadata.edit_groups = value.split(', ').map(g => g.trim()).filter(Boolean);
        break;
      case 'view_groups':
        metadata.view_groups = value.split(', ').map(g => g.trim()).filter(Boolean);
        break;
      case 'version':
        metadata.version = parseInt(value);
        break;
      case 'edited_by':
        metadata.edited_by = value;
        break;
      case 'change_summary':
        metadata.change_summary = value;
        break;
      case 'is_draft':
        metadata.is_draft = value === 'true';
        break;
    }
  });

  return { 
    metadata: metadata as PageMetadata, 
    htmlContent 
  };
}

function generatePathFromFile(filePath: string, importBasePath: string): string {
  const relativePath = relative(importBasePath, filePath);
  const pathParts = relativePath.split('/').filter(part => part !== 'versions');
  
  // Remove .html extension and convert filename back to path segment
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart.endsWith('.html')) {
    pathParts[pathParts.length - 1] = basename(lastPart, '.html')
      .replace(/-v\d+$/, '') // Remove version suffix if present
      .replace(/-/g, '-'); // Keep dashes as they were sanitized
  }
  
  return '/' + pathParts.join('/');
}

async function importPage(filePath: string, importBasePath: string, options: ImportOptions): Promise<boolean> {
  try {
    const content = readFileSync(filePath, 'utf8');
    const { metadata, htmlContent } = parseMetadata(content);
    
    if (!metadata) {
      console.warn(`No metadata found in ${filePath}, skipping`);
      return false;
    }

    // Use metadata path if available, otherwise generate from file structure
    const pagePath = metadata.path || generatePathFromFile(filePath, importBasePath);
    
    if (options.dryRun) {
      console.log(`Would import page: ${metadata.title} -> ${pagePath}`);
      return true;
    }

    // Check if page already exists
    const existingPage = await prisma.page.findFirst({
      where: { path: pagePath }
    });

    if (existingPage && options.skipExisting) {
      console.log(`Skipping existing page: ${pagePath}`);
      return false;
    }

    const pageData = {
      title: metadata.title,
      content: htmlContent,
      path: pagePath,
      edit_groups: metadata.edit_groups || [],
      view_groups: metadata.view_groups || [],
      created_at: metadata.created ? new Date(metadata.created) : undefined,
      updated_at: metadata.date ? new Date(metadata.date) : undefined
    };

    if (existingPage && options.updateExisting) {
      // Update existing page
      await prisma.page.update({
        where: { id: existingPage.id },
        data: {
          title: pageData.title,
          content: pageData.content,
          edit_groups: pageData.edit_groups,
          view_groups: pageData.view_groups,
          updated_at: pageData.updated_at || new Date()
        }
      });
      console.log(`Updated page: ${pagePath}`);
    } else {
      // Create new page
      await prisma.page.create({
        data: {
          ...pageData,
          created_at: pageData.created_at || new Date(),
          updated_at: pageData.updated_at || new Date()
        }
      });
      console.log(`Imported page: ${pagePath}`);
    }

    return true;
  } catch (error) {
    console.error(`Error importing page ${filePath}:`, error);
    return false;
  }
}

async function importVersion(filePath: string, options: ImportOptions): Promise<boolean> {
  try {
    const content = readFileSync(filePath, 'utf8');
    const { metadata, htmlContent } = parseMetadata(content);
    
    if (!metadata || !metadata.version) {
      console.warn(`No version metadata found in ${filePath}, skipping`);
      return false;
    }

    if (options.dryRun) {
      console.log(`Would import version: ${metadata.title} v${metadata.version} -> ${metadata.path}`);
      return true;
    }

    // Find the corresponding page
    const page = await prisma.page.findFirst({
      where: { path: metadata.path }
    });

    if (!page) {
      console.warn(`Page not found for version ${filePath}, skipping`);
      return false;
    }

    // Check if version already exists
    const existingVersion = await prisma.pageVersion.findUnique({
      where: {
        page_id_version: {
          page_id: page.id,
          version: metadata.version
        }
      }
    });

    if (existingVersion && options.skipExisting) {
      console.log(`Skipping existing version: ${metadata.path} v${metadata.version}`);
      return false;
    }

    const versionData = {
      page_id: page.id,
      version: metadata.version,
      title: metadata.title,
      content: htmlContent,
      path: metadata.path,
      edit_groups: metadata.edit_groups || [],
      view_groups: metadata.view_groups || [],
      edited_by: metadata.edited_by || 'import',
      change_summary: metadata.change_summary || 'Imported from filesystem',
      is_draft: metadata.is_draft || false,
      edited_at: metadata.date ? new Date(metadata.date) : new Date()
    };

    if (existingVersion && options.updateExisting) {
      await prisma.pageVersion.update({
        where: { id: existingVersion.id },
        data: versionData
      });
      console.log(`Updated version: ${metadata.path} v${metadata.version}`);
    } else {
      await prisma.pageVersion.create({
        data: versionData
      });
      console.log(`Imported version: ${metadata.path} v${metadata.version}`);
    }

    return true;
  } catch (error) {
    console.error(`Error importing version ${filePath}:`, error);
    return false;
  }
}

async function importImage(filePath: string, options: ImportOptions): Promise<boolean> {
  try {
    const metaFilePath = filePath + '.meta';
    
    if (!existsSync(metaFilePath)) {
      console.warn(`No metadata file found for ${filePath}, skipping`);
      return false;
    }

    const metadataText = readFileSync(metaFilePath, 'utf8');
    const metadata = JSON.parse(metadataText);
    
    if (options.dryRun) {
      console.log(`Would import image: ${metadata.filename}`);
      return true;
    }

    // Check if image already exists by filename
    const existingImage = await prisma.media.findFirst({
      where: { filename: metadata.filename }
    });

    if (existingImage && options.skipExisting) {
      console.log(`Skipping existing image: ${metadata.filename}`);
      return false;
    }

    // Read image data
    const imageData = readFileSync(filePath);
    
    // Find or create user (for now, use a default user or the one from metadata)
    let userId = metadata.userId;
    
    // If user doesn't exist, we might need to create one or use a default
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Try to find a user or create a default import user
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        userId = defaultUser.id;
      } else {
        console.warn(`No user found for image ${metadata.filename}, skipping`);
        return false;
      }
    }

    const imageCreateData = {
      filename: metadata.filename,
      mimetype: metadata.mimetype,
      data: imageData,
      userId: userId,
      createdAt: metadata.createdAt ? new Date(metadata.createdAt) : new Date()
    };

    if (existingImage && options.updateExisting) {
      await prisma.media.update({
        where: { id: existingImage.id },
        data: {
          data: imageData,
          mimetype: metadata.mimetype
        }
      });
      console.log(`Updated image: ${metadata.filename}`);
    } else {
      await prisma.media.create({
        data: imageCreateData
      });
      console.log(`Imported image: ${metadata.filename}`);
    }

    return true;
  } catch (error) {
    console.error(`Error importing image ${filePath}:`, error);
    return false;
  }
}

async function findHtmlFiles(dir: string, files: string[] = []): Promise<string[]> {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stats = statSync(fullPath);
    
    if (stats.isDirectory()) {
      await findHtmlFiles(fullPath, files);
    } else if (extname(item) === '.html') {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main(): Promise<void> {
  const { importPath, options } = parseArgs();
  
  console.log('RPG Wiki Import Tool');
  console.log('===================');
  console.log(`Import path: ${importPath}`);
  console.log(`Options:`, options);
  console.log();

  if (options.dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  const stats: ImportStats = {
    pagesImported: 0,
    imagesImported: 0,
    versionsImported: 0,
    pagesSkipped: 0,
    imagesSkipped: 0,
    errors: 0
  };

  try {
    // Import pages
    console.log('Importing pages...');
    const htmlFiles = await findHtmlFiles(importPath);
    
    for (const filePath of htmlFiles) {
      // Skip version files for now if not importing versions
      if (!options.importVersions && filePath.includes('/versions/')) {
        continue;
      }
      
      if (options.importVersions && filePath.includes('/versions/')) {
        const success = await importVersion(filePath, options);
        if (success) stats.versionsImported++;
        else stats.errors++;
      } else {
        const success = await importPage(filePath, importPath, options);
        if (success) stats.pagesImported++;
        else stats.pagesSkipped++;
      }
    }

    // Import images
    const imagesDir = join(importPath, 'images');
    if (existsSync(imagesDir)) {
      console.log('\nImporting images...');
      const imageFiles = readdirSync(imagesDir)
        .filter(file => !file.endsWith('.meta'))
        .map(file => join(imagesDir, file));
      
      for (const filePath of imageFiles) {
        const success = await importImage(filePath, options);
        if (success) stats.imagesImported++;
        else stats.imagesSkipped++;
      }
    }

    console.log('\nImport completed successfully!');
    console.log(`Pages imported: ${stats.pagesImported}`);
    console.log(`Pages skipped: ${stats.pagesSkipped}`);
    console.log(`Versions imported: ${stats.versionsImported}`);
    console.log(`Images imported: ${stats.imagesImported}`);
    console.log(`Images skipped: ${stats.imagesSkipped}`);
    console.log(`Errors: ${stats.errors}`);
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
