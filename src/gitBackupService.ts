import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { prisma } from './db';
import { createHash } from 'crypto';

export interface GitBackupSettings {
  gitRepoUrl: string;
  sshKeyPath: string;
  backupPath: string;
  branchName: string;
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
          in: ['git_repo_url', 'ssh_key_path', 'backup_path', 'backup_enabled', 'git_branch_name']
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
      branchName: settingsMap.git_branch_name || 'main',
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

    if (settings.branchName !== undefined) {
      updates.push({
        key: 'git_branch_name',
        value: settings.branchName,
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
      const repoName = settings.gitRepoUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
      const repoPath = join(settings.backupPath, repoName);
      
      // Clone or pull the repository
      const isExisting = await this.checkIfRepoExists(repoPath);
      if (isExisting) {
        await this.gitPull(repoPath, settings.branchName, settings.sshKeyPath);
      } else {
        // Remove any existing directory first
        try {
          await fs.rm(repoPath, { recursive: true, force: true });
        } catch (error) {
          // Ignore errors if directory doesn't exist
        }
        
        // Clone into the backup path and get the actual repo directory
        await this.gitClone(settings.gitRepoUrl, settings.backupPath, settings.branchName, settings.sshKeyPath);
      }

      // Export wiki data
      await this.exportWikiData(repoPath);

      // Create git commit
      const commitHash = await this.createGitCommit(repoPath, settings.sshKeyPath);

      // Push to remote
      await this.gitPush(repoPath, settings.branchName, settings.sshKeyPath);

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

  private async gitClone(repoUrl: string, parentPath: string, branchName: string, sshKeyPath?: string): Promise<string> {
    // Extract repo name from URL to determine the actual clone directory
    const repoName = repoUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
    const targetPath = join(parentPath, repoName);
    
    // Clone the repository
    await this.execCommand('git', ['clone', repoUrl], parentPath, sshKeyPath);
    
    // Handle branch checkout after cloning
    if (branchName !== 'main' && branchName !== 'master') {
      try {
        // First, fetch all remote branches
        await this.execCommand('git', ['fetch', 'origin'], targetPath, sshKeyPath);
        
        // Try to checkout existing remote branch
        try {
          await this.execCommand('git', ['checkout', '-b', branchName, `origin/${branchName}`], targetPath, sshKeyPath);
          console.log(`Checked out existing remote branch: ${branchName}`);
        } catch (error) {
          // If remote branch doesn't exist, create new local branch
          await this.execCommand('git', ['checkout', '-b', branchName], targetPath, sshKeyPath);
          console.log(`Created new local branch: ${branchName}`);
        }
      } catch (error) {
        console.error(`Failed to setup branch ${branchName}:`, error);
        // Continue with default branch if branch setup fails
      }
    } else {
      // For main/master, ensure we're on the correct branch
      try {
        // Check if HEAD exists (repository has commits)
        await this.execCommand('git', ['rev-parse', '--verify', 'HEAD'], targetPath, sshKeyPath);
        
        // HEAD exists, check current branch
        const currentBranch = await this.execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], targetPath, sshKeyPath);
        if (currentBranch.trim() !== branchName) {
          await this.execCommand('git', ['checkout', branchName], targetPath, sshKeyPath);
        }
      } catch (error) {
        // HEAD doesn't exist (empty repository) or other error
        console.log(`Repository appears to be empty or HEAD doesn't exist, will create ${branchName} branch on first commit`);
        
        // Try to create the branch if it doesn't exist
        try {
          await this.execCommand('git', ['checkout', '-b', branchName], targetPath, sshKeyPath);
        } catch (branchError) {
          console.error(`Failed to create branch ${branchName}:`, branchError);
        }
      }
    }
    
    // Return the actual repository path
    return targetPath;
  }

  private async gitPull(repoPath: string, branchName: string, sshKeyPath?: string): Promise<void> {
    try {
      // First, fetch to make sure we have the latest remote refs
      await this.execCommand('git', ['fetch', 'origin'], repoPath, sshKeyPath);
      
      // Check if the remote branch exists
      try {
        await this.execCommand('git', ['rev-parse', '--verify', `origin/${branchName}`], repoPath, sshKeyPath);
        // Remote branch exists, pull from it
        await this.execCommand('git', ['pull', 'origin', branchName], repoPath, sshKeyPath);
      } catch (error) {
        // Remote branch doesn't exist, check if we're already on the correct local branch
        try {
          // First check if HEAD exists (repository has commits)
          await this.execCommand('git', ['rev-parse', '--verify', 'HEAD'], repoPath, sshKeyPath);
          
          // HEAD exists, check current branch
          const currentBranch = await this.execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoPath, sshKeyPath);
          if (currentBranch.trim() !== branchName) {
            // Create and switch to the new branch
            await this.execCommand('git', ['checkout', '-b', branchName], repoPath, sshKeyPath);
          }
          // Branch is now ready, no need to pull since remote doesn't exist yet
        } catch (branchError) {
          // HEAD doesn't exist (empty repo) or other error - create the branch
          console.log(`Repository appears to be empty, creating ${branchName} branch`);
          try {
            await this.execCommand('git', ['checkout', '-b', branchName], repoPath, sshKeyPath);
          } catch (createError) {
            throw new Error(`Failed to create branch ${branchName}: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("couldn't find remote ref")) {
        // Handle the specific case where remote branch doesn't exist
        console.log(`Remote branch '${branchName}' doesn't exist, will create it on next push`);
        try {
          // First check if HEAD exists (repository has commits)
          await this.execCommand('git', ['rev-parse', '--verify', 'HEAD'], repoPath, sshKeyPath);
          
          // HEAD exists, check current branch
          const currentBranch = await this.execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoPath, sshKeyPath);
          if (currentBranch.trim() !== branchName) {
            await this.execCommand('git', ['checkout', '-b', branchName], repoPath, sshKeyPath);
          }
        } catch (branchError) {
          // HEAD doesn't exist (empty repo) or other error - create the branch
          console.log(`Repository appears to be empty, creating ${branchName} branch`);
          try {
            await this.execCommand('git', ['checkout', '-b', branchName], repoPath, sshKeyPath);
          } catch (createError) {
            throw new Error(`Failed to create local branch ${branchName}: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
          }
        }
      } else {
        throw error;
      }
    }
  }

  private async gitPush(repoPath: string, branchName: string, sshKeyPath?: string): Promise<void> {
    try {
      // Try to push to the existing branch
      await this.execCommand('git', ['push', 'origin', branchName], repoPath, sshKeyPath);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes("does not exist") || 
        error.message.includes("no upstream branch") ||
        error.message.includes("fatal: The current branch")
      )) {
        // Branch doesn't exist on remote, push and set upstream
        console.log(`Creating new remote branch '${branchName}'`);
        await this.execCommand('git', ['push', '-u', 'origin', branchName], repoPath, sshKeyPath);
      } else {
        throw error;
      }
    }
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
        const repoPath = await this.gitClone(settings.gitRepoUrl, testPath, settings.branchName, settings.sshKeyPath);
        
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
    const pages = await prisma.page.findMany({
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });
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

        // Calculate and store content hash if not exists
        const contentHash = this.calculateContentHash(page.content);
        const latestVersion = page.versions[0];
        
        if (latestVersion && !latestVersion.content_hash) {
          await prisma.pageVersion.update({
            where: { id: latestVersion.id },
            data: { content_hash: contentHash }
          });
        }

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

  async triggerImport(userId: string, mode: 'smart' | 'force' = 'smart'): Promise<number> {
    return this.createImportJob(userId, mode);
  }

  async createImportJob(triggeredBy: string, mode: 'smart' | 'force' = 'smart'): Promise<number> {
    const job = await prisma.backupJob.create({
      data: {
        status: 'pending',
        triggeredBy,
        jobType: 'import'
      }
    });

    // Start the import process asynchronously
    this.processImport(job.id, mode).catch(error => {
      console.error('Import job failed:', error);
      this.updateJobStatus(job.id, 'failed', error.message);
    });

    return job.id;
  }

  private async processImport(jobId: number, mode: 'smart' | 'force'): Promise<void> {
    try {
      await this.updateJobStatus(jobId, 'running');

      const settings = await this.getSettings();
      if (!settings.gitRepoUrl) {
        throw new Error('Git repository URL not configured');
      }

      // Setup SSH key if provided
      if (settings.sshKeyPath) {
        await this.setupSSHKey(settings.sshKeyPath);
      }

      // Create backup directory if it doesn't exist
      await fs.mkdir(settings.backupPath, { recursive: true });

      // Clone or pull the repository to get latest content
      const repoName = settings.gitRepoUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
      const repoPath = join(settings.backupPath, repoName);
      
      const isExisting = await this.checkIfRepoExists(repoPath);
      if (isExisting) {
        await this.gitPull(repoPath, settings.branchName, settings.sshKeyPath);
      } else {
        // Remove any existing directory first
        try {
          await fs.rm(repoPath, { recursive: true, force: true });
        } catch (error) {
          // Ignore errors if directory doesn't exist
        }
        
        await this.gitClone(settings.gitRepoUrl, settings.backupPath, settings.branchName, settings.sshKeyPath);
      }

      // Import wiki data from the repository
      const wikiDataPath = join(repoPath, 'wiki-data');
      const importResult = await this.importWikiData(wikiDataPath, mode);

      await this.updateJobStatus(jobId, 'completed', undefined, 'imported', JSON.stringify(importResult));
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async importWikiData(importPath: string, mode: 'smart' | 'force'): Promise<any> {
    console.log(`Starting import from ${importPath} with mode: ${mode}`);
    
    const importResult = {
      pagesImported: 0,
      pagesUpdated: 0,
      pagesSkipped: 0,
      versionsImported: 0,
      imagesImported: 0,
      errors: [] as string[]
    };

    try {
      // Check if import path exists
      await fs.access(importPath);
    } catch {
      throw new Error(`Import path not found: ${importPath}`);
    }

    // Import pages
    try {
      const pageResult = await this.importPages(importPath, mode);
      importResult.pagesImported = pageResult.imported;
      importResult.pagesUpdated = pageResult.updated;
      importResult.pagesSkipped = pageResult.skipped;
    } catch (error) {
      console.error('Error importing pages:', error);
      importResult.errors.push(`Pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Import images
    try {
      const imagesPath = join(importPath, 'images');
      const imageResult = await this.importImages(imagesPath, mode);
      importResult.imagesImported = imageResult.imported;
    } catch (error) {
      console.error('Error importing images:', error);
      importResult.errors.push(`Images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('Import completed:', importResult);
    return importResult;
  }

  private async importPages(importPath: string, mode: 'smart' | 'force'): Promise<{ imported: number, updated: number, skipped: number }> {
    const result = { imported: 0, updated: 0, skipped: 0 };
    
    const walkDirectory = async (dir: string): Promise<void> => {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory() && file !== 'images' && file !== 'versions') {
          await walkDirectory(filePath);
        } else if (stat.isFile() && file.endsWith('.html')) {
          try {
            const imported = await this.importSinglePage(filePath, importPath, mode);
            if (imported === 'imported') result.imported++;
            else if (imported === 'updated') result.updated++;
            else result.skipped++;
          } catch (error) {
            console.error(`Error importing page ${filePath}:`, error);
          }
        }
      }
    };

    await walkDirectory(importPath);
    return result;
  }

  private async importSinglePage(filePath: string, importBasePath: string, mode: 'smart' | 'force'): Promise<'imported' | 'updated' | 'skipped'> {
    const content = await fs.readFile(filePath, 'utf8');
    const { metadata, htmlContent } = this.parseFileMetadata(content);
    
    if (!metadata) {
      console.warn(`No metadata found in ${filePath}, skipping`);
      return 'skipped';
    }

    // Use metadata path if available, otherwise generate from file structure
    const pagePath = metadata.path || this.generatePathFromFile(filePath, importBasePath);
    
    // Calculate content hash for smart merging
    const contentHash = this.calculateContentHash(htmlContent);
    
    // Check if page already exists
    const existingPage = await prisma.page.findUnique({
      where: { path: pagePath },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    const pageData = {
      title: metadata.title,
      content: htmlContent,
      path: pagePath,
      edit_groups: metadata.edit_groups || [],
      view_groups: metadata.view_groups || [],
      created_at: metadata.created ? new Date(metadata.created) : undefined,
      updated_at: metadata.date ? new Date(metadata.date) : undefined
    };

    if (existingPage) {
      if (mode === 'smart') {
        // Check if content is different using hash
        const latestVersion = existingPage.versions[0];
        if (latestVersion?.content_hash === contentHash) {
          console.log(`Skipping unchanged page: ${pagePath}`);
          return 'skipped';
        }
      }

      // Update existing page and create new version
      const latestVersion = await prisma.pageVersion.findFirst({
        where: { page_id: existingPage.id },
        orderBy: { version: 'desc' }
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

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

      // Create new version with hash
      await prisma.pageVersion.create({
        data: {
          page_id: existingPage.id,
          version: nextVersion,
          title: pageData.title,
          content: pageData.content,
          path: pagePath,
          edit_groups: pageData.edit_groups,
          view_groups: pageData.view_groups,
          edited_by: 'import',
          change_summary: `Imported from git backup (${mode} mode)`,
          content_hash: contentHash,
          is_draft: false,
          edited_at: pageData.updated_at || new Date()
        }
      });

      console.log(`Updated page: ${pagePath}`);
      return 'updated';
    } else {
      // Create new page
      const newPage = await prisma.page.create({
        data: {
          ...pageData,
          created_at: pageData.created_at || new Date(),
          updated_at: pageData.updated_at || new Date()
        }
      });

      // Create initial version with hash
      await prisma.pageVersion.create({
        data: {
          page_id: newPage.id,
          version: 1,
          title: pageData.title,
          content: pageData.content,
          path: pagePath,
          edit_groups: pageData.edit_groups,
          view_groups: pageData.view_groups,
          edited_by: 'import',
          change_summary: 'Initial import from git backup',
          content_hash: contentHash,
          is_draft: false,
          edited_at: pageData.updated_at || new Date()
        }
      });

      console.log(`Imported new page: ${pagePath}`);
      return 'imported';
    }
  }

  private async importImages(imagesPath: string, mode: 'smart' | 'force'): Promise<{ imported: number }> {
    const result = { imported: 0 };
    
    try {
      await fs.access(imagesPath);
    } catch {
      console.log('No images directory found, skipping image import');
      return result;
    }

    const files = await fs.readdir(imagesPath);
    const imageFiles = files.filter(f => !f.endsWith('.meta'));
    
    for (const imageFile of imageFiles) {
      const imagePath = join(imagesPath, imageFile);
      const metaPath = imagePath + '.meta';
      
      try {
        // Check if metadata file exists
        const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
        if (!metaExists) {
          console.warn(`No metadata file for ${imageFile}, skipping`);
          continue;
        }

        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metadata = JSON.parse(metaContent);
        
        // Check if image already exists
        const existingImage = await prisma.image.findFirst({
          where: { filename: metadata.filename }
        });

        if (existingImage && mode === 'smart') {
          console.log(`Skipping existing image: ${metadata.filename}`);
          continue;
        }

        const imageData = await fs.readFile(imagePath);
        
        // Find or create API user for image ownership
        let apiUser = await prisma.user.findUnique({
          where: { username: 'api-import-user' }
        });

        if (!apiUser) {
          apiUser = await prisma.user.create({
            data: {
              username: 'api-import-user',
              name: 'API Import User',
              email: 'api@import.system',
            }
          });
        }

        if (existingImage) {
          // Update existing image
          await prisma.image.update({
            where: { id: existingImage.id },
            data: {
              data: imageData,
              mimetype: metadata.mimetype
            }
          });
        } else {
          // Create new image
          await prisma.image.create({
            data: {
              filename: metadata.filename,
              mimetype: metadata.mimetype,
              data: imageData,
              userId: apiUser.id
            }
          });
        }

        result.imported++;
        console.log(`Imported image: ${metadata.filename}`);
      } catch (error) {
        console.error(`Error importing image ${imageFile}:`, error);
      }
    }

    return result;
  }

  private parseFileMetadata(content: string): { metadata: any | null; htmlContent: string } {
    const metadataMatch = content.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n\n([\s\S]*)$/);
    
    if (!metadataMatch) {
      return { metadata: null, htmlContent: content };
    }

    const metadataText = metadataMatch[1];
    const htmlContent = metadataMatch[2];
    
    const metadata: any = {};
    
    metadataText.split('\n').forEach((line: string) => {
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
          metadata.edit_groups = value.split(', ').map((g: string) => g.trim()).filter(Boolean);
          break;
        case 'view_groups':
          metadata.view_groups = value.split(', ').map((g: string) => g.trim()).filter(Boolean);
          break;
      }
    });

    return { metadata, htmlContent };
  }

  private generatePathFromFile(filePath: string, importBasePath: string): string {
    const relativePath = filePath.replace(importBasePath, '').replace(/^\/+/, '');
    const pathParts = relativePath.split('/').filter(part => part !== 'versions');
    
    // Remove .html extension and convert filename back to path segment
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.endsWith('.html')) {
      pathParts[pathParts.length - 1] = lastPart
        .replace('.html', '')
        .replace(/-v\d+$/, '') // Remove version suffix if present
        .replace(/-/g, '-'); // Keep dashes as they were sanitized
    }
    
    return '/' + pathParts.join('/');
  }

  private calculateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  async deletePageFromBackup(pageId: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('Git backup disabled, skipping file deletion');
      return;
    }

    try {
      // Get the page info before deletion
      const page = await prisma.page.findUnique({
        where: { id: pageId },
        select: { title: true, path: true }
      });

      if (!page) {
        console.log(`Page ${pageId} not found, skipping backup deletion`);
        return;
      }

      const repoName = settings.gitRepoUrl.replace(/\.git$/, '').split('/').pop() || 'repo';
      const repoPath = join(settings.backupPath, repoName);
      
      // Check if backup repository exists
      if (!(await this.checkIfRepoExists(repoPath))) {
        console.log('Backup repository does not exist, skipping file deletion');
        return;
      }

      const wikiDataPath = join(repoPath, 'wiki-data');
      
      // Determine the file path in backup based on page path
      const pathParts = page.path.split('/').filter(Boolean);
      const pageDir = pathParts.length > 1 
        ? join(wikiDataPath, ...pathParts.slice(0, -1))
        : wikiDataPath;
      
      const filename = this.sanitizeFilename(page.title) + '.html';
      const filePath = join(pageDir, filename);
      
      // Delete the file if it exists
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`Deleted backup file: ${filePath}`);
      } catch (error) {
        console.log(`Backup file does not exist or could not be deleted: ${filePath}`);
      }

      // If the directory is empty after deletion, remove it
      try {
        const files = await fs.readdir(pageDir);
        if (files.length === 0 && pageDir !== wikiDataPath) {
          await fs.rmdir(pageDir);
          console.log(`Removed empty directory: ${pageDir}`);
        }
      } catch (error) {
        console.log(`Could not check or remove directory: ${pageDir}`);
      }
    } catch (error) {
      console.error('Error deleting page from backup:', error);
      // Don't throw error to avoid breaking the deletion process
    }
  }
}
