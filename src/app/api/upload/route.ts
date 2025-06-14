import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Set a directory for uploads (publicly accessible)
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Generate a unique filename
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Ensure upload directory exists
  await fs.mkdir(uploadDir, { recursive: true });

  // Save the file
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  // Return the public URL
  const url = `/uploads/${filename}`;
  return NextResponse.json({ url });
}
