import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Kubernetes liveness probe
 * This is a basic check that the application is running
 */
export async function GET() {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'rpg-wiki',
      version: process.env.npm_package_version || 'unknown'
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }, 
      { status: 500 }
    );
  }
}
