export const BLOCK_TYPES = {
  RESTRICTED: 'restricted',
  RESTRICTED_PLACEHOLDER: 'restricted-placeholder',
  DH_ADVERSARY: 'dh-adversary',
  DH_ENVIRONMENT: 'dh-environment',
  PF2E_MONSTER: 'pf2e-monster',
  PF2E_TRAP: 'pf2e-trap',
  DS_MONSTER: 'ds-monster',
} as const;

export const NODE_TYPES = {
  RESTRICTED: 'restrictedBlock',
  DH_ADVERSARY: 'dhAdversary',
  DH_ENVIRONMENT: 'dhEnvironment',
  MERMAID: 'mermaid',
  DRAWIO: 'drawio',
} as const;

export type SupportedBlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

export const PLANNED_BLOCK_FAMILIES: ReadonlyArray<SupportedBlockType> = [
  BLOCK_TYPES.DH_ADVERSARY,
  BLOCK_TYPES.DH_ENVIRONMENT,
  BLOCK_TYPES.PF2E_MONSTER,
  BLOCK_TYPES.PF2E_TRAP,
  BLOCK_TYPES.DS_MONSTER,
];

export function isDhBlockType(blockType: string): boolean {
  return blockType === BLOCK_TYPES.DH_ADVERSARY || blockType === BLOCK_TYPES.DH_ENVIRONMENT;
}
