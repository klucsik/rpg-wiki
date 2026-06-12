export interface GoogleDocsParsedResult {
  pages: GoogleDocsPage[];
  images: GoogleDocsImageReference[];
}

export interface GoogleDocsPage {
  title: string;
  content: string; // HTML content
  path: string; // Relative path within the document structure
}

export interface GoogleDocsImageReference {
  originalSrc: string;
  resolvedPath?: string; // If it's a local file path
  type: 'local' | 'remote';
}
