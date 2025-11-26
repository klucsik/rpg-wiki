import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/db';
import { getAuthFromRequest, requireAuthentication } from '../../../lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
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

    // Validate that the file is an image or video
    const validMimeTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP, SVG) and videos (MP4, WebM, OGG) are allowed.' 
      }, { status: 400 });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify the user exists in the database before creating the image
    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
    });

    if (!user) {
      console.error(`User not found in database: ${auth.userId}`);
      console.error(`Auth object:`, JSON.stringify(auth, null, 2));
      return NextResponse.json({ 
        error: 'User not found in database. Please sign out and sign in again to sync your account.' 
      }, { status: 400 });
    }

    // Save media to database using the authenticated user ID
    const media = await prisma.media.create({
      data: {
        filename: file.name,
        mimetype: file.type,
        data: buffer,
        userId: auth.userId,
      },
    });

    // Return a URL to access the media
    const url = `/api/images/${media.id}`;
    return NextResponse.json({ url, id: media.id, mimetype: media.mimetype });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' }, 
      { status: 500 }
    );
  }
}
