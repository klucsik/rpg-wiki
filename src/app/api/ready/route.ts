import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/db';
import { withMetrics } from '@/lib/metrics/withMetrics';

/**
 * Readiness check endpoint for Kubernetes readiness probe
 * This checks that the application is ready to receive traffic
 * including database connectivity
 */
async function GETHandler() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const readiness = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok'
      },
      service: 'rpg-wiki',
      version: process.env.npm_package_version || 'unknown'
    };

    return NextResponse.json(readiness, { status: 200 });
  } catch (error) {
    console.error('Readiness check failed:', error);
    
    const failedReadiness = {
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'failed'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'rpg-wiki'
    };

    return NextResponse.json(failedReadiness, { status: 503 });
  }
}

export const GET = withMetrics('/api/ready', GETHandler);
