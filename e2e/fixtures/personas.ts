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
   * Groups: admin, gm, players, public
   */
  diana: {
    name: 'Diana',
    username: 'Diana',
    password: 'TestDiana123!',
    groups: ['admin', 'gm', 'players', 'public'],
    storageStatePath: 'e2e/.auth/diana.json',
  },
  
  /**
   * Regular player - limited access
   * Groups: players, party-alpha, public
   */
  alex: {
    name: 'Alex',
    username: 'Alex',
    password: 'TestAlex123!',
    groups: ['players', 'party-alpha', 'public'],
    storageStatePath: 'e2e/.auth/alex.json',
  },
  
  /**
   * Observer - view-only access
   * Groups: observers, public
   */
  sam: {
    name: 'Sam',
    username: 'Sam',
    password: 'TestSam123!',
    groups: ['observers', 'public'],
    storageStatePath: 'e2e/.auth/sam.json',
  },
};

export type PersonaName = 'diana' | 'alex' | 'sam';

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
  'gm',         // Game master group
  'players',    // All players
  'party-alpha', // Specific party
  'observers',  // View-only users
];
