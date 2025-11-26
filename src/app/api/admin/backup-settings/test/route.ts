import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { GitBackupService } from '../../../../../features/backup/gitBackupService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();
    const backupService = GitBackupService.getInstance();
    
    const result = await backupService.testGitConnection(settings);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing git connection:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
