#!/usr/bin/env tsx

/**
 * Image Link Fixer
 * 
 * Scans all wiki pages and updates image links to use the correct
 * /api/images/:id format based on database mappings.
 * 
 * Usage:
 *   npx tsx scripts/fix-image-links.ts [options]
 * 
 * Options:
 *   --base-url=URL    Base URL for API calls (default: http://localhost:3000)
 *   --dry-run         Show what would be changed without making updates
 * 
 * The script will:
 * - Build filename-to-ID mappings from the database
 * - Scan all page content for image references
 * - Update links to use /api/images/:id format
 * - Generate a detailed report of changes made
 */

import { prisma } from '../src/db';
import { writeFileSync } from 'fs';

interface ImageMapping {
  originalPath: string;
  newId: number;
  newUrl: string;
}

class ImageLinkFixer {
  private baseUrl: string;
  private imageMappings: Map<string, ImageMapping> = new Map();

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Extract filename from a path (handling both forward and backward slashes)
   * Special handling for /api/images/ID format
   */
  private extractFilename(path: string): string {
    // Handle /api/images/ID format - extract just the ID
    const apiImageMatch = path.match(/\/api\/images\/(\d+)$/);
    if (apiImageMatch) {
      return apiImageMatch[1]; // Return just the ID number
    }
    
    // Regular filename extraction
    return path.split(/[/\\]/).pop() || path;
  }

  /**
   * Build image mapping from database
   */
  private async buildImageMapping(): Promise<void> {
    console.log('Building image mapping from database...');
    
    const images = await prisma.image.findMany({
      select: { id: true, filename: true }
    });

    console.log(`Found ${images.length} images in database`);

    for (const image of images) {
      const filename = this.extractFilename(image.filename);
      const mapping: ImageMapping = {
        originalPath: image.filename,
        newId: image.id,
        newUrl: `/api/images/${image.id}`
      };
      
      // Store by filename (without path)
      this.imageMappings.set(filename, mapping);
      
      // Also store by full filename if different
      if (filename !== image.filename) {
        this.imageMappings.set(image.filename, mapping);
      }
      
      // Store by full path with /api/images/ prefix (for direct path matching)
      this.imageMappings.set(`/api/images/${image.filename}`, mapping);
      
      // Store by image ID as string (for fixing /api/images/ID references)
      this.imageMappings.set(image.id.toString(), mapping);
    }

    console.log(`Built ${this.imageMappings.size} image mappings`);
  }

  /**
   * Find all image references in page content
   */
  private findImageReferences(content: string): RegExp[] {
    // Common patterns for image references
    return [
      // img src attributes
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
      // Markdown image syntax
      /!\[[^\]]*\]\(([^)]+)\)/gi,
      // Direct file references (common in wiki content)
      /\/api\/images\/[^\/\s"']+\.(jpg|jpeg|png|gif|webp|svg)/gi,
      // Legacy file paths
      /\/[^\/\s"']*\.(jpg|jpeg|png|gif|webp|svg)/gi
    ];
  }

  /**
   * Extract image paths from content using multiple patterns
   */
  private extractImagePaths(content: string): string[] {
    const imagePaths = new Set<string>();
    
    // Pattern 1: <img src="..." />
    const imgTags = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    if (imgTags) {
      for (const imgTag of imgTags) {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          imagePaths.add(srcMatch[1]);
        }
      }
    }

    // Pattern 2: Markdown ![alt](url)
    const markdownImages = content.match(/!\[[^\]]*\]\(([^)]+)\)/gi);
    if (markdownImages) {
      for (const mdImg of markdownImages) {
        const urlMatch = mdImg.match(/!\[[^\]]*\]\(([^)]+)\)/i);
        if (urlMatch) {
          imagePaths.add(urlMatch[1]);
        }
      }
    }

    // Pattern 3: Direct file references that look like images
    const directRefs = content.match(/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|svg)(?:\?[^"\s<>]*)?/gi);
    if (directRefs) {
      for (const ref of directRefs) {
        imagePaths.add(ref);
      }
    }

    // Pattern 4: /api/images/path/to/file.ext references (file paths in API format)
    const apiImagePathRefs = content.match(/\/api\/images\/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|svg)/gi);
    if (apiImagePathRefs) {
      for (const ref of apiImagePathRefs) {
        imagePaths.add(ref);
      }
    }

    // Pattern 5: /api/images/ID references (numeric IDs)
    const apiImageRefs = content.match(/\/api\/images\/\d+/gi);
    if (apiImageRefs) {
      for (const ref of apiImageRefs) {
        imagePaths.add(ref);
      }
    }

    return Array.from(imagePaths);
  }

  /**
   * Replace image path with new URL
   */
  private replaceImagePath(content: string, oldPath: string, newUrl: string): string {
    let updatedContent = content;
    
    // Escape special regex characters in the old path
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace in img src attributes
    updatedContent = updatedContent.replace(
      new RegExp(`(<img[^>]+src=["'])${escapedOldPath}(["'][^>]*>)`, 'gi'),
      `$1${newUrl}$2`
    );
    
    // Replace in markdown images
    updatedContent = updatedContent.replace(
      new RegExp(`(!\\[[^\\]]*\\]\\()${escapedOldPath}(\\))`, 'gi'),
      `$1${newUrl}$2`
    );
    
    // Replace direct references
    updatedContent = updatedContent.replace(
      new RegExp(`\\b${escapedOldPath}\\b`, 'gi'),
      newUrl
    );

    return updatedContent;
  }

  /**
   * Fix image links in a single page
   */
  private fixPageImageLinks(pageId: number, title: string, content: string): { updated: boolean; newContent: string; changes: string[] } {
    const imagePaths = this.extractImagePaths(content);
    let updatedContent = content;
    const changes: string[] = [];
    let updated = false;

    console.log(`\nAnalyzing page "${title}" (ID: ${pageId})`);
    console.log(`Found ${imagePaths.length} potential image references`);

    for (const imagePath of imagePaths) {
      let mapping: ImageMapping | undefined;
      
      // First, try to match by filename extraction
      const filename = this.extractFilename(imagePath);
      mapping = this.imageMappings.get(filename);
      
      // If no mapping found and this looks like a file path with /api/images/,
      // try to extract the actual filename and match
      if (!mapping && imagePath.startsWith('/api/images/')) {
        const pathWithoutPrefix = imagePath.replace('/api/images/', '');
        const actualFilename = pathWithoutPrefix.split('/').pop();
        if (actualFilename) {
          mapping = this.imageMappings.get(actualFilename);
          if (mapping) {
            console.log(`  Found mapping by actual filename: ${actualFilename}`);
          }
        }
      }
      
      // If still no mapping and this is /api/images/NUMBER, check if the ID exists in database
      if (!mapping && imagePath.match(/\/api\/images\/\d+$/)) {
        const numericId = imagePath.match(/\/api\/images\/(\d+)$/)?.[1];
        if (numericId) {
          // Check if this numeric ID actually exists in our mappings
          mapping = this.imageMappings.get(numericId);
          if (mapping) {
            // This is actually a correct reference, no change needed
            console.log(`  Numeric API reference is correct: ${imagePath}`);
            continue;
          } else {
            console.log(`  Invalid numeric API reference (no image with ID ${numericId}): ${imagePath}`);
            continue;
          }
        }
      }

      if (mapping && imagePath !== mapping.newUrl) {
        console.log(`  Replacing: ${imagePath} -> ${mapping.newUrl}`);
        updatedContent = this.replaceImagePath(updatedContent, imagePath, mapping.newUrl);
        changes.push(`${imagePath} -> ${mapping.newUrl}`);
        updated = true;
      } else if (!mapping) {
        console.log(`  No mapping found for: ${imagePath} (filename: ${filename})`);
      } else {
        console.log(`  Already correct: ${imagePath}`);
      }
    }

    return { updated, newContent: updatedContent, changes };
  }

  /**
   * Update a page via the API (which properly handles versioning)
   */
  private async updatePageViaAPI(pageId: number, title: string, content: string, path: string): Promise<boolean> {
    try {
      const apiKey = process.env.IMPORT_API_KEY;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/pages/${pageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title,
          content,
          path,
          change_summary: 'Fixed image links to use correct database IDs'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error updating page ${pageId}: ${response.status} ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error updating page ${pageId} via API:`, error);
      return false;
    }
  }

  /**
   * Fix image links in all pages using the API
   */
  public async fixAllPages(dryRun = false): Promise<void> {
    console.log('Fixing image links in all pages...');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    
    await this.buildImageMapping();
    
    // Get pages with their latest versions
    const pages = await prisma.page.findMany({
      select: { 
        id: true, 
        title: true, 
        path: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { content: true, version: true }
        }
      }
    });

    console.log(`\nProcessing ${pages.length} pages...`);

    let totalUpdated = 0;
    const allChanges: Array<{
      pageId: number;
      title: string;
      changes: string[];
    }> = [];

    for (const page of pages) {
      const latestVersion = page.versions[0];
      if (!latestVersion) {
        console.log(`  - No versions found for "${page.title}"`);
        continue;
      }

      const result = this.fixPageImageLinks(page.id, page.title, latestVersion.content);
      
      if (result.updated) {
        totalUpdated++;
        allChanges.push({
          pageId: page.id,
          title: page.title,
          changes: result.changes
        });

        if (!dryRun) {
          // Use the API to update the page (which will create a new version)
          const success = await this.updatePageViaAPI(page.id, page.title, result.newContent, page.path);
          if (success) {
            console.log(`  ✓ Updated page "${page.title}"`);
          } else {
            console.log(`  ✗ Failed to update page "${page.title}"`);
          }
        } else {
          console.log(`  ✓ Would update page "${page.title}"`);
        }
      } else {
        console.log(`  - No changes needed for "${page.title}"`);
      }
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      dryRun,
      totalPages: pages.length,
      pagesUpdated: totalUpdated,
      imageMappings: Array.from(this.imageMappings.entries()).map(([key, value]) => ({
        key,
        value
      })),
      changes: allChanges
    };

    const reportPath = `/home/klucsik/src/rpg-wiki/image-link-fix-report-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n${'='.repeat(50)}`);
    console.log('Image Link Fix Summary');
    console.log(`${'='.repeat(50)}`);
    console.log(`Total pages: ${pages.length}`);
    console.log(`Pages updated: ${totalUpdated}`);
    console.log(`Available images: ${this.imageMappings.size}`);
    console.log(`Report saved: ${reportPath}`);
    
    if (dryRun) {
      console.log('\nThis was a DRY RUN. No actual changes were made.');
      console.log('Run again without --dry-run flag to apply changes.');
    }
  }

  /**
   * List all images in database for debugging
   */
  public async listImages(): Promise<void> {
    const images = await prisma.image.findMany({
      select: { id: true, filename: true, createdAt: true }
    });

    console.log(`\nImages in database (${images.length} total):`);
    console.log('='.repeat(60));
    
    for (const image of images) {
      console.log(`ID: ${image.id.toString().padStart(3)} | ${image.filename}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const listOnly = args.includes('--list-images');
  const baseUrl = args.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3000';

  console.log('Image Link Fixer for RPG Wiki');
  console.log('==============================');
  
  const fixer = new ImageLinkFixer(baseUrl);

  if (listOnly) {
    await fixer.listImages();
    return;
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
  }

  await fixer.fixAllPages(dryRun);
}

if (require.main === module) {
  main().catch(console.error).finally(() => {
    prisma.$disconnect();
  });
}

export { ImageLinkFixer };
