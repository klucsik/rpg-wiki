export interface WikiPage {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  edit_groups?: string[]; // groups allowed to edit this page
  view_groups?: string[]; // groups allowed to view this page
  path: string; // hierarchical path, e.g. /lore/dragons
  version?: number; // version number of the page
}
