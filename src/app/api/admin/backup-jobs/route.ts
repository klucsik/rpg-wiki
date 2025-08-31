import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { GitBackupService } from '../../../../gitBackupService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupService = GitBackupService.getInstance();
    const jobs = await backupService.getRecentBackupJobs(20);
    
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const backupService = GitBackupService.getInstance();
    const jobId = await backupService.triggerManualBackup(session.user.id);
    
    return NextResponse.json({ jobId, message: 'Backup job started' });
  } catch (error) {
    console.error('Error starting backup job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
