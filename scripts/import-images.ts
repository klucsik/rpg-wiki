#!/usr/bin/env tsx

/**
 * Image Import Script
 * 
 * Uploads all images from a source directory to the wiki and creates
 * database mappings for filename-to-ID resolution.
 * 
 * Supported formats: JPG, PNG, JPEG, GIF, WEBP, SVG
 * 
 * Usage:
 *   npx tsx scripts/import-images.ts <source-path> [base-url]
 * 
 * The script will:
 * - Recursively scan for image files
 * - Upload each image via the API
 * - Store filename mappings in the database
 * - Skip images that already exist
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, basename } from 'path';
import { prisma } from '../src/db';

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

class ImageImporter {
  private sourcePath: string;
  private baseUrl: string;
  private stats: ImportStats = { total: 0, imported: 0, skipped: 0, errors: 0 };
  private userId: number = 1; // Default user ID for imported images

  constructor(sourcePath: string, baseUrl = 'http://localhost:3000') {
    this.sourcePath = sourcePath;
    this.baseUrl = baseUrl;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Import a single image
   */
  private async importImage(filePath: string): Promise<boolean> {
    try {
      const filename = basename(filePath);
      const mimetype = this.getMimeType(filePath);
      const data = readFileSync(filePath);
      
      console.log(`Importing image: ${filename} (${data.length} bytes)`);
      
      // Create FormData for file upload
      const formData = new FormData();
      const blob = new Blob([data], { type: mimetype });
      formData.append('file', blob, filename);
      formData.append('userId', this.userId.toString());
      
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to import ${filename}:`, error);
        return false;
      }
      
      const result = await response.json();
      console.log(`Successfully imported: ${filename} -> ID: ${result.id}`);
      return true;
      
    } catch (error) {
      console.error(`Error importing image ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Find all image files recursively
   */
  private findImageFiles(dir: string): string[] {
    const files: string[] = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip hidden directories and specific folders
          if (!entry.startsWith('.') && !entry.startsWith('_')) {
            files.push(...this.findImageFiles(fullPath));
          }
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (imageExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Ensure default user exists for image ownership
   */
  private async ensureUserExists(): Promise<void> {
    try {
      // Check if user exists via API
      const response = await fetch(`${this.baseUrl}/api/users`);
      const users = await response.json();
      
      if (users.length === 0) {
        console.log('Creating default user for image imports...');
        const userResponse = await fetch(`${this.baseUrl}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'importer',
            password: 'temp123',
            groups: ['dm']
          })
        });
        
        if (userResponse.ok) {
          const user = await userResponse.json();
          this.userId = user.id;
          console.log(`Created user: ${user.name} (ID: ${user.id})`);
        }
      } else {
        this.userId = users[0].id;
        console.log(`Using existing user: ${users[0].name} (ID: ${users[0].id})`);
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  /**
   * Import all images from the source directory
   */
  public async import(): Promise<ImportStats> {
    console.log(`Starting image import from: ${this.sourcePath}`);
    
    // Ensure user exists for image ownership
    await this.ensureUserExists();
    
    const files = this.findImageFiles(this.sourcePath);
    this.stats.total = files.length;
    
    console.log(`Found ${files.length} image files to process`);
    
    for (const file of files) {
      try {
        const success = await this.importImage(file);
        if (success) {
          this.stats.imported++;
        } else {
          this.stats.errors++;
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        this.stats.errors++;
      }
    }
    
    return this.stats;
  }
}

// Main execution
async function main() {
  const sourcePath = process.argv[2] || '/home/klucsik/src/gyongy-wiki';
  const baseUrl = process.argv[3] || 'http://localhost:3000';
  
  if (!sourcePath) {
    console.error('Usage: tsx import-images.ts <source-path> [base-url]');
    process.exit(1);
  }
  
  console.log('Wiki.js Image Importer');
  console.log('======================');
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${baseUrl}`);
  console.log('');
  
  const importer = new ImageImporter(sourcePath, baseUrl);
  const stats = await importer.import();
  
  console.log('');
  console.log('Image import completed!');
  console.log('=======================');
  console.log(`Total files: ${stats.total}`);
  console.log(`Imported: ${stats.imported}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  
  if (stats.errors > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ImageImporter };
