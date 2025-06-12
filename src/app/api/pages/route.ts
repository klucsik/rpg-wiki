import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../db';
import { WikiPage } from '../../../types';

// GET all pages
export async function GET() {
  const result = await query('SELECT * FROM pages ORDER BY id ASC');
  return NextResponse.json(result.rows as WikiPage[]);
}

// POST create new page
export async function POST(req: NextRequest) {
  const { title, content } = await req.json();
  const result = await query(
    'INSERT INTO pages (title, content) VALUES ($1, $2) RETURNING *',
    [title, content]
  );
  return NextResponse.json(result.rows[0] as WikiPage);
}
