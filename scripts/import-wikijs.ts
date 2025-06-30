#!/usr/bin/env tsx

/**
 * Wiki.js Page Import Script
 * 
 * Imports wiki pages from various formats (HTML, Markdown, AsciiDoc) with:
 * - Proper title extraction from content headers
 * - AsciiDoc to HTML conversion with list/header/image support
 * - Hierarchical path generation
 * - Tag-based viewer group mapping
 * - Option to skip or update existing pages
 * 
 * Usage:
 *   npx tsx scripts/import-wikijs.ts <source-path> [base-url] [options]
 * 
 * Options:
 *   --skip-existing     Skip pages that already exist (default)
 *   --update-existing   Update existing pages instead of skipping
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { prisma } from '../src/db';

interface WikiJsPage {
  title: string;
  description?: string;
  published: boolean;
  date: string;
  tags: string[];
  editor: string;
  dateCreated: string;
  content: string;
  filePath: string;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
}

interface ImportOptions {
  skipExisting: boolean;
  updateExisting: boolean;
}

class WikiJsImporter {
  private sourcePath: string;
  private baseUrl: string;
  private stats: ImportStats = { total: 0, imported: 0, skipped: 0, updated: 0, errors: 0 };
  private options: ImportOptions;

  constructor(sourcePath: string, baseUrl = 'http://localhost:3000', options: Partial<ImportOptions> = {}) {
    this.sourcePath = sourcePath;
    this.baseUrl = baseUrl;
    this.options = {
      skipExisting: options.skipExisting ?? true,
      updateExisting: options.updateExisting ?? false,
      ...options
    };
  }

  /**
   * Parse Wiki.js metadata from HTML comment or YAML frontmatter
   */
  private parseMetadata(content: string, filePath: string): WikiJsPage | null {
    try {
      const ext = extname(filePath).toLowerCase();
      
      if (ext === '.adoc') {
        // AsciiDoc files don't have metadata, create default
        const title = this.generateTitleFromPath(filePath);
        return {
          title,
          description: '',
          published: true,
          date: new Date().toISOString(),
          tags: [],
          editor: 'asciidoc',
          dateCreated: new Date().toISOString(),
          content: content,
          filePath
        };
      }
      
      if (content.startsWith('<!--\n')) {
        // HTML comment format
        const endComment = content.indexOf('-->');
        if (endComment === -1) return null;
        
        const metadataStr = content.substring(4, endComment);
        const metadata: any = {};
        
        for (const line of metadataStr.split('\n')) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            if (key === 'tags') {
              metadata[key] = value ? value.split(',').map(t => t.trim()).filter(t => t) : [];
            } else if (key === 'published') {
              metadata[key] = value === 'true';
            } else {
              metadata[key] = value;
            }
          }
        }
        
        const htmlContent = content.substring(endComment + 3).trim();
        
        return {
          title: metadata.title || this.generateTitleFromPath(filePath),
          description: metadata.description || '',
          published: metadata.published || true,
          date: metadata.date || new Date().toISOString(),
          tags: metadata.tags || [],
          editor: metadata.editor || 'unknown',
          dateCreated: metadata.dateCreated || metadata.date || new Date().toISOString(),
          content: htmlContent,
          filePath
        };
      } else if (content.startsWith('---\n')) {
        // YAML frontmatter format
        const endFrontmatter = content.indexOf('\n---\n', 4);
        if (endFrontmatter === -1) return null;
        
        const frontmatterStr = content.substring(4, endFrontmatter);
        const metadata: any = {};
        
        for (const line of frontmatterStr.split('\n')) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            if (key === 'tags') {
              metadata[key] = value ? value.split(',').map(t => t.trim()).filter(t => t) : [];
            } else if (key === 'published') {
              metadata[key] = value === 'true';
            } else {
              metadata[key] = value;
            }
          }
        }
        
        const markdownContent = content.substring(endFrontmatter + 5).trim();
        
        return {
          title: metadata.title || this.generateTitleFromPath(filePath),
          description: metadata.description || '',
          published: metadata.published || true,
          date: metadata.date || new Date().toISOString(),
          tags: metadata.tags || [],
          editor: metadata.editor || 'unknown',
          dateCreated: metadata.dateCreated || metadata.date || new Date().toISOString(),
          content: markdownContent,
          filePath
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error parsing metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract title from AsciiDoc content
   */
  private extractTitleFromAsciiDocContent(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for level 1 (= title) or level 2 (== title) headers
      if (trimmed.startsWith('= ') && trimmed.length > 2) {
        return trimmed.substring(2).trim();
      }
      if (trimmed.startsWith('== ') && trimmed.length > 3) {
        return trimmed.substring(3).trim();
      }
    }
    return null;
  }

  /**
   * Generate title from file path
   */
  private generateTitleFromPath(filePath: string): string {
    const relativePath = relative(this.sourcePath, filePath);
    let name = relativePath.replace(/\.(html|md|adoc)$/i, '');
    
    // For AsciiDoc files, try to extract title from content first
    if (filePath.toLowerCase().endsWith('.adoc')) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const extractedTitle = this.extractTitleFromAsciiDocContent(content);
        if (extractedTitle) {
          return extractedTitle;
        }
      } catch (error) {
        console.warn(`Could not read AsciiDoc file ${filePath}:`, error);
      }
      
      // Fallback to filename processing
      name = name.split('/').pop() || name;
      name = name.replace(/\.adoc$/i, '');
      
      // Clean up filename properly for Hungarian text
      name = name.replace(/[-_]/g, ' ');
      
      // Convert to proper case: first letter of each word capitalized
      name = name.replace(/\b\w/g, l => l.toUpperCase());
      
    } else {
      // For HTML/MD files, use the original logic
      name = name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return name.trim();
  }

  /**
   * Generate hierarchical path for the wiki
   */
  private generateWikiPath(filePath: string): string {
    const relativePath = relative(this.sourcePath, filePath);
    const dir = dirname(relativePath);
    let name = relativePath.replace(/\.(html|md|adoc)$/i, '');
    
    // Handle special cases
    if (name === 'home') return '/';
    
    // For AsciiDoc files, clean up the path properly
    if (filePath.toLowerCase().endsWith('.adoc')) {
      // Convert the mixed case directory names properly
      name = name.replace(/([a-záéíóöőúüű])([A-ZÁÉÍÓÖŐÚÜŰ])/g, '$1-$2');
      name = name.replace(/\s+/g, '-');
    }
    
    // Convert file path to wiki path
    let wikiPath = '/' + name.replace(/\\/g, '/');
    
    // Clean up path: normalize separators and convert to lowercase
    wikiPath = wikiPath.replace(/\/+/g, '/');
    wikiPath = wikiPath.replace(/[^a-zA-Z0-9\-_\/áéíóöőúüű]/g, '-');
    wikiPath = wikiPath.toLowerCase();
    
    // Clean up multiple dashes
    wikiPath = wikiPath.replace(/-+/g, '-');
    wikiPath = wikiPath.replace(/\/-+/g, '/');
    wikiPath = wikiPath.replace(/-+\//g, '/');
    
    return wikiPath;
  }

  /**
   * Map Wiki.js tags to viewer groups
   */
  private mapTagsToViewerGroups(tags: string[]): string[] {
    if (tags.includes('dmonly')) {
      return ['dm'];
    }
    
    return ['public'];
  }

  /**
   * Convert CKEditor HTML content to TipTap-compatible format
   */
  private convertContent(content: string, editor: string): string {
    if (editor === 'markdown') {
      // For markdown content, we can keep it as-is or convert to HTML
      // TipTap can handle basic markdown-like HTML
      return content;
    }
    
    if (editor === 'asciidoc') {
      // Convert AsciiDoc to HTML for TipTap
      return this.convertAsciiDocToHtml(content);
    }
    
    // For CKEditor HTML, we need to clean it up for TipTap
    let converted = content;
    
    // Convert Wiki.js image references
    converted = converted.replace(/src="\/([^"]+)"/g, (match, imagePath) => {
      // Update image paths to point to the new upload system
      return `src="/api/images/${imagePath}"`;
    });
    
    // Clean up CKEditor-specific classes and attributes
    converted = converted.replace(/class="[^"]*"/g, '');
    converted = converted.replace(/style="[^"]*"/g, '');
    
    return converted;
  }

  /**
   * Convert basic AsciiDoc to HTML
   */
  private convertAsciiDocToHtml(content: string): string {
    const lines = content.split('\n');
    const htmlLines: string[] = [];
    let inUnorderedList = false;
    let inOrderedList = false;
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          htmlLines.push(`<p>${paragraphText}</p>`);
        }
        currentParagraph = [];
      }
    };
    
    const closeList = () => {
      if (inUnorderedList) {
        htmlLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        htmlLines.push('</ol>');
        inOrderedList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines (they will be handled by paragraph logic)
      if (!trimmed) {
        // Empty line might end a paragraph
        flushParagraph();
        continue;
      }
      
      // Headers
      if (trimmed.startsWith('= ')) {
        flushParagraph();
        closeList();
        htmlLines.push(`<h1>${trimmed.substring(2)}</h1>`);
        continue;
      }
      if (trimmed.startsWith('== ')) {
        flushParagraph();
        closeList();
        htmlLines.push(`<h2>${trimmed.substring(3)}</h2>`);
        continue;
      }
      if (trimmed.startsWith('=== ')) {
        flushParagraph();
        closeList();
        htmlLines.push(`<h3>${trimmed.substring(4)}</h3>`);
        continue;
      }
      if (trimmed.startsWith('==== ')) {
        flushParagraph();
        closeList();
        htmlLines.push(`<h4>${trimmed.substring(5)}</h4>`);
        continue;
      }
      
      // Images: image::/path/file.jpg[alt] or image::file.jpg[alt]
      if (trimmed.match(/^image::([^[\]]+)\[([^\]]*)\]/)) {
        flushParagraph();
        closeList();
        const imageMatch = trimmed.match(/^image::([^[\]]+)\[([^\]]*)\]/);
        if (imageMatch) {
          const imagePath = imageMatch[1];
          const alt = imageMatch[2] || '';
          htmlLines.push(`<figure class="image"><img src="/api/images/${imagePath}" alt="${alt}"></figure>`);
        }
        continue;
      }
      
      // Unordered lists: * item or - item
      if (trimmed.match(/^[*-] /)) {
        flushParagraph();
        if (inOrderedList) {
          htmlLines.push('</ol>');
          inOrderedList = false;
        }
        if (!inUnorderedList) {
          htmlLines.push('<ul>');
          inUnorderedList = true;
        }
        htmlLines.push(`<li>${trimmed.substring(2)}</li>`);
        continue;
      }
      
      // Ordered lists: . item or 1. item, 2. item, etc.
      if (trimmed.match(/^(\d+\.|\.) /)) {
        flushParagraph();
        if (inUnorderedList) {
          htmlLines.push('</ul>');
          inUnorderedList = false;
        }
        if (!inOrderedList) {
          htmlLines.push('<ol>');
          inOrderedList = true;
        }
        const listItemText = trimmed.replace(/^(\d+\.|\.) /, '');
        htmlLines.push(`<li>${listItemText}</li>`);
        continue;
      }
      
      // Bold text: *text* or **text**
      let processedLine = trimmed;
      processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
      
      // Italic text: _text_ or __text__
      processedLine = processedLine.replace(/__([^_]+)__/g, '<em>$1</em>');
      processedLine = processedLine.replace(/_([^_]+)_/g, '<em>$1</em>');
      
      // Code: `text`
      processedLine = processedLine.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // If we're not in a list and this isn't a header/image, treat as paragraph content
      if (!inUnorderedList && !inOrderedList) {
        currentParagraph.push(processedLine);
      } else {
        // If we're in a list but encounter non-list content, close the list first
        flushParagraph();
        closeList();
        currentParagraph.push(processedLine);
      }
    }
    
    // Flush any remaining paragraph and close any open lists
    flushParagraph();
    closeList();
    
    return htmlLines.join('\n');
  }

  /**
   * Ensure required groups exist
   */
  private async ensureGroupsExist(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/groups`);
      const existingGroups = await response.json();
      const existingGroupNames = existingGroups.map((g: any) => g.name);
      
      const requiredGroups = ['dm', 'public'];
      
      for (const groupName of requiredGroups) {
        if (!existingGroupNames.includes(groupName)) {
          console.log(`Creating group: ${groupName}`);
          await fetch(`${this.baseUrl}/api/groups`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ name: groupName })
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring groups exist:', error);
    }
  }

  /**
   * Check if a page already exists at the given path
   */
  private async pageExists(path: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pages`);
      if (!response.ok) return false;
      
      const pages = await response.json();
      return pages.some((page: any) => page.path === path);
    } catch (error) {
      console.error('Error checking if page exists:', error);
      return false;
    }
  }

  /**
   * Update an existing page
   */
  private async updatePage(page: WikiJsPage, wikiPath: string): Promise<boolean> {
    try {
      const viewerGroups = this.mapTagsToViewerGroups(page.tags);
      const content = this.convertContent(page.content, page.editor);
      
      const pageData = {
        title: page.title,
        content: content,
        path: wikiPath,
        edit_groups: ['dm'],
        view_groups: viewerGroups
      };
      
      // First, find the existing page by path to get its ID
      const existingPageResponse = await fetch(`${this.baseUrl}/api/pages`);
      if (!existingPageResponse.ok) {
        console.error(`Failed to fetch pages list: ${existingPageResponse.status}`);
        return false;
      }
      
      const existingPages = await existingPageResponse.json();
      const existingPage = existingPages.find((p: any) => p.path === wikiPath);
      
      if (!existingPage) {
        console.error(`Could not find existing page with path: ${wikiPath}`);
        return false;
      }
      
      // Update the page using the PUT endpoint
      const response = await fetch(`${this.baseUrl}/api/pages/${existingPage.id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(pageData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update page ${page.title}: ${response.status} ${errorText}`);
        return false;
      }
      
      console.log(`✓ Updated: ${page.title} -> ${wikiPath}`);
      return true;
      
    } catch (error) {
      console.error(`Error updating page ${page.title}:`, error);
      return false;
    }
  }

  /**
   * Import a single page
   */
  private async importPage(page: WikiJsPage): Promise<boolean> {
    try {
      const wikiPath = this.generateWikiPath(page.filePath);
      const exists = await this.pageExists(wikiPath);
      
      if (exists) {
        if (this.options.skipExisting) {
          console.log(`Skipping existing page: ${page.title} -> ${wikiPath}`);
          this.stats.skipped++;
          return true; // Not an error, just skipped
        } else if (this.options.updateExisting) {
          console.log(`Updating existing page: ${page.title} -> ${wikiPath}`);
          const success = await this.updatePage(page, wikiPath);
          if (success) {
            this.stats.updated++;
            return true;
          } else {
            console.log(`Update not supported yet, skipping: ${page.title}`);
            this.stats.skipped++;
            return true;
          }
        }
      }
      
      const viewerGroups = this.mapTagsToViewerGroups(page.tags);
      const content = this.convertContent(page.content, page.editor);
      
      const pageData = {
        title: page.title,
        content: content,
        path: wikiPath,
        edit_groups: ['dm'],
        view_groups: viewerGroups
      };
      
      console.log(`Importing: ${page.title} -> ${wikiPath}`);
      
      const response = await fetch(`${this.baseUrl}/api/pages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(pageData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        if (error.includes('Unique constraint') || error.includes('already exists')) {
          console.log(`Page already exists: ${page.title} -> ${wikiPath}`);
          this.stats.skipped++;
          return true; // Not an error, just already exists
        }
        console.error(`Failed to import ${page.title} (${response.status}):`, error);
        return false;
      }
      
      this.stats.imported++;
      return true;
    } catch (error) {
      console.error(`Error importing page ${page.title}:`, error);
      return false;
    }
  }

  /**
   * Find all HTML and MD files recursively
   */
  private findFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip hidden directories and specific folders
          if (!entry.startsWith('.') && !entry.startsWith('_')) {
            files.push(...this.findFiles(fullPath));
          }
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (ext === '.html' || ext === '.md' || ext === '.adoc') {
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
   * Import all Wiki.js files
   */
  public async import(): Promise<ImportStats> {
    console.log(`Starting Wiki.js import from: ${this.sourcePath}`);
    
    // Ensure required groups exist
    await this.ensureGroupsExist();
    
    const files = this.findFiles(this.sourcePath);
    this.stats.total = files.length;
    
    console.log(`Found ${files.length} files to process`);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const page = this.parseMetadata(content, file);
        
        if (!page) {
          console.log(`Skipping ${file}: Could not parse metadata`);
          this.stats.skipped++;
          continue;
        }
        
        if (!page.published) {
          console.log(`Skipping ${file}: Not published`);
          this.stats.skipped++;
          continue;
        }
        
        const success = await this.importPage(page);
        if (success) {
          this.stats.imported++;
        } else {
          this.stats.errors++;
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        this.stats.errors++;
      }
    }
    
    return this.stats;
  }

  /**
   * Get headers for API requests with authentication
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided via environment variable
    const apiKey = process.env.IMPORT_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Parse flags
  const skipExisting = args.includes('--skip-existing') || args.includes('-s');
  const updateExisting = args.includes('--update-existing') || args.includes('-u');
  
  // Filter out flags to get positional arguments
  const positionalArgs = args.filter(arg => 
    !arg.startsWith('--') && !arg.startsWith('-')
  );
  
  const sourcePath = positionalArgs[0] || '/home/klucsik/src/gyongy-wiki';
  const baseUrl = positionalArgs[1] || 'http://localhost:3000';
  
  if (!sourcePath) {
    console.error('Usage: tsx import-wikijs.ts <source-path> [base-url] [options]');
    console.error('');
    console.error('Arguments:');
    console.error('  source-path  Path to Wiki.js export directory');
    console.error('  base-url     Base URL of the API (default: http://localhost:3000)');
    console.error('');
    console.error('Options:');
    console.error('  --skip-existing, -s   Skip pages that already exist (default)');
    console.error('  --update-existing, -u Update pages that already exist');
    console.error('');
    console.error('Examples:');
    console.error('  tsx import-wikijs.ts /path/to/wiki');
    console.error('  tsx import-wikijs.ts /path/to/wiki http://localhost:3000 --skip-existing');
    console.error('  tsx import-wikijs.ts /path/to/wiki --update-existing');
    process.exit(1);
  }
  
  console.log('Wiki.js Importer');
  console.log('================');
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Skip existing: ${skipExisting}`);
  console.log(`Update existing: ${updateExisting}`);
  console.log('');
  
  const importer = new WikiJsImporter(sourcePath, baseUrl, {
    skipExisting,
    updateExisting
  });
  const stats = await importer.import();
  
  console.log('');
  console.log('Import completed!');
  console.log('=================');
  console.log(`Total files: ${stats.total}`);
  console.log(`Imported: ${stats.imported}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  
  if (stats.errors > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { WikiJsImporter };
