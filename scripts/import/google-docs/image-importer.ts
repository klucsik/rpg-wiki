import { prisma } from '../../../../src/src/lib/db/db';
import { GoogleDocsImageReference } from './types';
import { join, isAbsolute, resolve, dirname, basename } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface ImageImportResult {
  newUrl: string;
  mediaId: string;
}

export class GoogleDocsImageImporter {
  constructor(private extractionDir: string) {}

  async importImages(images: GoogleDocsImageReference[]): Promise<Map<string, ImageImportResult>> {
    const results = new Map<string, ImageImportResult>();

    for (const img of images) {
      if (img.type === 'remote') {
        // For remote images, we might want to download them.
        // For now, let's skip or just note them.
        continue;
      }

      // Local image
      const localPath = this.resolveLocalPath(img.originalSrc);
      if (existsSync(localPath)) {
        const result = await this.uploadImage(localPath, img.originalSrc);
        results.set(img.originalSrc, result);
      }
    }

    return results;
  }

  private resolveLocalPath(originalSrc: string): string {
    if (isAbsolute(originalSrc)) {
      return originalSrc;
    }
    // Assuming originalSrc is relative to the extracted directory
    return resolve(this.extractionDir, originalSrc);
  }

  private async uploadImage(filePath: string, originalSrc: string): Promise<ImageImportResult> {
    const filename = basename(filePath);
    const imageData = readFileSync(filePath);
    
    // In a real app, we'd determine mimetype from extension or file content
    const mimetype = this.getMimeType(filePath);

    // We need a userId. For now, let's find the first user or use a dummy.
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No user found to associate with imported media.');
    }

    const media = await prisma.media.create({
      data: {
        filename,
        mimetype,
        data: imageData,
        userId: user.id,
      }
    });

    // The new URL will be something like /api/images/[id]
    // But we need to know how the wiki serves images.
    // Based on the summary, it might be /api/images/[id]
    const newUrl = `/api/images/${media.id}`;

    return {
      newUrl,
      mediaId: String(media.id)
    };
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }
}
