import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { prisma } from './db';

export interface GitBackupSettings {
  gitRepoUrl: string;
  sshKeyPath: string;
  backupPath: string;
  enabled: boolean;
}

export class GitBackupService {
  private static instance: GitBackupService;

  static getInstance(): GitBackupService {
    if (!GitBackupService.instance) {
      GitBackupService.instance = new GitBackupService();
    }
    return GitBackupService.instance;
  }

  async getSettings(): Promise<GitBackupSettings> {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['git_repo_url', 'ssh_key_path', 'backup_path', 'backup_enabled']
        }
      }
    });

    const settingsMap = settings.reduce((acc: Record<string, string | null>, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string | null>);

    return {
      gitRepoUrl: settingsMap.git_repo_url || '',
      sshKeyPath: settingsMap.ssh_key_path || '/app/.ssh/id_rsa',
      backupPath: settingsMap.backup_path || '/app/backup-data',
      enabled: settingsMap.backup_enabled === 'true'
    };
  }

  async updateSettings(settings: Partial<GitBackupSettings>): Promise<void> {
    const updates = [];

    if (settings.gitRepoUrl !== undefined) {
      updates.push({
        key: 'git_repo_url',
        value: settings.gitRepoUrl,
        encrypted: false
      });
    }

    if (settings.sshKeyPath !== undefined) {
      updates.push({
        key: 'ssh_key_path',
        value: settings.sshKeyPath,
        encrypted: false
      });
    }

    if (settings.backupPath !== undefined) {
      updates.push({
        key: 'backup_path',
        value: settings.backupPath,
        encrypted: false
      });
    }

    if (settings.enabled !== undefined) {
      updates.push({
        key: 'backup_enabled',
        value: settings.enabled.toString(),
        encrypted: false
      });
    }

    // Upsert each setting
    for (const update of updates) {
      await prisma.siteSetting.upsert({
        where: { key: update.key },
        update: { value: update.value, updatedAt: new Date() },
        create: update
      });
    }
  }

  async createBackupJob(triggeredBy: string, jobType: 'auto' | 'manual' = 'auto'): Promise<number> {
    const job = await prisma.backupJob.create({
      data: {
        status: 'pending',
        triggeredBy,
        jobType
      }
    });

    // Start the backup process asynchronously
    this.processBackup(job.id).catch(error => {
      console.error('Backup job failed:', error);
      this.updateJobStatus(job.id, 'failed', error.message);
    });

    return job.id;
  }

  private async processBackup(jobId: number): Promise<void> {
    try {
      await this.updateJobStatus(jobId, 'running');

      const settings = await this.getSettings();
      if (!settings.enabled) {
        throw new Error('Git backup is disabled');
      }

      if (!settings.gitRepoUrl) {
        throw new Error('Git repository URL not configured');
      }

      // Setup SSH key if provided
      if (settings.sshKeyPath) {
        await this.setupSSHKey(settings.sshKeyPath);
      }

      // Create backup directory if it doesn't exist
      await fs.mkdir(settings.backupPath, { recursive: true });

      // Determine the actual repo directory path
      let repoPath: string;
      
      // Clone or pull the repository
      const isExisting = await this.checkIfRepoExists(settings.backupPath);
      if (isExisting) {
        repoPath = settings.backupPath;
        await this.gitPull(repoPath, settings.sshKeyPath);
      } else {
        // Clone into the backup path and get the actual repo directory
        repoPath = await this.gitClone(settings.gitRepoUrl, settings.backupPath, settings.sshKeyPath);
      }

      // Export wiki data
      await this.exportWikiData(repoPath);

      // Create git commit
      const commitHash = await this.createGitCommit(repoPath, settings.sshKeyPath);

      // Push to remote
      await this.gitPush(repoPath, settings.sshKeyPath);

      await this.updateJobStatus(jobId, 'completed', undefined, commitHash, repoPath);
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async updateJobStatus(
    jobId: number, 
    status: string, 
    error?: string, 
    commitHash?: string, 
    exportPath?: string
  ): Promise<void> {
    await prisma.backupJob.update({
      where: { id: jobId },
      data: {
        status,
        error,
        commitHash,
        exportPath,
        completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
      }
    });
  }

  private async checkIfRepoExists(path: string): Promise<boolean> {
    try {
      await fs.access(join(path, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  private async setupSSHKey(sshKeyPath: string): Promise<void> {
    try {
      // Check if SSH key exists and is readable
      await fs.access(sshKeyPath);
      
      // Get file stats to check current permissions
      const stats = await fs.stat(sshKeyPath);
      const mode = stats.mode & parseInt('777', 8);
      
      console.log(`SSH key found at ${sshKeyPath} with permissions ${mode.toString(8)}`);
      
      // Just verify the key is at least readable by owner
      if (!(mode & 0o400)) {
        throw new Error(`SSH key has insufficient permissions (mode: ${mode.toString(8)}): ${sshKeyPath}`);
      }
    } catch (error) {
      throw new Error(`SSH key setup failed for ${sshKeyPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async execCommand(command: string, args: string[], cwd: string, sshKeyPath?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      
      if (sshKeyPath) {
        // Ensure the SSH key has proper permissions and setup
        env.GIT_SSH_COMMAND = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes`;
      }

      const child = spawn(command, args, { 
        cwd, 
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command '${command} ${args.join(' ')}' failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async gitClone(repoUrl: string, parentPath: string, sshKeyPath?: string): Promise<string> {
    // Extract repo name from URL to determine the actual clone directory
    const repoName = repoUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
    const targetPath = join(parentPath, repoName);
    
    // Clone the repository
    await this.execCommand('git', ['clone', repoUrl], parentPath, sshKeyPath);
    
    // Return the actual repository path
    return targetPath;
  }

  private async gitPull(repoPath: string, sshKeyPath?: string): Promise<void> {
    await this.execCommand('git', ['pull', 'origin', 'main'], repoPath, sshKeyPath);
  }

  private async gitPush(repoPath: string, sshKeyPath?: string): Promise<void> {
    await this.execCommand('git', ['push', 'origin', 'main'], repoPath, sshKeyPath);
  }

  private async exportWikiData(backupPath: string): Promise<void> {
    // Export functionality embedded directly to avoid path resolution issues in standalone builds
    const wikiDataPath = join(backupPath, 'wiki-data');
    
    // Ensure export directory exists
    await fs.mkdir(wikiDataPath, { recursive: true });
    
    console.log('Starting wiki data export...');
    
    // Export pages
    console.log('Exporting pages...');
    await this.exportPages(wikiDataPath);
    
    // Export images
    console.log('Exporting images...');
    await this.exportImages(wikiDataPath);
    
    // Create export manifest
    await this.createExportManifest(wikiDataPath);
    
    console.log('Wiki data export completed');
  }

  private async createGitCommit(repoPath: string, sshKeyPath?: string): Promise<string> {
    // Ensure we're working in the repository root, not a subdirectory
    const gitRepoRoot = repoPath;
    
    // Verify we're in a git repository
    try {
      await fs.access(join(gitRepoRoot, '.git'));
    } catch {
      throw new Error(`Not a git repository: ${gitRepoRoot}`);
    }
    
    // Configure git user if not set
    try {
      await this.execCommand('git', ['config', 'user.name'], gitRepoRoot, sshKeyPath);
    } catch {
      await this.execCommand('git', ['config', 'user.name', 'RPG Wiki Backup'], gitRepoRoot, sshKeyPath);
      await this.execCommand('git', ['config', 'user.email', 'backup@rpg-wiki.local'], gitRepoRoot, sshKeyPath);
    }

    // Add all changes (from the repository root)
    await this.execCommand('git', ['add', '.'], gitRepoRoot, sshKeyPath);

    // Check if there are changes to commit
    try {
      await this.execCommand('git', ['diff', '--cached', '--exit-code'], gitRepoRoot, sshKeyPath);
      // No changes
      return 'no-changes';
    } catch {
      // There are changes, commit them
      const timestamp = new Date().toISOString();
      await this.execCommand('git', ['commit', '-m', `Automated backup: ${timestamp}`], gitRepoRoot, sshKeyPath);
      
      // Get the commit hash
      const commitHash = await this.execCommand('git', ['rev-parse', 'HEAD'], gitRepoRoot, sshKeyPath);
      return commitHash.trim();
    }
  }

  async getRecentBackupJobs(limit: number = 10): Promise<any[]> {
    return prisma.backupJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit
    });
  }

  async triggerManualBackup(userId: string): Promise<number> {
    return this.createBackupJob(userId, 'manual');
  }

  async testGitConnection(settings: GitBackupSettings): Promise<{ success: boolean; message: string }> {
    try {
      // Setup SSH key if provided
      if (settings.sshKeyPath) {
        await this.setupSSHKey(settings.sshKeyPath);
      }

      // Create a temporary directory for testing
      const testPath = join(settings.backupPath, 'test-connection');
      await fs.mkdir(testPath, { recursive: true });

      try {
        // Try to clone the repository
        const repoPath = await this.gitClone(settings.gitRepoUrl, testPath, settings.sshKeyPath);
        
        // Clean up
        await fs.rm(testPath, { recursive: true, force: true });
        
        return { success: true, message: 'Git connection successful' };
      } catch (error) {
        // Clean up on error
        await fs.rm(testPath, { recursive: true, force: true }).catch(() => {});
        
        return { 
          success: false, 
          message: `Git connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace characters that are problematic in filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private createMetadataHeader(page: any, version?: any): string {
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

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async exportPages(exportPath: string): Promise<number> {
    const pages = await prisma.page.findMany();
    let exported = 0;

    for (const page of pages) {
      try {
        // Determine export directory based on page path
        const pathParts = page.path.split('/').filter(Boolean);
        const pageDir = pathParts.length > 1 
          ? join(exportPath, ...pathParts.slice(0, -1))
          : exportPath;
        
        // Sanitize the filename
        const filename = this.sanitizeFilename(page.title) + '.html';
        const filePath = join(pageDir, filename);

        await this.ensureDirectoryExists(filePath);

        // Export latest version
        const content = this.createMetadataHeader(page) + page.content;
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Exported: ${page.path} -> ${filePath}`);
        exported++;
      } catch (error) {
        console.error(`Error exporting page ${page.path}:`, error);
      }
    }

    return exported;
  }

  private async exportImages(exportPath: string): Promise<number> {
    const images = await prisma.image.findMany({
      include: {
        user: true
      }
    });

    let exported = 0;
    const imagesDir = join(exportPath, 'images');

    try {
      await fs.access(imagesDir);
    } catch {
      await fs.mkdir(imagesDir, { recursive: true });
    }

    for (const image of images) {
      try {
        const filePath = join(imagesDir, image.filename);
        
        // Write image data
        await fs.writeFile(filePath, image.data);
        
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
        
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log(`Exported image: ${image.filename}`);
        exported++;
      } catch (error) {
        console.error(`Error exporting image ${image.filename}:`, error);
      }
    }

    return exported;
  }

  private async createExportManifest(exportPath: string): Promise<void> {
    const manifest = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      structure: {
        pages: 'Organized by path hierarchy',
        images: 'All images in /images directory with .meta files'
      }
    };

    const manifestPath = join(exportPath, 'export-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Export manifest created: ${manifestPath}`);
  }
}
