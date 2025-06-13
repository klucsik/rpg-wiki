export interface WikiPage {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  edit_groups?: string[]; // groups allowed to edit this page
}
