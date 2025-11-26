import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numId = Number(id);
  if (!numId) {
    return new NextResponse('Invalid media id', { status: 400 });
  }
  const media = await prisma.media.findUnique({ where: { id: numId } });
  if (!media) {
    return new NextResponse('Media not found', { status: 404 });
  }
  
  // Convert Prisma Bytes to ArrayBuffer
  const buffer = Buffer.from(media.data);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  
  // Properly encode filename for HTTP header (RFC 5987)
  const encodedFilename = encodeURIComponent(media.filename);
  
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': media.mimetype,
      'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'public, max-age=31536000',
      'Content-Length': buffer.length.toString(),
    },
  });
}
