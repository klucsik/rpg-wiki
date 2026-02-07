/**
 * Persona definitions for E2E tests
 * 
 * Standard personas used across all feature files:
 * - Diana: Game Master with admin access (sees everything)
 * - Alex: Regular player with limited access
 * - Sam: Observer with view-only access
 */

export interface Persona {
  name: string;
  username: string;
  password: string;
  groups: readonly string[];
  storageStatePath: string;
}

export const PERSONAS: Record<string, Persona> = {
  /**
   * Game Master - full access via admin group
   * Groups: admin, diana, players, public
   */
  diana: {
    name: 'Diana',
    username: 'Diana',
    password: 'TestDiana123!',
    groups: ['admin', 'diana', 'public'],
    storageStatePath: 'e2e/.auth/diana.json',
  },
  
  /**
   * Regular player - limited access
   * Groups: alex, public
   */
  alex: {
    name: 'Alex',
    username: 'Alex',
    password: 'TestAlex123!',
    groups: ['alex', 'public'],
    storageStatePath: 'e2e/.auth/alex.json',
  }
};

export type PersonaName = 'diana' | 'alex';

/**
 * Get persona by name (case-insensitive)
 */
export function getPersona(name: string): Persona {
  const key = name.toLowerCase();
  const persona = PERSONAS[key];
  if (!persona) {
    throw new Error(`Unknown persona: ${name}. Valid personas are: ${Object.keys(PERSONAS).join(', ')}`);
  }
  return persona;
}

/**
 * All groups used in tests
 */
export const ALL_GROUPS = [
  'admin',      // Super-access group - sees everything
  'public',     // Universal group - everyone has this
  'diana',      
  'alex'  

];
