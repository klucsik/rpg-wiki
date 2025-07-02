#!/usr/bin/env tsx

/**
 * Complete Wiki Import Script
 * 
 * This script handles the entire wiki import process:
 * 1. Imports all images and creates mappings
 * 2. Imports all wiki pages with proper AsciiDoc processing
 * 3. Fixes all image links to use correct API URLs
 * 
 * Usage:
 *   npx tsx scripts/import-all.ts [source-path] [base-url] [options]
 *   example: npx tsx scripts/import-all.ts /home/klucsik/src/gyongy-wiki http://localhost:3000 --update-existing
 * 
 * Options:
 *   --update-existing    Update existing pages instead of skipping them
 *   --skip-images        Skip image import (if already done)
 *   --skip-pages         Skip page import (if already done)
 *   --skip-link-fix      Skip image link fixing (if already done)
 *   --exclude-tags=tag1,tag2  Exclude pages with specific tags (e.g., dm_only)
 *   --dry-run            Show what would be done without making changes
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

interface ImportOptions {
  sourcePath: string;
  baseUrl: string;
  updateExisting: boolean;
  skipImages: boolean;
  skipPages: boolean;
  skipLinkFix: boolean;
  dryRun: boolean;
  excludeTags: string[];
}

class WikiImporter {
  private options: ImportOptions;

  constructor(options: ImportOptions) {
    this.options = options;
  }

  /**
   * Run a script and wait for completion
   */
  private async runScript(scriptName: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running ${scriptName}...`);
      console.log(`Command: npx tsx scripts/${scriptName} ${args.join(' ')}`);
      
      if (this.options.dryRun) {
        console.log(`[DRY RUN] Would run: npx tsx scripts/${scriptName} ${args.join(' ')}`);
        resolve();
        return;
      }

      const child = spawn('npx', ['tsx', `scripts/${scriptName}`, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${scriptName} completed successfully`);
          resolve();
        } else {
          console.error(`❌ ${scriptName} failed with code ${code}`);
          reject(new Error(`Script ${scriptName} failed`));
        }
      });

      child.on('error', (err) => {
        console.error(`❌ Failed to start ${scriptName}:`, err);
        reject(err);
      });
    });
  }

  /**
   * Check if the API is accessible
   */
  private async checkApiHealth(): Promise<boolean> {
    try {
      console.log(`\n🔍 Checking API health at ${this.options.baseUrl}...`);
      
      const response = await fetch(`${this.options.baseUrl}/api/groups`);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      console.log('✅ API is accessible');
      return true;
    } catch (error) {
      console.error('❌ API is not accessible:', error);
      console.error('Please make sure the development server is running with: npm run dev');
      return false;
    }
  }

  /**
   * Import images and create database mappings
   */
  private async importImages(): Promise<void> {
    if (this.options.skipImages) {
      console.log('\n⏭️  Skipping image import (--skip-images)');
      return;
    }

    const args = [this.options.sourcePath, this.options.baseUrl];
    await this.runScript('import-images.ts', args);
  }

  /**
   * Import wiki pages with AsciiDoc processing
   */
  private async importPages(): Promise<void> {
    if (this.options.skipPages) {
      console.log('\n⏭️  Skipping page import (--skip-pages)');
      return;
    }

    const args = [this.options.sourcePath, this.options.baseUrl];
    
    if (this.options.updateExisting) {
      args.push('--update-existing');
    } else {
      args.push('--skip-existing');
    }

    if (this.options.excludeTags.length > 0) {
      args.push(`--exclude-tags=${this.options.excludeTags.join(',')}`);
    }

    await this.runScript('import-wikijs.ts', args);
  }

  /**
   * Fix image links in all pages
   */
  private async fixImageLinks(): Promise<void> {
    if (this.options.skipLinkFix) {
      console.log('\n⏭️  Skipping image link fix (--skip-link-fix)');
      return;
    }

    const args = [`--base-url=${this.options.baseUrl}`];
    
    if (this.options.dryRun) {
      args.push('--dry-run');
    }

    await this.runScript('fix-image-links.ts', args);
  }

  /**
   * Run the complete import process
   */
  async run(): Promise<void> {
    console.log('🌟 Wiki Import Process Started');
    console.log('================================');
    console.log(`Source Path: ${this.options.sourcePath}`);
    console.log(`Target API: ${this.options.baseUrl}`);
    console.log(`Update Existing: ${this.options.updateExisting}`);
    console.log(`Excluded Tags: ${this.options.excludeTags.length > 0 ? this.options.excludeTags.join(', ') : 'none'}`);
    console.log(`Dry Run: ${this.options.dryRun}`);
    console.log('');

    try {
      // Check if source path exists
      if (!existsSync(this.options.sourcePath)) {
        throw new Error(`Source path does not exist: ${this.options.sourcePath}`);
      }

      // Check API health
      if (!this.options.dryRun) {
        const apiHealthy = await this.checkApiHealth();
        if (!apiHealthy) {
          throw new Error('API is not accessible');
        }
      }

      // Step 1: Import images
      await this.importImages();

      // Step 2: Import pages
      await this.importPages();

      // Step 3: Fix image links
      await this.fixImageLinks();

      console.log('\n🎉 Wiki Import Process Completed Successfully!');
      console.log('============================================');
      
      if (!this.options.dryRun) {
        console.log(`\n📊 Summary:`);
        console.log(`- Images imported and mapped to database IDs`);
        console.log(`- Wiki pages imported with proper AsciiDoc processing`);
        console.log(`- Image links updated to use /api/images/:id format`);
        console.log(`\n🌐 Your wiki is now available at: ${this.options.baseUrl}`);
      }

    } catch (error) {
      console.error('\n💥 Import Process Failed');
      console.error('=========================');
      console.error(error);
      process.exit(1);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  
  // Get positional arguments
  const sourcePath = args.find(arg => !arg.startsWith('--')) || '/home/klucsik/src/gyongy-wiki';
  const baseUrlArg = args.find(arg => !arg.startsWith('--') && arg !== sourcePath);
  const baseUrl = baseUrlArg || 'http://localhost:3000';

  // Parse flags
  const updateExisting = args.includes('--update-existing');
  const skipImages = args.includes('--skip-images');
  const skipPages = args.includes('--skip-pages');
  const skipLinkFix = args.includes('--skip-link-fix');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  // Parse exclude tags
  const excludeTagsArg = args.find(arg => arg.startsWith('--exclude-tags='));
  const excludeTags = excludeTagsArg 
    ? excludeTagsArg.substring('--exclude-tags='.length).split(',').map(tag => tag.trim()).filter(tag => tag)
    : [];

  if (help) {
    console.log(`
Wiki Import Script
==================

Usage:
  npx tsx scripts/import-all.ts [source-path] [base-url] [options]

Arguments:
  source-path      Path to the source wiki directory (default: /home/klucsik/src/gyongy-wiki)
  base-url         Base URL of the API (default: http://localhost:3000)

Options:
  --update-existing    Update existing pages instead of skipping them
  --skip-images        Skip image import (if already done)
  --skip-pages         Skip page import (if already done)  
  --skip-link-fix      Skip image link fixing (if already done)
  --exclude-tags=tag1,tag2  Exclude pages with specific tags (e.g., dm_only)
  --dry-run            Show what would be done without making changes
  --help, -h           Show this help message

Examples:
  # Complete import with default settings
  npx tsx scripts/import-all.ts

  # Import from custom path and update existing pages
  npx tsx scripts/import-all.ts /path/to/wiki http://localhost:3000 --update-existing

  # Only fix image links (skip import steps)
  npx tsx scripts/import-all.ts --skip-images --skip-pages

  # Exclude DM-only content from import
  npx tsx scripts/import-all.ts --exclude-tags=dm_only,dmonly

  # Dry run to see what would happen
  npx tsx scripts/import-all.ts --dry-run
`);
    process.exit(0);
  }

  return {
    sourcePath,
    baseUrl,
    updateExisting,
    skipImages,
    skipPages,
    skipLinkFix,
    dryRun,
    excludeTags
  };
}

// Main execution
async function main() {
  const options = parseArgs();
  const importer = new WikiImporter(options);
  await importer.run();
}

main().catch(console.error);
