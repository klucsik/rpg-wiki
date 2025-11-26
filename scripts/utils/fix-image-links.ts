#!/usr/bin/env tsx

/**
 * Image Link Fixer
 * 
 * Scans all wiki pages and updates image links to use the correct
 * /api/images/:id format based on API endpoints.
 * 
 * Usage:
 *   npx tsx scripts/fix-image-links.ts [options]
 * 
 * Options:
 *   --base-url=URL    Base URL for API calls (default: http://localhost:3000)
 *   --api-key=KEY     API key for authentication (or use IMPORT_API_KEY env var)
 *   --dry-run         Show what would be changed without making updates
 * 
 * The script will:
 * - Build filename-to-ID mappings from the API
 * - Scan all page content for image references
 * - Update links to use /api/images/:id format
 * - Generate a detailed report of changes made
 */

import { writeFileSync } from 'fs';

interface ImageMapping {
  originalPath: string;
  newId: number;
  newUrl: string;
}

interface Page {
  id: number;
  title: string;
  path: string;
  content: string;
}

interface Image {
  id: number;
  filename: string;
}

class ImageLinkFixer {
  private baseUrl: string;
  private apiKey: string | undefined;
  private imageMappings: Map<string, ImageMapping> = new Map();

  constructor(baseUrl = 'http://localhost:3000', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.IMPORT_API_KEY;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Fetch all images from the API
   */
  private async fetchImages(): Promise<Image[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/images`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Fetch all pages from the API
   */
  private async fetchPages(): Promise<Page[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pages`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pages:', error);
      throw error;
    }
  }

  /**
   * Fetch a single page's content from the API
   */
  private async fetchPage(pageId: number): Promise<Page | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pages/${pageId}`, {
        headers: this.getHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageId}: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching page ${pageId}:`, error);
      return null;
    }
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
   * Build image mapping from API
   */
  private async buildImageMapping(): Promise<void> {
    console.log('Building image mapping from API...');
    
    const images = await this.fetchImages();

    console.log(`Found ${images.length} images from API`);

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
      const response = await fetch(`${this.baseUrl}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          title,
          content,
          path,
          change_summary: 'Fixed image links to use correct database IDs'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 404) {
          console.error(`Page ${pageId} not found - it may have been deleted or not imported correctly`);
        } else if (response.status === 500) {
          console.error(`Server error updating page ${pageId}: ${errorText}`);
          // For 500 errors, it might be worth retrying once
          console.log(`  Retrying page ${pageId} in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryResponse = await fetch(`${this.baseUrl}/api/pages/${pageId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
              title,
              content,
              path,
              change_summary: 'Fixed image links to use correct database IDs (retry)'
            })
          });
          
          if (retryResponse.ok) {
            console.log(`  ✓ Retry successful for page ${pageId}`);
            return true;
          } else {
            const retryErrorText = await retryResponse.text();
            console.error(`  ✗ Retry failed for page ${pageId}: ${retryResponse.status} ${retryErrorText}`);
          }
        } else {
          console.error(`API error updating page ${pageId}: ${response.status} ${errorText}`);
        }
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
    
    // Get all pages from the API
    const pages = await this.fetchPages();

    console.log(`\nProcessing ${pages.length} pages...`);

    let totalUpdated = 0;
    const allChanges: Array<{
      pageId: number;
      title: string;
      changes: string[];
    }> = [];

    for (const page of pages) {
      // Fetch full page content
      const fullPage = await this.fetchPage(page.id);
      if (!fullPage) {
        console.log(`  - Page "${page.title}" (ID: ${page.id}) not found or inaccessible`);
        continue;
      }

      const result = this.fixPageImageLinks(page.id, page.title, fullPage.content);
      
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
   * List all images from API for debugging
   */
  public async listImages(): Promise<void> {
    const images = await this.fetchImages();

    console.log(`\nImages from API (${images.length} total):`);
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
  const apiKey = args.find(arg => arg.startsWith('--api-key='))?.split('=')[1];

  console.log('Image Link Fixer for RPG Wiki');
  console.log('==============================');
  
  const fixer = new ImageLinkFixer(baseUrl, apiKey);

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
  main().catch(console.error);
}

export { ImageLinkFixer };
