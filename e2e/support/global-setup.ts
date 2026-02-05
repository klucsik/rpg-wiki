import { chromium, FullConfig } from '@playwright/test';
import { PERSONAS, ALL_GROUPS } from '../fixtures/personas';
import { createTestPrismaClient, resetDatabase } from './db/prisma-helpers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for E2E tests
 * 
 * This runs once before all tests:
 * 1. Resets database and creates groups
 * 2. Creates users via API (so passwords are hashed correctly by better-auth)
 * 3. Authenticates each persona and saves their session state
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Running global setup...\n');
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  // Ensure auth directory exists
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Step 1: Reset database and create groups
  console.log('📦 Step 1: Resetting database and creating groups...');
  const prisma = createTestPrismaClient();
  try {
    await resetDatabase(prisma);
    
    // Create all groups
    for (const groupName of ALL_GROUPS) {
      await prisma.group.create({
        data: { name: groupName },
      });
    }
    console.log(`   Created ${ALL_GROUPS.length} groups`);
  } finally {
    await prisma.$disconnect();
  }
  
  // Step 2: Create users via API (so better-auth hashes passwords correctly)
  console.log('\n👥 Step 2: Creating users via API...');
  
  // Get group IDs for assignment
  const prisma2 = createTestPrismaClient();
  const groupMap = new Map<string, number>();
  try {
    const groups = await prisma2.group.findMany();
    for (const group of groups) {
      groupMap.set(group.name, group.id);
    }
  } finally {
    await prisma2.$disconnect();
  }
  
  for (const [key, persona] of Object.entries(PERSONAS)) {
    const groupIds = persona.groups
      .map(g => groupMap.get(g))
      .filter((id): id is number => id !== undefined);
    
    console.log(`   Creating user: ${persona.username}...`);
    
    const response = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: persona.name,
        username: persona.username,
        password: persona.password,
        groupIds,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create user ${persona.username}: ${error}`);
    }
    
    console.log(`   ✅ Created ${persona.username}`);
  }
  
  // Step 3: Authenticate each persona and save session state
  console.log('\n🔐 Step 3: Authenticating personas...');
  
  const browser = await chromium.launch();
  
  for (const [name, persona] of Object.entries(PERSONAS)) {
    console.log(`   Authenticating ${persona.username}...`);
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Navigate to login page
      await page.goto(`${baseURL}/auth/signin`);
      
      // Fill in credentials - use form context to avoid header elements
      const form = page.getByTestId('login-form');
      await form.getByTestId('username-input').or(form.locator('input[placeholder="Username"]')).fill(persona.username);
      await form.getByTestId('password-input').or(form.locator('input[placeholder="Password"]')).fill(persona.password);
      
      // Submit login form
      await form.getByTestId('login-button').or(form.locator('button[type="submit"]')).click();
      
      // Wait for redirect to pages (indicates successful login)
      await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
      
      // Save storage state
      const storagePath = path.join(process.cwd(), persona.storageStatePath);
      await context.storageState({ path: storagePath });
      
      console.log(`   ✅ ${persona.username} authenticated`);
    } catch (error) {
      console.error(`   ❌ Failed to authenticate ${persona.username}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  console.log('\n✅ Global setup complete!\n');
}

export default globalSetup;
