import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';
import { getAuthFromRequest, requireAuthentication } from '../../../lib/auth-utils';

export async function POST(req: NextRequest) {
  // Authenticate the request
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Read file data
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save image to database using the authenticated user ID
  const image = await prisma.image.create({
    data: {
      filename: file.name,
      mimetype: file.type,
      data: buffer,
      userId: auth.userId,
    },
  });

  // Return a URL to access the image
  const url = `/api/images/${image.id}`;
  return NextResponse.json({ url, id: image.id });
}
