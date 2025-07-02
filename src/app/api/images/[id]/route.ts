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
  
  // Convert Prisma Bytes to ArrayBuffer
  const buffer = Buffer.from(image.data);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  
  // Properly encode filename for HTTP header (RFC 5987)
  const encodedFilename = encodeURIComponent(image.filename);
  
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': image.mimetype,
      'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'public, max-age=31536000',
      'Content-Length': buffer.length.toString(),
    },
  });
}
