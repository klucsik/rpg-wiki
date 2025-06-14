import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return new NextResponse('Invalid image id', { status: 400 });
  }
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return new NextResponse('Image not found', { status: 404 });
  }
  return new NextResponse(image.data, {
    status: 200,
    headers: {
      'Content-Type': image.mimetype,
      'Content-Disposition': `inline; filename="${image.filename}"`,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
