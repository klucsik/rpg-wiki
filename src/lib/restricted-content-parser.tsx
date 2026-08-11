"use client";
import React from "react";
import RestrictedBlockView from "../components/editor/RestrictedBlockView";
import PlaceholderContentView from "../features/pages/PlaceholderContentView";
import MermaidView from "../components/editor/MermaidView";
import { getEmbedStyleObject } from "../components/editor/embedFormatting";
import { BLOCK_TYPES } from "./block-types";

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
  let nodeCounter = 0;
  
  function walkNode(node: ChildNode): React.ReactNode {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      // Handle restricted blocks
      if (el.dataset.blockType === BLOCK_TYPES.RESTRICTED) {
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
      if (el.dataset.blockType === BLOCK_TYPES.RESTRICTED_PLACEHOLDER) {
        return (
          <PlaceholderContentView 
            key={`placeholder-${el.getAttribute('data-block-id')}`}
            blockId={el.getAttribute('data-block-id') || ''}
            originalUsergroups={el.getAttribute('data-original-usergroups') || '[]'}
            originalEditgroups={el.getAttribute('data-original-editgroups') || '[]'}
            originalTitle={el.getAttribute('data-original-title') || undefined}
            allowedGroups={el.getAttribute('data-allowed-groups') || '[]'}
          />
        );
      }
      
      // Handle Mermaid diagrams
      if (el.dataset.type === 'mermaid') {
        const code = el.getAttribute('data-code') || '';
        return <MermaidView key={`mermaid-${nodeCounter++}`} code={code} />;
      }

      // Handle DH adversary blocks
      if (el.dataset.blockType === BLOCK_TYPES.DH_ADVERSARY) {
        const name = el.getAttribute('data-name') || 'New Adversary';
        const tier = el.getAttribute('data-tier') || 'Tier 1 Minion';
        const role = el.getAttribute('data-role') || 'Humanoid';
        const flavor = el.getAttribute('data-flavor') || '';
        const motivesTactics = el.getAttribute('data-motives-tactics') || '';
        const difficulty = el.getAttribute('data-difficulty') || '';
        const thresholds = el.getAttribute('data-thresholds') || '';
        const hp = el.getAttribute('data-hp') || '';
        const stress = el.getAttribute('data-stress') || '';
        const atk = el.getAttribute('data-atk') || '';
        const experience = el.getAttribute('data-experience') || '';
        const featuresHtml = el.getAttribute('data-features-html') || '';
        const featuresText = el.getAttribute('data-features-text') || '';
        const width = el.getAttribute('data-width') || undefined;
        const align = el.getAttribute('data-align') || undefined;
        const wrap = el.getAttribute('data-wrap') || undefined;

        return (
          <div
            key={`dh-adversary-${nodeCounter++}`}
            className="dh-adversary-html"
            data-block-type={BLOCK_TYPES.DH_ADVERSARY}
            style={getEmbedStyleObject({ width, align, wrap })}
          >
            <div className="dh-adversary-name">{name}</div>
            <div className="dh-adversary-tier-role">{tier}{role ? ` | ${role}` : ''}</div>
            {flavor && <div className="dh-adversary-flavor">{flavor}</div>}
            {motivesTactics && <div className="dh-adversary-motives">{motivesTactics}</div>}
            <div className="dh-adversary-stats">
              <span className="dh-adversary-stat">Difficulty: {difficulty}</span>
              <span className="dh-adversary-stat">Thresholds: {thresholds}</span>
              <span className="dh-adversary-stat">HP: {hp}</span>
              <span className="dh-adversary-stat">Stress: {stress}</span>
            </div>
            {atk && <div className="dh-adversary-atk">ATK: {atk}</div>}
            <div className="dh-adversary-experience-title">EXPERIENCES</div>
            {experience && <div className="dh-adversary-experience">{experience}</div>}
            <div className="dh-adversary-features-title">FEATURES</div>
            <div
              className="dh-adversary-features-text"
              dangerouslySetInnerHTML={{ __html: featuresHtml || `<p>${featuresText}</p>` }}
            />
          </div>
        );
      }

      // Handle DH environment blocks
      if (el.dataset.blockType === BLOCK_TYPES.DH_ENVIRONMENT) {
        const name = el.getAttribute('data-name') || 'Abandoned Mine';
        const tierType = el.getAttribute('data-tier-type') || 'Tier 1 Exploration';
        const flavor = el.getAttribute('data-flavor') || '';
        const impulses = el.getAttribute('data-impulses') || '';
        const difficulty = el.getAttribute('data-difficulty') || '';
        const potentialAdversaries = el.getAttribute('data-potential-adversaries') || '';
        const featuresHtml = el.getAttribute('data-features-html') || '';
        const featuresText = el.getAttribute('data-features-text') || '';
        const width = el.getAttribute('data-width') || undefined;
        const align = el.getAttribute('data-align') || undefined;
        const wrap = el.getAttribute('data-wrap') || undefined;

        return (
          <div
            key={`dh-environment-${nodeCounter++}`}
            className="dh-environment-html"
            data-block-type={BLOCK_TYPES.DH_ENVIRONMENT}
            style={getEmbedStyleObject({ width, align, wrap })}
          >
            <div className="dh-environment-name">{name}</div>
            <div className="dh-environment-tier-type">{tierType}</div>
            {flavor && <div className="dh-environment-flavor">{flavor}</div>}
            {impulses && <div className="dh-environment-impulses">{impulses}</div>}
            <div className="dh-environment-core"><span className="dh-environment-core-label">Difficulty: </span><span className="dh-environment-core-value">{difficulty}</span></div>
            <div className="dh-environment-core"><span className="dh-environment-core-label">Potential Adversaries: </span><span className="dh-environment-core-value">{potentialAdversaries}</span></div>
            <div className="dh-environment-features-title">FEATURES</div>
            <div
              className="dh-environment-features-text"
              dangerouslySetInnerHTML={{ __html: featuresHtml || `<p>${featuresText}</p>` }}
            />
          </div>
        );
      }
      
      // Handle Draw.io diagrams - render the server-generated content
      if (el.classList.contains('drawio-diagram')) {
        let diagramHtml = el.innerHTML;
        
        // Fallback: if server didn't inject SVG into innerHTML, try data attributes
        if (!diagramHtml || diagramHtml.trim() === '') {
          const svgData = el.getAttribute('data-diagram-svg');
          if (svgData && svgData.trim() !== '') {
            if (svgData.startsWith('data:image/svg+xml;base64,')) {
              diagramHtml = `<img src="${svgData}" alt="Diagram" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;
            } else if (svgData.startsWith('<svg')) {
              diagramHtml = svgData;
            } else {
              try {
                diagramHtml = atob(svgData);
              } catch (e) {
                diagramHtml = '<p style="color: red;">Failed to display diagram</p>';
              }
            }
          }
        }
        
        return (
          <div 
            key={`drawio-${nodeCounter++}`}
            className="drawio-diagram"
            dangerouslySetInnerHTML={{ __html: diagramHtml }}
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
        'video', 'audio', 'source',
        'area', 'base', 'col', 'embed', 'input', 'link', 'meta', 'param', 'track', 'wbr'
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
