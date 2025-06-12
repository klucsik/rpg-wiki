import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../db';
import { WikiPage } from '../../../../types';

// GET, PUT, DELETE for a single page by id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const result = await query('SELECT * FROM pages WHERE id = $1', [id]);
  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0] as WikiPage);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const { title, content } = await req.json();
  const result = await query(
    'UPDATE pages SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [title, content, id]
  );
  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0] as WikiPage);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  await query('DELETE FROM pages WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
