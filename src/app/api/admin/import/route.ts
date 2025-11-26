import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { GitBackupService } from '../../../../features/backup/gitBackupService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { mode = 'smart' } = await request.json();
    
    const backupService = GitBackupService.getInstance();
    const jobId = await backupService.triggerImport(session.user.id, mode);
    
    return NextResponse.json({ 
      jobId, 
      message: `Import job started with ${mode} merge mode` 
    });
  } catch (error) {
    console.error('Error starting import job:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
