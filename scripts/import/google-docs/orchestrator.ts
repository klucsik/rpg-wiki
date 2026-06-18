import { prisma } from '../../../../src/src/lib/db/db';
import { parseMarkdown, parseHtml } from './parser';
import { GoogleDocsImageImporter } from './image-importer';
import * as cheerio from 'cheerio';
import AdmZip from 'adm-zip';
import { join, extname, dirname } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import type { GoogleDocsImageReference, GoogleDocsPage, PageVisibility } from './types';
import type { ImageImportResult } from './image-importer';
import { GoogleDocsParsedResult } from './types';

export interface OrchestratorOptions {
  importPath: string;
  dryRun?: boolean;
}

// ── shared slug normalization (mirrors parser.ts logic for consistency) ──

export class GoogleDocsOrchestrator {
  private extractionDir: string;

  constructor(private filePath: string) {
    this.extractionDir = join('/tmp', `gdoc-import-${Date.now()}`);
  }

  // ── helpers for group resolution, path collision detection & fallbacks ─────────────

  /** Resolve edit_groups / view_groups when not explicitly set by LLM/frontmatter. */
  private async resolvePageGroups(page: GoogleDocsPage): Promise<{ title: string; content: string; path: string; edit_groups: string[]; view_groups: string[] }> {
    // Normalize optional arrays so downstream logic is safe.
    if (!page.edit_groups) page.edit_groups = [];
    if (!page.view_groups)  page.view_groups  = [];

    const visibility: PageVisibility | undefined = (page.visibility as PageVisibility | undefined);
    const importerUser = await this.resolveImporterUsername();

    switch (visibility || 'owner') {
      case 'public':
        return { ...page, edit_groups: ['admin'], view_groups: ['public'] };

      default:
        // owner — or any future enum value. Default to the importing user.
        if (!page.edit_groups.length && !page.view_groups.length) {
          return { ...page, edit_groups: [importerUser], view_groups: [importerUser] };
        }
    }

    // Partial override — at least ensure owner can always view.
    const vis = visibility || 'owner';
    if (vis === 'public' || vis === 'owner') {
      if (!page.view_groups.length) page.view_groups.push(importerUser);
      if (!page.edit_groups.length)  page.edit_groups.push('admin');   // safe fallback.
    }

    return { title: page.title, content: page.content, path: page.path,
             edit_groups: page.edit_groups ?? [], view_groups: page.view_groups ?? [] };
  }

  /** Resolve the importing user as a string identifier for group membership. */
  private async resolveImporterUsername(): Promise<string> {
    try {
      const firstUser = await prisma.user.findFirst({ select: { id: true, name: true, username: true } });
      if (firstUser) return String(firstUser.username ?? firstUser.name ?? `user-${firstUser.id}`);
    } catch {}
    // Deterministic fallback so page creation never fails even without a real user.
    return 'importer';   
  }

  /** Ensures a path is unique among existing pages — appends -1, -2 … on collision. */
  private async ensureUniquePath(proposed: string): Promise<string> {
    if (!proposed || !proposed.trim()) return '';   // defer to empty-path fallback.

    const candidate = proposed.replace(/\/\/+/, '/').replace(/^\//, '').trim();
    if (!/[a-z0-9]/.test(candidate)) return '';  // already invalid — caller will generate a slug.

    let uniqueCandidate = candidate;

    try {
      const existing = await prisma.page.findMany({ select: { path: true } });
      const usedPaths = new Set(existing.map(p => p.path));

      if (!usedPaths.has(uniqueCandidate)) return uniqueCandidate;   // no collision.

      for (let counter = 1; counter < 50; counter++) {
        const suffixed = `${candidate}-${counter}`;
        if (!usedPaths.has(suffixed) && /[a-z0-9]/.test(suffixed)) return suffixed;
      }
    } catch { /* DB unavailable during dry-run or test — fall through to slug fallback */ }

    // Safety: couldn't check uniqueness; caller will generate a fresh slug.
    console.warn(`Collision detection failed for "${proposed}" — generating new path.`);
    return '';
  }

  /** Generate a unique fallback when no heading structure provides a path. */
  private async generateFallbackPath(title: string): Promise<string> {
    const slug = GoogleDocsOrchestrator.slugifyTitle(title) || 'untitled';
    let candidate = `${slug}-${Date.now().toString(36)}`;

    return await this.ensureUniquePath(candidate);
  }

  /** Normalize a title into a lowercase-slug string (same rules as parser.ts). */
  static slugifyTitle(text: string): string {
    return text.toString()
      .toLowerCase().trim()
      .replace(/\s+/g, '-')                // spaces → hyphens
      .replace(/[^a-z0-9\-]+/g, '')       // remove chars not in a-z / 0-9 or hyphen
      .replace(/-+/g, '-');             // normalize: collapse consecutive hyphens

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
    for (const raw of pages) {
      // ── Task #1: resolve visibility → edit_groups / view_groups.
      const resolved = await this.resolvePageGroups(raw);

      let finalPath = resolved.path?.trim() ?? '';

      if (!finalPath || !/[a-z0-9]/.test(finalPath)) {
        // ── Task #3: empty-path fallback from slugified title + timestamp.
        console.warn(`Empty path for page "${raw.title}" — generating fallback.`);
        finalPath = await this.generateFallbackPath(raw.title);
      } else {
        // ── Task #2: ensure uniqueness (collision detection + suffix resolution).
        const uniqueCandidate = await this.ensureUniquePath(resolved.path);
        if (!uniqueCandidate || !/[a-z0-9]/.test(uniqueCandidate)) {
          console.warn(`Collision or invalid path for "${raw.title}" — generating fallback.`);
          finalPath = await this.generateFallbackPath(raw.title);   // double-fallback safety net.
        } else {
          finalPath = uniqueCandidate;
        }
      }

      if (!finalPath) throw new Error(`Failed to resolve a valid path for page "${raw.title}" after all fallbacks.`);

      console.log(`Creating page: ${resolved.title} at ${finalPath}`);
      console.log(`Content to save: ${resolved.content.substring(0, 100)}...`);

      await prisma.page.create({
        data: {
          title:       resolved.title,
          content:     resolved.content,
          path:       finalPath,
          edit_groups: resolved.edit_groups,
          view_groups: resolved.view_groups,
        }
      });
    }
  }

  private cleanup() {
    if (existsSync(this.extractionDir)) {
      rmSync(this.extractionDir, { recursive: true, force: true });
    }
  }

  private async ensureUserExists(): Promise<boolean> {
    // Task #5 (low-priority): actionable guard when no users exist in DB.
    try {
      const user = await prisma.user.findFirst({ select: { id: true } });
      return !!user;
    } catch {
      console.warn('User check skipped — database may not be ready yet.');
      return false;   // let downstream code fail with its own error.
    }
  }

  async run(options: OrchestratorOptions): Promise<void> {
    try {
      console.log(`Starting import for: ${this.filePath}`);

      if (!await this.ensureUserExists()) {
        throw new Error(
          'No users found in database — cannot import Google Docs.\n' +
          'Seed a user first (create an account or run the seeding script).'
        );
      }

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
