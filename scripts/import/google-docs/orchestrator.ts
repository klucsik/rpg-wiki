import { prisma } from '../../../../src/src/lib/db/db';
import { parseMarkdown, parseHtml } from './parser';
import { GoogleDocsImageImporter } from './image-importer';
import * as cheerio from 'cheerio';
import AdmZip from 'adm-zip';
import { join, basename, extname, dirname } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { GoogleDocsParsedResult } from './types';

export interface OrchestratorOptions {
  importPath: string;
  dryRun?: boolean;
}

export class GoogleDocsOrchestrator {
  private extractionDir: string;

  constructor(private filePath: string) {
    this.extractionDir = join('/tmp', `gdoc-import-${Date.now()}`);
  }

  private async prepareExtractionDir() {
    if (existsSync(this.extractionDir)) {
      rmSync(this.extractionDir, { recursive: true, force: true });
    }
    mkdirSync(this.extractionDir, { recursive: true });
  }

  private async extractFile() {
    const ext = extname(this.filePath).toLowerCase();
    if (ext === '.zip') {
      const zip = new AdmZip(this.filePath);
      zip.extractAllTo(this.extractionDir, true);
    } else {
      execSync(`cp "${this.filePath}" "${this.extractionDir}/import_file${ext}"`);
    }
  }

  private async parseFiles(): Promise<{ result: GoogleDocsParsedResult; baseDir: string }> {
    const ext = extname(this.filePath).toLowerCase();
    
    let contentToParse: string;
    let isMarkdown: boolean;
    let baseDir: string;

    if (ext === '.zip') {
      const files = this.findFirstDocFile(this.extractionDir);
      if (!files) throw new Error('No Markdown or HTML file found in the ZIP archive.');
      
      contentToParse = readFileSync(files, 'utf8');
      isMarkdown = extname(files).toLowerCase() === '.md';
      baseDir = dirname(files);
    } else {
      const targetFile = join(this.extractionDir, `import_file${ext}`);
      contentToParse = readFileSync(targetFile, 'utf8');
      isMarkdown = ext === '.md';
      baseDir = this.extractionDir;
    }

    let result;
    if (isMarkdown) {
      result = await parseMarkdown(contentToParse);
    } else {
      result = await parseHtml(contentToParse);
    }

    return { result, baseDir };
  }

  private findFirstDocFile(dir: string): string | undefined {
    const files = this.getAllFiles(dir);
    return files.find(f => f.endsWith('.md') || f.endsWith('.html'));
  }

  private getAllFiles(dir: string): string[] {
    let results: string[] = [];
    const list = readdirSync(dir);
    list.forEach(file => {
      file = join(dir, file);
      const stat = statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getAllFiles(file));
      } else {
        results.push(file);
      }
    });
    return results;
  }

  private async importImages(images: GoogleDocsImageReference[], baseDir: string): Promise<Map<string, ImageImportResult>> {
    const importer = new GoogleDocsImageImporter(baseDir);
    const results = await importer.importImages(images);
    console.log(`Imported ${results.size} images:`, Array.from(results.keys()));
    return results;
  }

  private applyImageReplacements(pages: GoogleDocsPage[], imageMap: Map<string, ImageImportResult>): GoogleDocsPage[] {
    console.log(`Applying replacements for ${imageMap.size} images...`);
    return pages.map(page => {
      const $ = cheerio.load(page.content, null, false);
      let replacedCount = 0;

      $('img').each((_, el) => {
        const $img = $(el);
        const src = $img.attr('src');
        if (src && imageMap.has(src)) {
          const result = imageMap.get(src)!;
          console.log(`Replacing image src "${src}" with "${result.newUrl}"`);
          $img.attr('src', result.newUrl);
          replacedCount++;
        }
      });

      const newContent = $.html();
      console.log(`Page "${page.title}" replacement count: ${replacedCount}`);
      console.log(`Final page content: ${newContent.substring(0, 200)}`);
      return { ...page, content: newContent };
    });
  }

  private async createWikiPages(pages: GoogleDocsPage[]): Promise<void> {
    for (const page of pages) {
      console.log(`Creating page: ${page.title} at ${page.path}`);
      console.log(`Content to save: ${page.content.substring(0, 100)}...`);
      await prisma.page.create({
        data: {
          title: page.title,
          content: page.content,
          path: page.path,
        }
      });
    }
  }

  private cleanup() {
    if (existsSync(this.extractionDir)) {
      rmSync(this.extractionDir, { recursive: true, force: true });
    }
  }

  async run(options: OrchestratorOptions): Promise<void> {
    try {
      console.log(`Starting import for: ${this.filePath}`);
      
      await this.prepareExtractionDir();
      await this.extractFile();

      const { result, baseDir } = await this.parseFiles();
      const imageMap = await this.importImages(result.images, baseDir);

      const finalPages = this.applyImageReplacements(result.pages, imageMap);

      if (options.dryRun) {
        console.log('DRY RUN: Would import the following pages:');
        finalPages.forEach(p => console.log(`- ${p.title} (path: ${p.path})`));
        console.log(`  Images to be imported: ${result.images.length}`);
      } else {
        await this.createWikiPages(finalPages);
        console.log('Import completed successfully!');
      }
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    } finally {
      this.cleanup();
    }
  }
}
