export interface GoogleDocsParsedResult {
  pages: GoogleDocsPage[];
  images: GoogleDocsImageReference[];
}

// Visibility levels that map to edit_groups/view_groups on DB write.
// 'public' → view_groups=['public'], edit_groups=['admin']
// 'owner' (default) → both groups=[importer_user]
export type PageVisibility = 'public' | 'owner';

export interface GoogleDocsPage {
  title: string;
  content: string; // HTML content — must not alter original text/structure
  path: string;    // Hierarchical wiki path, e.g. "my-topic/subtopic"
  
  // Metadata fields for Phase-2 LLM output and YAML frontmatter support.
  visibility?: PageVisibility;          // Maps to view_groups/edit_groups on DB write (default: 'owner')
  targetGroups?: string[];              // Specific groups from LLM or frontmatter
  edit_groups?: string[];               // Override defaults per-page
  view_groups?: string[];
}

// ---------------------------------------------------------------------------
// LLM JSON Schema (draft for Phase 2) — see audit report:
//   src/workitems/50-done/google-docs-import-metadata-alignment-audit.md
// ---------------------------------------------------------------------------

export interface GoogleDocsImageReference {
  originalSrc: string;
  resolvedPath?: string; // If it's a local file path
  type: 'local' | 'remote';
}

/** Metadata about the source document and expected page count. */
export interface LLMOutputMeta {
  sourceDocumentTitle?: string;
  totalPagesExpected?: number;
}

/** Top-level wrapper for LLM-generated slice output. */
export interface LLMSliceOutput {
  pages: GoogleDocsPage[];
  _meta?: LLMOutputMeta;
}
