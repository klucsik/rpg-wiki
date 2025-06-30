#!/usr/bin/env tsx

/**
 * Generate an API key for import operations
 * 
 * Usage:
 *   npx tsx scripts/generate-api-key.ts
 */

import { randomBytes } from 'crypto';

function generateApiKey(): string {
  // Generate a secure random API key
  return randomBytes(32).toString('hex');
}

const apiKey = generateApiKey();

console.log('Generated API Key:');
console.log(apiKey);
console.log('');
console.log('To use this API key for imports, set it as an environment variable:');
console.log(`export IMPORT_API_KEY="${apiKey}"`);
console.log('');
console.log('Or add it to your .env file:');
console.log(`IMPORT_API_KEY="${apiKey}"`);
