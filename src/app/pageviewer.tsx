"use client";
import React from "react";
import RestrictedBlockView from "../RestrictedBlockView";

function RestrictedBlock({ children, allowedGroups, title, user }: { children: React.ReactNode; allowedGroups: string[]; title: string; user?: { groups: string[] } | null }) {
  // Always pass a valid user object to RestrictedBlockView
  const safeUser = user && user.groups ? { group: user.groups[0] ?? "public", groups: user.groups } : { group: "public", groups: ["public"] };
  return (
    <RestrictedBlockView title={title} usergroups={allowedGroups} user={safeUser}>
      {children}
    </RestrictedBlockView>
  );
}

function parseHtmlWithRestrictedBlocks(html: string, user?: { groups: string[] } | null) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  function walk(node: ChildNode): React.ReactNode {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.blockType === 'restricted') {
        const allowedGroups = JSON.parse(el.dataset.usergroups || '[]');
        const title = el.getAttribute('data-title') || 'Restricted Block';
        return (
          <RestrictedBlock allowedGroups={allowedGroups} title={title} user={user}>
            {Array.from(el.childNodes).map((child, i) => <span key={i}>{walk(child)}</span>)}
          </RestrictedBlock>
        );
      }
      // Convert style attribute from string to object for React
      const attribs = Object.fromEntries(Array.from(el.attributes).map(a => {
        if (a.name === 'style') {
          // Convert style string to object
          const styleObj = Object.fromEntries(
            a.value.split(';').filter(Boolean).map(rule => {
              const [key, value] = rule.split(':').map(s => s && s.trim());
              // Convert kebab-case to camelCase
              const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
              return [camelKey, value];
            })
          );
          return ['style', styleObj];
        }
        return [a.name, a.value];
      }));
      // Special handling for void elements (like img, br, hr, etc.)
      const voidElements = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      if (voidElements.has(el.tagName.toLowerCase())) {
        return React.createElement(
          el.tagName.toLowerCase(),
          attribs
        );
      }
      return React.createElement(
        el.tagName.toLowerCase(),
        attribs,
        Array.from(el.childNodes).map((child, i) => <span key={i}>{walk(child)}</span>)
      );
    } else if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    return null;
  }
  return Array.from(doc.body.firstChild!.childNodes).map((n, i) => <span key={i}>{walk(n)}</span>);
}

const DEMO_PAGES = [
  {
    id: 'sample-page',
    title: 'Sample Page',
    content: `\n    <h2>Welcome to the Sample Page</h2>\n    <p>This is a <b>sample</b> wiki page. You can add <i>formatting</i>, images, and crosslinks like [[AnotherPage]].</p>\n    <img src=\"https://placekitten.com/300/200\" alt=\"Sample\" style=\"max-width:100%\" />\n    <hr />\n    <div data-block-type=\"restricted\" data-usergroups='[\"admins\",\"editors\"]'>\n      <p><b>Restricted Block:</b> This content is only visible to admins and editors. Here is a secret map:</p>\n      <img src=\"https://placehold.co/400x200/secret/fff?text=Secret+Map\" alt=\"Secret Map\" style=\"max-width:100%\" />\n    </div>\n    <hr />\n    <p>Another public block for everyone to see.</p>\n  `,
  },
];
const DEMO_USER = { id: '1', name: 'Alice', groups: ['admins'] };

export default function PageViewer({ pageId }: { pageId: string }) {
  const page = DEMO_PAGES.find(p => p.id === pageId);
  const user = DEMO_USER;
  if (!page) return <div>Page not found</div>;
  return (
    <div>
      <h1>{page.title}</h1>
      <div>{parseHtmlWithRestrictedBlocks(page.content, user)}</div>
    </div>
  );
}

export { parseHtmlWithRestrictedBlocks };
