import { create } from 'zustand';

export type Page = {
  id: string;
  title: string;
  content: string;
};

interface PageState {
  pages: Page[];
  addPage: (page: Page) => void;
  updatePage: (id: string, page: Partial<Page>) => void;
  deletePage: (id: string) => void;
}

export const usePageStore = create<PageState>((set) => ({
  pages: [
    {
      id: 'sample-page',
      title: 'Sample Page',
      content: `\n    <h2>Welcome to the Sample Page</h2>\n    <p>This is a <b>sample</b> wiki page. You can add <i>formatting</i>, images, and crosslinks like [[AnotherPage]].</p>\n    <img src=\"https://placekitten.com/300/200\" alt=\"Sample\" style=\"max-width:100%\" />\n    <hr />\n    <div data-block-type=\"restricted\" data-usergroups='[\"admins\",\"editors\"]'>\n      <p><b>Restricted Block:</b> This content is only visible to admins and editors. Here is a secret map:</p>\n      <img src=\"https://placehold.co/400x200/secret/fff?text=Secret+Map\" alt=\"Secret Map\" style=\"max-width:100%\" />\n    </div>\n    <hr />\n    <p>Another public block for everyone to see.</p>\n  `,
    },
  ],
  addPage: (page) => set(state => ({ pages: [...state.pages, page] })),
  updatePage: (id, page) => set(state => ({
    pages: state.pages.map(p => p.id === id ? { ...p, ...page } : p)
  })),
  deletePage: (id) => set(state => ({ pages: state.pages.filter(p => p.id !== id) })),
}));
