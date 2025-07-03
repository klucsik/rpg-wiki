import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
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
      sshKeyPath: settingsMap.ssh_key_path || '',
      backupPath: settingsMap.backup_path || '/tmp/wiki-backup',
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

      // Create backup directory if it doesn't exist
      await fs.mkdir(settings.backupPath, { recursive: true });

      // Clone or pull the repository
      const isExisting = await this.checkIfRepoExists(settings.backupPath);
      if (isExisting) {
        await this.gitPull(settings.backupPath, settings.sshKeyPath);
      } else {
        await this.gitClone(settings.gitRepoUrl, settings.backupPath, settings.sshKeyPath);
      }

      // Export wiki data
      await this.exportWikiData(settings.backupPath);

      // Create git commit
      const commitHash = await this.createGitCommit(settings.backupPath, settings.sshKeyPath);

      // Push to remote
      await this.gitPush(settings.backupPath, settings.sshKeyPath);

      await this.updateJobStatus(jobId, 'completed', undefined, commitHash, settings.backupPath);
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

  private async execCommand(command: string, args: string[], cwd: string, sshKeyPath?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      
      if (sshKeyPath) {
        env.GIT_SSH_COMMAND = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no`;
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
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async gitClone(repoUrl: string, targetPath: string, sshKeyPath?: string): Promise<void> {
    await this.execCommand('git', ['clone', repoUrl, targetPath], process.cwd(), sshKeyPath);
  }

  private async gitPull(repoPath: string, sshKeyPath?: string): Promise<void> {
    await this.execCommand('git', ['pull', 'origin', 'main'], repoPath, sshKeyPath);
  }

  private async gitPush(repoPath: string, sshKeyPath?: string): Promise<void> {
    await this.execCommand('git', ['push', 'origin', 'main'], repoPath, sshKeyPath);
  }

  private async exportWikiData(backupPath: string): Promise<void> {
    // Use the export script we created earlier
    const exportScript = join(process.cwd(), 'scripts', 'export-to-filesystem.ts');
    const wikiDataPath = join(backupPath, 'wiki-data');
    
    await this.execCommand('npx', ['tsx', exportScript, wikiDataPath], process.cwd());
  }

  private async createGitCommit(repoPath: string, sshKeyPath?: string): Promise<string> {
    // Configure git user if not set
    try {
      await this.execCommand('git', ['config', 'user.name'], repoPath);
    } catch {
      await this.execCommand('git', ['config', 'user.name', 'RPG Wiki Backup'], repoPath);
      await this.execCommand('git', ['config', 'user.email', 'backup@rpg-wiki.local'], repoPath);
    }

    // Add all changes
    await this.execCommand('git', ['add', '.'], repoPath);

    // Check if there are changes to commit
    try {
      await this.execCommand('git', ['diff', '--cached', '--exit-code'], repoPath);
      // No changes
      return 'no-changes';
    } catch {
      // There are changes, commit them
      const timestamp = new Date().toISOString();
      await this.execCommand('git', ['commit', '-m', `Automated backup: ${timestamp}`], repoPath);
      
      // Get the commit hash
      const commitHash = await this.execCommand('git', ['rev-parse', 'HEAD'], repoPath);
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
}
