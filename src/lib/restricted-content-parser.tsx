"use client";
import React from "react";
import RestrictedBlockView from "../RestrictedBlockView";
import PlaceholderContentView from "../PlaceholderContentView";
import RestrictedBlockPlaceholderView from "../RestrictedBlockPlaceholderView";

interface User {
  groups: string[];
}

function RestrictedBlock({ 
  children, 
  allowedGroups, 
  title, 
  user 
}: { 
  children: React.ReactNode; 
  allowedGroups: string[]; 
  title: string; 
  user?: User | null;
}) {
  // Always pass a valid user object to RestrictedBlockView
  const safeUser = user && user.groups ? { groups: user.groups } : { groups: ["public"] };
  return (
    <RestrictedBlockView title={title} usergroups={allowedGroups} user={safeUser}>
      {children}
    </RestrictedBlockView>
  );
}

/**
 * Parses HTML content and converts restricted blocks into permission-aware React components.
 * 
 * Restricted blocks are HTML elements with:
 * - data-block-type="restricted"
 * - data-usergroups='["group1", "group2"]' (JSON array of allowed groups)
 * - data-title="Block Title" (optional title for the block)
 * 
 * @param html - HTML string to parse
 * @param user - User object with groups array for permission checking
 * @returns React elements with restricted blocks converted to permission-aware components
 */
export function parseWikiContentWithRestrictedBlocks(html: string, user?: User | null): React.ReactNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  
  function walkNode(node: ChildNode): React.ReactNode {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      // Handle restricted blocks
      if (el.dataset.blockType === 'restricted') {
        const allowedGroups = JSON.parse(el.dataset.usergroups || '[]');
        const title = el.getAttribute('data-title') || 'Restricted Block';
        return (
          <RestrictedBlock allowedGroups={allowedGroups} title={title} user={user}>
            {Array.from(el.childNodes).map((child, i) => (
              <span key={i}>{walkNode(child)}</span>
            ))}
          </RestrictedBlock>
        );
      }
      
      // Handle restricted block placeholders
      if (el.dataset.blockType === 'restricted-placeholder') {
        return (
          <PlaceholderContentView 
            key={`placeholder-${el.getAttribute('data-block-id')}`}
            blockId={el.getAttribute('data-block-id') || ''}
            originalUsergroups={el.getAttribute('data-original-usergroups') || '[]'}
            originalEditgroups={el.getAttribute('data-original-editgroups') || '[]'}
          />
        );
      }
      
      // Convert HTML attributes to React props
      const attribs = Object.fromEntries(
        Array.from(el.attributes).map(a => {
          if (a.name === 'style') {
            // Convert CSS string to React style object
            const styleObj = Object.fromEntries(
              a.value.split(';').filter(Boolean).map(rule => {
                const [key, value] = rule.split(':').map(s => s && s.trim());
                // Convert kebab-case to camelCase for React
                const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
                return [camelKey, value];
              })
            );
            return ['style', styleObj];
          }
          return [a.name, a.value];
        })
      );
      
      // Handle void elements (self-closing tags)
      const voidElements = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
        'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      
      const tagName = el.tagName.toLowerCase();
      
      // Only handle known HTML elements, fallback to div for unknown elements
      const validHTMLElements = new Set([
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'a', 'img', 
        'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'hr', 'br',
        'blockquote', 'code', 'pre', 'b', 'i', 'u', 's', 'del', 'ins', 'mark',
        'area', 'base', 'col', 'embed', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      
      const safeTagName = validHTMLElements.has(tagName) ? tagName : 'div';
      
      if (voidElements.has(tagName)) {
        return React.createElement(safeTagName as any, attribs);
      }
      
      // Regular elements with children
      return React.createElement(
        safeTagName as any,
        attribs,
        Array.from(el.childNodes).map((child, i) => (
          <span key={i}>{walkNode(child)}</span>
        ))
      );
    } else if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    
    return null;
  }
  
  return Array.from(doc.body.firstChild!.childNodes).map((n, i) => (
    <span key={i}>{walkNode(n)}</span>
  ));
}

// Legacy export for backward compatibility
export const parseHtmlWithRestrictedBlocks = parseWikiContentWithRestrictedBlocks;
