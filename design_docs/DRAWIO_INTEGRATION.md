# Draw.io Integration for TipTap Editor

## Overview

Integrate draw.io into the TipTap editor so users can create and edit diagrams within wiki pages. Follows the pattern of the existing Mermaid extension and the [VS Code draw.io plugin](https://github.com/hediet/vscode-drawio).

## Scope

**In scope:**
- Insert diagrams via toolbar button
- Edit diagrams in a full-screen dialog with the complete draw.io UI
- View diagrams as server-rendered SVG
- Diagrams inside restricted blocks (permission-aware)
- Sensible defaults, no configuration UI

**Out of scope:**
- Custom shape libraries / templates
- Configuration options (themes, grid, etc.)
- Export/import of individual diagrams
- Diagram search indexing
- Testing draw.io features themselves

## Architecture Decisions

### Storage: Inline XML in HTML
```html
<div class="drawio-diagram" data-diagram-xml="[base64 encoded XML]"></div>
```
- Works naturally with restricted blocks — XML filtered at render time
- No separate data model needed
- Diff-friendly for version history and backups

### Editing: Full-screen dialog with iframe
- Full draw.io UI in an iframe (`?embed=1&proto=json&noSaveBtn=1&noExitBtn=1`)
- PostMessage API for communication (load XML, export XML)
- Save/Cancel buttons in dialog chrome

### Viewing: Server-side SVG rendering
- Server decodes base64 XML → renders to SVG → injects into HTML
- No client JS needed for viewing
- Restricted diagrams never reach unauthorized clients

### Source: Git submodule
```bash
git submodule add https://github.com/jgraph/drawio.git drawio
ln -s ../drawio/src/main/webapp public/drawio
```

## Components

```
src/components/editor/
├── DrawioExtension.tsx          # TipTap Node definition
├── DrawioView.tsx               # SVG preview + edit button (edit mode)
├── DrawioEditorDialog.tsx       # Full-screen dialog with iframe
└── DrawioClient.ts              # postMessage communication

src/lib/
└── drawio-renderer.ts           # Server-side XML → SVG

src/app/api/drawio/render/
└── route.ts                     # API endpoint for client-side SVG preview
```

### TipTap Node

```typescript
export const DrawioNode = Node.create({
  name: 'drawio',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      diagramXml: {
        default: '',
        parseHTML: el => el.getAttribute('data-diagram-xml') || '',
        renderHTML: attrs => ({ 'data-diagram-xml': attrs.diagramXml }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.drawio-diagram' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'drawio-diagram' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawioView);
  },

  addCommands() {
    return {
      insertDrawio: () => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { diagramXml: '' } }),
    };
  },
});
```

### Communication Protocol

```typescript
// React → iframe
type DrawioAction =
  | { action: 'load'; xml: string; autosave?: 1 }
  | { action: 'export'; format: 'xmlsvg' }
  | { action: 'configure'; config: object };

// iframe → React
type DrawioEvent =
  | { event: 'init' }
  | { event: 'save'; xml: string }
  | { event: 'autosave'; xml: string }
  | { event: 'export'; data: string; format: string; xml: string };
```

### Server-Side SVG Rendering

```typescript
// src/lib/drawio-renderer.ts
export async function renderDrawioToSvg(base64Xml: string): Promise<string> {
  const xml = Buffer.from(base64Xml, 'base64').toString('utf-8');
  // Use puppeteer to load draw.io and export SVG
  const svg = await exportWithHeadlessBrowser(xml);
  return svg;
}

// Integration in server-content-filter.ts
const $ = cheerio.load(html);
for (const el of $('.drawio-diagram').toArray()) {
  const xml = $(el).attr('data-diagram-xml');
  if (xml) $(el).html(await renderDrawioToSvg(xml));
}
```

## Data Flow

```
INSERT:  Toolbar button → insert empty DrawioNode → open dialog → edit → save XML → render SVG preview
EDIT:    Click edit button on diagram → open dialog with existing XML → edit → save → re-render
VIEW:    Server reads HTML → finds .drawio-diagram → renders XML to SVG → serves static HTML
```

## Test Coverage

Single feature file: [`e2e/features/page-editor/draw-io/diagram-features.feature`](../e2e/features/page-editor/draw-io/diagram-features.feature)

5 scenarios covering the essential flows:

| # | Scenario | What it tests |
|---|----------|---------------|
| 1 | Insert diagram from toolbar | Toolbar button → dialog opens → draw.io loads |
| 2 | Can add shapes to diagram | Insert shape → save → renders in view mode |
| 3 | Can edit existing diagram | Open existing → modify → save → changes visible |
| 4 | Cancel editing | Edit → cancel → original unchanged |
| 5 | Can insert diagram inside restricted block | Restricted block + diagram → permission-aware viewing |

## Implementation Tasks

1. **Git submodule setup** — add draw.io, create symlink, verify it loads
2. **Server-side SVG renderer** — `drawio-renderer.ts`, API endpoint, integrate with `server-content-filter.ts`
3. **TipTap extension** — `DrawioExtension.tsx` node definition
4. **View component** — `DrawioView.tsx` with SVG preview + edit button
5. **Editor dialog** — `DrawioEditorDialog.tsx` + `DrawioClient.ts` for postMessage
6. **Toolbar button** — "Insert Diagram" in `TiptapEditor.tsx`
7. **Restricted blocks** — verify diagrams work inside `RestrictedBlock`
8. **E2E tests** — step definitions for the 5 scenarios

## Dependencies

**New:**
- `puppeteer` — server-side SVG rendering
- `cheerio` — HTML manipulation for server-side rendering (may already exist)

**Existing:**
- TipTap, React, Next.js, Prisma

## Security

- iframe sandboxed: `sandbox="allow-scripts allow-same-origin"`
- SVG sanitized before rendering
- Restricted block XML never sent to unauthorized users

## References

- [Draw.io embed mode docs](https://www.drawio.com/doc/faq/embed-mode)
- [VS Code draw.io plugin](https://github.com/hediet/vscode-drawio)
- [Draw.io source](https://github.com/jgraph/drawio)
- [TipTap node views](https://tiptap.dev/guide/node-views/react)
