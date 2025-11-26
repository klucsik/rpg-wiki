import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { GitBackupService } from '../../../../features/backup/gitBackupService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupService = GitBackupService.getInstance();
    const settings = await backupService.getSettings();
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();
    const backupService = GitBackupService.getInstance();
    
    await backupService.updateSettings(settings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
