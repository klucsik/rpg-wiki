import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/better-auth';
import { prisma } from '@/lib/db/db';

export async function GET() {
  try {
    const session = await getServerAuth();
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['default_page_id']
        }
      }
    });

    const settingsMap = settings.reduce((acc: Record<string, string | null>, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string | null>);

    return NextResponse.json({
      defaultPageId: settingsMap.default_page_id ? parseInt(settingsMap.default_page_id, 10) : null
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuth();
    
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { defaultPageId } = body;

    // Validate that the page exists if a page ID is provided
    if (defaultPageId !== null && defaultPageId !== undefined) {
      const page = await prisma.page.findUnique({
        where: { id: defaultPageId }
      });

      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
    }

    // Upsert the setting
    await prisma.siteSetting.upsert({
      where: { key: 'default_page_id' },
      update: { 
        value: defaultPageId !== null ? defaultPageId.toString() : null,
        updatedAt: new Date() 
      },
      create: {
        key: 'default_page_id',
        value: defaultPageId !== null ? defaultPageId.toString() : null,
        encrypted: false
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
