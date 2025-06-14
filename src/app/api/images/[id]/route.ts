import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numId = Number(id);
  if (!numId) {
    return new NextResponse('Invalid image id', { status: 400 });
  }
  const image = await prisma.image.findUnique({ where: { id: numId } });
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
