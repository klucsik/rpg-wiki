"use client";
import React, { useState, useEffect } from 'react';

interface BackupSettings {
  gitRepoUrl: string;
  sshKeyPath: string;
  backupPath: string;
  enabled: boolean;
}

interface BackupJob {
  id: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  commitHash?: string;
  exportPath?: string;
  triggeredBy: string;
  jobType: string;
}

export default function BackupSettingsPage() {
  const [settings, setSettings] = useState<BackupSettings>({
    gitRepoUrl: '',
    sshKeyPath: '',
    backupPath: '/tmp/wiki-backup',
    enabled: false
  });
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchJobs();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/backup-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching backup settings:', error);
      setMessage({ type: 'error', text: 'Failed to load backup settings' });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/admin/backup-jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching backup jobs:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/backup-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Backup settings saved successfully! If enabled, a backup job has been started.' });
        fetchJobs(); // Refresh the jobs list
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving backup settings:', error);
      setMessage({ type: 'error', text: 'Failed to save backup settings' });
    } finally {
      setSaving(false);
    }
  };

  const triggerManualBackup = async () => {
    try {
      const response = await fetch('/api/admin/backup-jobs', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Manual backup started (Job #${data.jobId})` });
        fetchJobs(); // Refresh the jobs list
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to start backup' });
      }
    } catch (error) {
      console.error('Error starting manual backup:', error);
      setMessage({ type: 'error', text: 'Failed to start manual backup' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-indigo-100">Loading backup settings...</div>
    );
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/50 border-green-700 text-green-100' 
            : 'bg-red-900/50 border-red-700 text-red-100'
        }`}>
          {message.text}
        </div>
      )}

      {/* Git Backup Settings */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-indigo-300 mb-6">Git Backup Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-300 mb-2">
              Git Repository URL
            </label>
            <input
              type="text"
              value={settings.gitRepoUrl}
              onChange={(e) => setSettings({ ...settings, gitRepoUrl: e.target.value })}
              placeholder="git@github.com:user/repo.git or https://github.com/user/repo.git"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-indigo-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              SSH URLs are recommended for automated backups
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-300 mb-2">
              SSH Key Path (for SSH URLs)
            </label>
            <input
              type="text"
              value={settings.sshKeyPath}
              onChange={(e) => setSettings({ ...settings, sshKeyPath: e.target.value })}
              placeholder="/path/to/ssh/private/key"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-indigo-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty for HTTPS URLs or default SSH key
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-300 mb-2">
              Local Backup Path
            </label>
            <input
              type="text"
              value={settings.backupPath}
              onChange={(e) => setSettings({ ...settings, backupPath: e.target.value })}
              placeholder="/tmp/wiki-backup"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-indigo-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Local directory where the git repository will be cloned/managed
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="backup-enabled"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 bg-gray-900 border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="backup-enabled" className="text-sm font-medium text-indigo-300">
              Enable automatic backups after page saves
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={triggerManualBackup}
            disabled={!settings.enabled || !settings.gitRepoUrl}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            Trigger Manual Backup
          </button>
        </div>
      </div>

      {/* Backup Jobs History */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-indigo-300">Recent Backup Jobs</h3>
          <button
            onClick={fetchJobs}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Refresh
          </button>
        </div>
        
        {jobs.length === 0 ? (
          <p className="text-gray-400">No backup jobs found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-600">
                  <th className="pb-2 text-indigo-300">Job ID</th>
                  <th className="pb-2 text-indigo-300">Status</th>
                  <th className="pb-2 text-indigo-300">Type</th>
                  <th className="pb-2 text-indigo-300">Started</th>
                  <th className="pb-2 text-indigo-300">Completed</th>
                  <th className="pb-2 text-indigo-300">Triggered By</th>
                  <th className="pb-2 text-indigo-300">Commit</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-700/50">
                    <td className="py-2 text-indigo-100">#{job.id}</td>
                    <td className={`py-2 font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </td>
                    <td className="py-2 text-gray-300">
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.jobType === 'manual' 
                          ? 'bg-blue-900/50 text-blue-300' 
                          : 'bg-gray-900/50 text-gray-300'
                      }`}>
                        {job.jobType}
                      </span>
                    </td>
                    <td className="py-2 text-gray-300">{formatDate(job.startedAt)}</td>
                    <td className="py-2 text-gray-300">
                      {job.completedAt ? formatDate(job.completedAt) : '-'}
                    </td>
                    <td className="py-2 text-gray-300">{job.triggeredBy}</td>
                    <td className="py-2 text-gray-300 font-mono text-xs">
                      {job.commitHash ? (
                        job.commitHash === 'no-changes' ? (
                          <span className="text-yellow-400">No changes</span>
                        ) : (
                          job.commitHash.substring(0, 8)
                        )
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-indigo-300 mb-4">Setup Instructions</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-indigo-300 mb-2">1. Set up Git Repository</h4>
            <p>Create a git repository to store your wiki backups. For SSH access, add your server's public key to the repository's deploy keys.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-indigo-300 mb-2">2. SSH Key (Optional)</h4>
            <p>If using SSH URLs, ensure the SSH private key is accessible to the application and specify the full path above.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-indigo-300 mb-2">3. Backup Path</h4>
            <p>Choose a local directory where the git repository will be cloned. Ensure the application has write permissions.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-indigo-300 mb-2">4. Import from Backup</h4>
            <p>To restore from a backup, use the import script:</p>
            <code className="block bg-gray-900 p-2 rounded mt-1 font-mono text-xs">
              npx tsx scripts/import-from-filesystem.ts /path/to/backup/wiki-data --update-existing
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
