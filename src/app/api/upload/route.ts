import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId');
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
  }

  // Read file data
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save image to database
  const image = await prisma.image.create({
    data: {
      filename: file.name,
      mimetype: file.type,
      data: buffer,
      userId: Number(userId),
    },
  });

  // Return a URL to access the image (to be implemented)
  const url = `/api/images/${image.id}`;
  return NextResponse.json({ url, id: image.id });
}
