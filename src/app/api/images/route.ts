import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';
import { getAuthFromRequest, requireAuthentication } from '../../../lib/auth-utils';

// GET all images - requires authentication (for the image link fixer script)
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const images = await prisma.image.findMany({
      select: {
        id: true,
        filename: true,
        mimetype: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' }
    });

    // Convert date fields to string for API response
    const imagesWithDates = images.map((image) => ({
      ...image,
      createdAt: image.createdAt.toISOString(),
    }));

    return NextResponse.json(imagesWithDates);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
