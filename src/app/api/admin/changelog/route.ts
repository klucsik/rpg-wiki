import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Read changelog file
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const changelogContent = await readFile(changelogPath, 'utf-8');

    return NextResponse.json({ content: changelogContent });
  } catch (error) {
    console.error('Error reading changelog:', error);
    return NextResponse.json(
      { error: 'Failed to read changelog file' }, 
      { status: 500 }
    );
  }
}
