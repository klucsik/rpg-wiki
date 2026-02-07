import { NextRequest, NextResponse } from 'next/server';
import { renderDrawioToSvg } from '@/lib/drawio-renderer';

/**
 * API endpoint for client-side SVG preview of draw.io diagrams
 * POST /api/drawio/render
 * Body: { diagramXml: string } (base64-encoded XML)
 * Returns: { svg: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { diagramXml } = body;

    if (!diagramXml || typeof diagramXml !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid diagramXml parameter' },
        { status: 400 }
      );
    }

    const svg = await renderDrawioToSvg(diagramXml);

    return NextResponse.json({ svg });
  } catch (error) {
    console.error('Error in /api/drawio/render:', error);
    return NextResponse.json(
      { error: 'Failed to render diagram', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
