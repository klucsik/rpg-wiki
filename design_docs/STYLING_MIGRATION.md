# Styling Migration Plan

## Context

This document covers the full styling refactor for rpg-wiki, **excluding the debug class names** which are documented separately in `DEBUG_CLASSES.md`.

### Decisions already made

| Concern | Decision |
|---|---|
| Scope | Full overhaul — migrate all files |
| Design tokens | Tailwind v4 `@theme` block in `globals.css` |
| Component styling | Tailwind utility classes only — delete all `.module.css` files |
| Dark mode | Always-dark — remove dead light-mode CSS |

### Current problems being solved

1. **Three styling systems coexist** — Tailwind utilities in JSX, CSS Modules (`.module.css`), and global `.prose` CSS. No single mental model.
2. **No `cn()` helper** — conditional classes are built with template literal string concatenation, which is fragile and hard to read.
3. **`styleTokens` object** in `PageEditor.tsx` — an ad-hoc shared token attempt that leaks across files and was never adopted consistently.
4. **Hardcoded hex values** — `#1f2937`, `#374151`, `#233779` etc. scattered in CSS modules mean there is no single place to change a color.
5. **~150 `!important` declarations** in `globals.css` — caused by specificity conflicts between Tailwind and custom `.prose` rules. Makes overriding prose styles in future nearly impossible.
6. **Dead light-mode CSS** — `prefers-color-scheme: dark` block in `globals.css` sets `--background`/`--foreground` variables that are never used by any component.

---

## Phases

| # | Name | Files changed |
|---|---|---|
| 1 | Foundation: `cn()` + `@theme` tokens + clean globals | `globals.css`, new `src/lib/cn.ts`, `package.json` |
| 2 | Delete `styleTokens` | `PageEditor.tsx`, `GroupsAdminPage` (via `app/groups/page.tsx`) |
| 3 | Migrate `PageView.module.css` | `PagesView.tsx`, delete `PageView.module.css` |
| 4 | Migrate `Editor.module.css` | `TiptapEditor.tsx`, delete `Editor.module.css` |
| 5 | Migrate `RestrictedBlock.module.css` | `RestrictedBlockEditorView.tsx`, `RestrictedBlockView.tsx`, `RestrictedBlockPlaceholderView.tsx`, delete `RestrictedBlock.module.css` |
| 6 | Fix `globals.css` prose `!important` | `globals.css` |

Each phase is independently shippable. Do them in order — Phase 1 must come first, the rest are independent of each other after that.

---

## Phase 1 — Foundation

### 1a. Install `clsx`

`clsx` is a tiny utility for combining class names conditionally. It is the standard in the Tailwind/React ecosystem.

```bash
npm install clsx
```

No other new dependencies are needed.

### 1b. Create `src/lib/cn.ts`

```ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
```

**Usage examples:**

```tsx
// Before (template literal string concatenation):
className={`w-full px-4 py-2 border ${pathError ? 'border-red-500' : 'border-gray-700'} bg-gray-900 ...`}

// After (cn()):
className={cn(
  "w-full px-4 py-2 bg-gray-900",
  pathError ? "border-red-500 focus:ring-red-500" : "border-gray-700 focus:ring-indigo-700"
)}
```

`cn()` accepts strings, arrays, and objects (`{ "class-name": condition }`). All falsy values are ignored automatically.

### 1c. Rewrite `globals.css` — token block, base styles, remove light mode

Replace the entire `globals.css` with the following. The structure is:

1. Tailwind import
2. `@theme` block — all design tokens
3. Layer ordering declaration
4. Base styles for `html`/`body`
5. Image alignment utilities (`data-align`)
6. Prose typography (in a named layer, no `!important` — see Phase 6)

**New `globals.css`:**

```css
/* =========================
   Tailwind Base Import
   ========================= */
@import "tailwindcss";

/* =========================
   Layer ordering
   (wiki-typography must come after utilities so it wins without !important)
   ========================= */
@layer base, utilities, wiki-typography;

/* =========================
   Design Tokens (@theme)
   ========================= */
@theme {
  /* --- Surface colors (backgrounds) --- */
  --color-surface:         #111827;  /* gray-900 — main page background */
  --color-surface-raised:  #1f2937;  /* gray-800 — cards, toolbar */
  --color-surface-border:  #374151;  /* gray-700 — borders */
  --color-surface-muted:   #4b5563;  /* gray-600 — hover states on surface */

  /* --- Brand / accent --- */
  --color-brand:           #4f46e5;  /* indigo-600 — primary action */
  --color-brand-hover:     #4338ca;  /* indigo-700 — primary action hover */
  --color-brand-subtle:    #c7d2fe;  /* indigo-200 — text on dark surfaces */

  /* --- Text --- */
  --color-text-primary:    #ededed;  /* near-white — main body text */
  --color-text-secondary:  #c7d2fe;  /* indigo-200 — secondary / toolbar text */
  --color-text-muted:      #9ca3af;  /* gray-400 — metadata, timestamps */
  --color-text-faint:      #6b7280;  /* gray-500 — footer text */

  /* --- Links --- */
  --color-link:            #60a5fa;  /* blue-400 — hyperlinks on dark bg */
  --color-link-hover:      #93c5fd;  /* blue-300 — link hover */
  --color-link-visited:    #a78bfa;  /* violet-400 — visited links */
  --color-link-active:     #3b82f6;  /* blue-500 — active / focus ring */

  /* --- Semantic states --- */
  --color-danger:          #dc2626;  /* red-600 — destructive actions */
  --color-danger-hover:    #b91c1c;  /* red-700 — destructive hover */
  --color-warning:         #d97706;  /* amber-600 — warning accents */
  --color-success:         #16a34a;  /* green-600 — success states */

  /* --- Restricted blocks (custom, not in Tailwind palette) --- */
  --color-restricted-bg:          #233779;  /* deep navy — restricted block background */
  --color-restricted-panel-bg:    #232b4a;  /* darker navy — groups panel background */
  --color-restricted-action:      #4f5b93;  /* slate-blue — restricted block buttons */

  /* --- Table resize handle --- */
  --color-resize-handle:         #3b82f6;  /* blue-500 */
  --color-resize-handle-active:  #1d4ed8;  /* blue-700 */

  /* --- Fonts --- */
  --font-sans: var(--font-geist-sans), Arial, Helvetica, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

/* =========================
   Base Styles
   ========================= */
html, body {
  height: 100%;
  overflow: hidden;
}

body {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
}

/* =========================
   Image alignment (set by TipTap data-align attribute)
   ========================= */
img[data-align="left"]   { display: block; margin-left: 0;    margin-right: auto; }
img[data-align="center"] { display: block; margin-left: auto; margin-right: auto; }
img[data-align="right"]  { display: block; margin-left: auto; margin-right: 0;    }

/* =========================
   Prose content (wiki view mode)
   See Phase 6 for the full prose block.
   ========================= */
@layer wiki-typography {
  /* Paste the full rewritten prose rules here during Phase 6 */
}
```

**What was removed and why:**

| Removed | Reason |
|---|---|
| `:root { --background: #ffffff; --foreground: #171717; }` | App is always-dark; these variables were unused |
| `@media (prefers-color-scheme: dark) { :root { ... } }` | Always-dark; dead code |
| `body { background: var(--background); color: var(--foreground); }` | Replaced with explicit dark tokens |
| All `!important` in prose rules | Moved to `@layer wiki-typography` in Phase 6, making them unnecessary |

---

## Phase 2 — Delete `styleTokens`

`styleTokens` is exported from `PageEditor.tsx` and consumed in two places:

1. `PageEditor.tsx` itself — many `className={styleTokens.xyz}` usages
2. `app/groups/page.tsx` — imports and uses `styleTokens.card`, `styleTokens.button`

### Replacement mapping

Every `styleTokens.*` reference must be replaced with the equivalent inline class string. The table below is the authoritative mapping.

| Token | Inline Tailwind classes |
|---|---|
| `styleTokens.card` | `"bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800 max-w-2xl mx-auto"` |
| `styleTokens.header` | `"flex items-center justify-between gap-4 px-8 py-4 bg-gray-800 border-b border-gray-700 sticky top-0 z-40"` |
| `styleTokens.label` | `"text-xs text-indigo-200 font-semibold mb-1"` |
| `styleTokens.input` | `"px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1"` |
| `styleTokens.button` | `"bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 text-lg border border-indigo-700"` |
| `styleTokens.tag` | `"bg-indigo-700 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1"` |
| `styleTokens.tagRemove` | `"ml-1 text-red-200 hover:text-red-400"` |
| `styleTokens.groupList` | `"flex flex-wrap gap-1 mb-1"` |
| `styleTokens.groupButton` | `"bg-gray-700 text-indigo-100 px-2 py-0.5 rounded text-xs hover:bg-indigo-800"` |

### Steps

1. In `PageEditor.tsx`: replace every `styleTokens.xyz` ref with the string from the table above.
   - Where the token is concatenated with extra classes (e.g. `styleTokens.input + " w-full"`), merge into a single string: `"px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 w-full"`.
   - Use `cn()` where the base value is combined with a conditional expression.
2. In `app/groups/page.tsx`: same — replace `styleTokens.card` and `styleTokens.button` with the inline strings.
3. Delete the `export const styleTokens = { ... }` block at the top of `PageEditor.tsx`.
4. Remove the import of `styleTokens` from `app/groups/page.tsx`.

---

## Phase 3 — Migrate `PageView.module.css`

**File to delete:** `src/features/pages/PageView.module.css`  
**File to update:** `src/features/pages/PagesView.tsx`

### Class-by-class migration

| CSS Module class | Tailwind replacement |
|---|---|
| `.container` | `"min-h-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex relative overflow-hidden max-w-[100vw]"` |
| `.main` | `"flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-screen w-full overflow-hidden max-w-full overscroll-contain box-border"` |
| `.proseBox` | `"bg-gray-900/80 rounded-lg p-4 shadow-xl border border-gray-800 w-full flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden max-w-full box-border"` |
| `.header` | `"flex items-start justify-between mb-4 gap-4 min-w-0 max-sm:flex-col max-sm:items-stretch max-sm:gap-3"` |
| `.path` | `"text-xs text-gray-400 mb-1 font-mono bg-gray-800 px-2 py-0.5 rounded"` |
| `.pageFooter` | `"mt-6 text-xs text-gray-500"` |
| `.noAccess` | `"flex items-center justify-center min-h-screen"` |
| `.noAccessBox` | `"bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-xl text-center"` |
| `.editButton` | `"bg-amber-700 hover:bg-amber-800 text-white py-1 px-3 rounded-md font-semibold text-sm shadow transition-colors"` |

**Note on `.header`:** The original CSS used `@media (max-width: 640px) { flex-direction: column; ... }`. In Tailwind v4, the `max-sm:` prefix is the equivalent (`max-sm:` = `@media (max-width: 639px)`).

### Steps

1. Remove `import styles from "./PageView.module.css"` from `PagesView.tsx`.
2. For each element using `styles.xyz`, replace the `className` with the inline string from the table.
3. Where class names are combined with other Tailwind utilities, merge and use `cn()` if conditional logic is present.
4. Delete `PageView.module.css`.

---

## Phase 4 — Migrate `Editor.module.css`

**File to delete:** `src/components/editor/Editor.module.css`  
**File to update:** `src/components/editor/TiptapEditor.tsx`

### Class-by-class migration

#### Layout classes

| CSS Module class | Tailwind replacement |
|---|---|
| `.editorRoot` | `"flex flex-col h-full w-full min-h-0"` |
| `.editorOffset` | `"flex-1 min-h-0 overflow-y-auto"` |
| `.editorContent` | `"h-full w-full bg-transparent p-4 text-indigo-200 cursor-text flex flex-col"` |
| `.toolbar` | `"flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 z-20 overflow-x-auto"` |
| `.tableControls` | `"flex items-center gap-2 ml-4"` |
| `.imageControls` | `"flex items-center gap-2 ml-4"` |

**Note on `.toolbar`:** The original CSS had `left: 320px; right: 0; top: 64px` properties with no `position` declaration — these were dead code and should not be carried over.

#### Toolbar control classes

| CSS Module class | Tailwind replacement |
|---|---|
| `.toolbarSelect` | `"min-w-[120px] px-2 py-1 rounded bg-gray-900 text-indigo-200 border border-gray-700 outline-none text-sm"` |
| `.toolbarButton` | `"px-2 py-1 rounded bg-gray-700 text-indigo-200 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"` |
| `.toolbarButtonActive` | `"bg-indigo-600 text-white"` — applied **additionally** alongside `.toolbarButton` via `cn()` |
| `.toolbarButtonStrike` | `"line-through"` |
| `.toolbarButtonItalic` | `"italic"` |
| `.toolbarButtonBold` | `"font-bold"` |
| `.toolbarButtonUnderline` | `"underline"` |
| `.imageWidthRange` | `"w-32"` |
| `.imageWidthInput` | `"w-16 px-1 py-0.5 rounded bg-gray-900 text-indigo-200 border border-gray-700 text-sm"` |
| `.imageAlignLabel` | `"text-indigo-200 text-xs ml-2"` |

**Pattern for active toolbar buttons:** The existing code applies both a base class and an active class. Convert using `cn()`:

```tsx
// Before
className={`${styles.toolbarButton} ${editor.isActive("bold") ? styles.toolbarButtonActive : ""}`}

// After
className={cn(
  "TiptapEditor-boldBtn px-2 py-1 rounded bg-gray-700 text-indigo-200 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 font-bold",
  editor.isActive("bold") && "bg-indigo-600 text-white"
)}
```

#### Editor content child styles (links, lists, tables, cursors)

The `.editorContent a`, `.editorContent ul`, `.editorContent table`, etc. rules **cannot** be moved into JSX class names because they target child elements generated by ProseMirror/TipTap's internal rendering — TipTap writes the HTML, not our JSX.

These rules must be moved to `globals.css` under a new class `.tiptap-content` (replacing `.editorContent` as the selector), placed inside `@layer wiki-typography`.

The element using `styles.editorContent` in `TiptapEditor.tsx` should receive the class `tiptap-content` as a plain string instead.

**Full list of rules to relocate into `globals.css @layer wiki-typography`:**

```css
@layer wiki-typography {
  /* --- TipTap editor content area (child elements written by ProseMirror) --- */

  .tiptap-content a {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
    transition: color 0.2s ease;
  }
  .tiptap-content a:hover   { color: var(--color-link-hover); }
  .tiptap-content a:visited { color: var(--color-link-visited); }

  .tiptap-content .wiki-link {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
    transition: color 0.2s ease;
    cursor: pointer;
  }
  .tiptap-content .wiki-link:hover   { color: var(--color-link-hover); }
  .tiptap-content .wiki-link:visited { color: var(--color-link-visited); }

  .tiptap-content ul         { list-style-type: disc;    margin: 0.75rem 0; padding-left: 1.5rem; }
  .tiptap-content ol         { list-style-type: decimal; margin: 0.75rem 0; padding-left: 1.5rem; }
  .tiptap-content ul ul      { list-style-type: circle;  margin: 0.25rem 0; }
  .tiptap-content ul ul ul   { list-style-type: square; }
  .tiptap-content ol ol      { list-style-type: lower-alpha; margin: 0.25rem 0; }
  .tiptap-content ol ol ol   { list-style-type: lower-roman; }
  .tiptap-content li         { margin: 0.25rem 0; color: var(--color-text-secondary); }

  .tiptap-content .ProseMirror { min-height: 500px; height: 100%; outline: none; }

  .tiptap-content table        { border-collapse: collapse; table-layout: fixed; width: auto; margin: 1rem 0; overflow: hidden; border: 2px solid var(--color-surface-border); border-radius: 0.375rem; }
  .tiptap-content table td,
  .tiptap-content table th     { min-width: 1em; border: 1px solid var(--color-surface-border); padding: 0.5rem 0.75rem; vertical-align: top; box-sizing: border-box; position: relative; background: var(--color-surface-raised); cursor: text; }
  .tiptap-content table th     { background: var(--color-surface-border); font-weight: bold; text-align: left; color: #e5e7eb; }
  .tiptap-content table td:hover,
  .tiptap-content table th:hover { background-color: var(--color-surface-border); }
  .tiptap-content table th:hover { background-color: var(--color-surface-muted); }
  .tiptap-content table .selectedCell       { background-color: #1e40af; }
  .tiptap-content table .selectedCell::after {
    z-index: 2; position: absolute; content: ""; inset: 0;
    background: rgba(59,130,246,0.5); pointer-events: none;
  }
  .tiptap-content table .column-resize-handle {
    position: absolute; right: -2px; top: 0; bottom: -2px; width: 4px;
    background-color: var(--color-resize-handle);
    pointer-events: auto; opacity: 0; transition: opacity 0.2s ease; cursor: col-resize; z-index: 10;
  }
  .tiptap-content table:hover .column-resize-handle { opacity: 1; }
  .tiptap-content table .column-resize-handle.active {
    opacity: 1; background-color: var(--color-resize-handle-active);
  }
  .tiptap-content table p { margin: 0; }

  .tiptap-content.resize-cursor  { cursor: col-resize; }
}
```

### Steps

1. In `TiptapEditor.tsx`, remove `import styles from "./Editor.module.css"`.
2. Replace every `styles.xyz` reference with the inline class strings from the tables above, using `cn()` for conditional combinations.
3. Replace `styles.editorContent` usage with the plain string `"tiptap-content ..."` (adding remaining layout classes inline).
4. Add the `.tiptap-content` CSS block to `globals.css` inside `@layer wiki-typography` (as shown above).
5. Delete `Editor.module.css`.

---

## Phase 5 — Migrate `RestrictedBlock.module.css`

**File to delete:** `src/components/editor/RestrictedBlock.module.css`  
**Files to update:**
- `src/components/editor/RestrictedBlockEditorView.tsx`
- `src/components/editor/RestrictedBlockView.tsx`
- `src/components/editor/RestrictedBlockPlaceholderView.tsx`

### Class-by-class migration

The custom colors (`#233779`, `#232b4a`, `#4f5b93`) are not in Tailwind's palette. After Phase 1, they are available as `--color-restricted-bg`, `--color-restricted-panel-bg`, and `--color-restricted-action`. Use them with Tailwind's arbitrary value syntax: `bg-[var(--color-restricted-bg)]`.

| CSS Module class | Tailwind replacement |
|---|---|
| `.restrictedBlock` | `"bg-[var(--color-restricted-bg)] p-3 rounded-md my-3"` |
| `.restrictedTitle` | `"font-semibold mb-1.5"` |
| `.revealButton` | `"absolute top-2.5 right-2.5 bg-gray-700 text-white rounded-md px-4 py-1 font-semibold shadow transition-colors cursor-pointer z-[1]"` |
| `.revealButtonActive` | applied additionally via `cn()`: `"bg-indigo-600"` |
| `.restrictedNoAccess` | `"opacity-70 text-gray-400 mt-2"` |
| `.restrictedBlockEditor` | `"bg-[var(--color-restricted-bg)] p-2 border border-dashed border-red-600 relative rounded-md my-2"` |
| `.restrictedBlockHeader` | `"flex items-center justify-between mb-2"` |
| `.restrictedTitleInput` | `"font-bold text-white bg-black/20 border border-red-600 rounded px-2 py-0.5 min-w-[120px]"` |
| `.restrictedGroupsPanel` | `"relative z-10 bg-[var(--color-restricted-panel-bg)] border border-[var(--color-restricted-action)] rounded p-2 min-w-[120px] shadow-lg"` |
| `.restrictedGroupsLabel` | `"block text-indigo-100 text-[13px] mb-0.5"` |
| `.restrictedGroupsSave` | `"mt-2 bg-[var(--color-restricted-action)] text-white rounded px-4 py-1 font-medium cursor-pointer min-w-[80px] h-8 text-sm shadow"` |
| `.restrictedGroupsEdit` | same as `.restrictedGroupsSave` but add `"mr-2"` |
| `.restrictedRemove` | `"bg-gray-700 text-indigo-100 rounded px-4 py-1 font-medium cursor-pointer min-w-[80px] h-8 text-sm shadow"` |

**Note on `.revealButton`:** The original used `position: absolute` purely via the CSS module, which has no JSX equivalent. Add Tailwind `relative` to the parent container and `absolute` is already in the replacement above.

**Note on `PlaceholderContentView.tsx`:** This component is in `src/features/pages/PlaceholderContentView.tsx` and uses hardcoded CSS class *names* from the module (like `className="restrictedBlock"`) rather than `styles.xyz` references — these are string literals referencing the old module class names directly. After deletion, they become dangling class names with no styles. Replace them with the inline Tailwind equivalents from the table above.

### Steps

1. In each of the three files, remove `import styles from "./RestrictedBlock.module.css"`.
2. Replace every `styles.xyz` reference with the inline class strings from the table above, using `cn()` for the `revealButton`/`revealButtonActive` conditional combination.
3. In `PlaceholderContentView.tsx`, find any hardcoded class name strings matching the CSS module class names and replace them too.
4. Also check `globals.css` — there is a `.restricted-block-html` rule (note the hyphen-case) used by the HTML parser. This rule should stay in `globals.css` as-is (it targets serialised HTML content, not JSX), but convert its hardcoded color to use the token: `background: var(--color-restricted-bg)`.
5. Delete `RestrictedBlock.module.css`.

---

## Phase 6 — Fix `globals.css` prose `!important`

### Why `!important` was needed

The `.prose` and `.prose-invert` styles are custom CSS. They were fighting specificity battles against Tailwind's utility classes that happen to be on ancestor elements. Rather than winning via specificity, someone added `!important` to force the rules through.

### The fix — `@layer wiki-typography`

Tailwind v4 uses a CSS `@layer` cascade. Styles in a layer declared **later** in the `@layer` statement win over those declared earlier.

Phase 1 already adds this line to `globals.css`:

```css
@layer base, utilities, wiki-typography;
```

Because `wiki-typography` is listed after `utilities`, all rules inside `@layer wiki-typography` automatically win over Tailwind utility classes — **without any `!important`**.

### What to do

1. Move all `.prose` and `.prose-invert` rules into `@layer wiki-typography { }` in `globals.css`.
2. Remove every `!important` declaration from those rules.
3. Replace every hardcoded hex value in those rules with the corresponding token variable from Phase 1.

### Hex-to-token reference for prose rules

| Current value | Token |
|---|---|
| `#ededed` (text color) | `var(--color-text-primary)` |
| `#60a5fa` (link) | `var(--color-link)` |
| `#93c5fd` (link hover) | `var(--color-link-hover)` |
| `#a78bfa` (link visited) | `var(--color-link-visited)` |
| `#3b82f6` (prose light link / resize handle) | `var(--color-link-active)` |
| `#1d4ed8` (link hover light / resize handle active) | `var(--color-resize-handle-active)` |
| `#7c3aed` (light-mode visited — remove this, app is always dark) | delete the rule |
| `#374151` (table border / blockquote / th bg) | `var(--color-surface-border)` |
| `#1f2937` (pre bg / table td bg) | `var(--color-surface-raised)` |
| `#111827` (table even-row bg) | `var(--color-surface)` |
| `#4b5563` (nested table border) | `var(--color-surface-muted)` |
| `#9ca3af` (blockquote border invert) | `var(--color-text-muted)` |
| `#6b7280` (blockquote border) | `var(--color-text-faint)` |
| `#e5e7eb` (th color, pre code color) | keep as `#e5e7eb` (gray-200, no semantic token needed) or use `text-gray-200` |
| `#d1d5db` (td color) | keep as `#d1d5db` (gray-300) |
| `#f3f4f6` (code bg light — only used in non-invert `.prose code`) | this style is for light mode, which is being removed. Replace with `var(--color-surface-raised)` |
| `#374151` (invert code bg) | `var(--color-surface-border)` |
| `#3b82f6` (resize handle) | `var(--color-resize-handle)` |
| `#1d4ed8` (resize handle active) | `var(--color-resize-handle-active)` |

### Light-mode prose rules to remove entirely

The original `globals.css` had duplicate rules for light vs dark context via `.prose` vs `.prose-invert`. Since the app is always-dark:

- All `.prose-invert` rules are now the **only** rules — rename them to `.prose`.
- The original `.prose` (non-invert) rules with light-background values (e.g. white code backgrounds, dark link colors) should be **deleted**.
- Specifically remove:
  - `.prose a { color: #3b82f6 }` — this was the light-mode link color (dark blue on white). Replace with `var(--color-link)` (blue-400, bright, for dark bg).
  - `.prose a:hover { color: #1d4ed8 }` — same rationale, delete.
  - `.prose a:visited { color: #7c3aed }` — light-mode visited color, delete.
  - `.prose code { background-color: #f3f4f6 }` — light gray bg, delete. The `.prose-invert code` rule (dark bg) becomes the `.prose code` rule.

### After Phase 6, the full prose block structure should be:

```css
@layer wiki-typography {
  /* --- prose: overflow guards (structural, always needed) --- */
  .prose { max-width: none; overflow-x: hidden; word-wrap: break-word; overflow-wrap: break-word; }
  .prose * { max-width: 100%; }
  .prose pre { overflow-x: auto; max-width: 100%; }
  .prose table { table-layout: fixed; }
  .prose td, .prose th { word-wrap: break-word; overflow-wrap: break-word; }
  .prose img { max-width: 100%; height: auto; }
  .prose code { word-wrap: break-word; overflow-wrap: break-word; }
  .prose p:empty { min-height: 1em; }

  /* --- Typography --- */
  .prose h1 { font-size: 2.25rem;  font-weight: 800; line-height: 1.1; margin-top: 2rem;    margin-bottom: 1rem;    color: #fff; }
  .prose h2 { font-size: 1.875rem; font-weight: 700; line-height: 1.2; margin-top: 1.75rem; margin-bottom: 0.875rem; color: #fff; }
  .prose h3 { font-size: 1.5rem;   font-weight: 600; line-height: 1.3; margin-top: 1.5rem;  margin-bottom: 0.75rem; color: #fff; }
  .prose h4 { font-size: 1.25rem;  font-weight: 600; line-height: 1.4; margin-top: 1.25rem; margin-bottom: 0.625rem; color: #fff; }
  .prose h5 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin-top: 1rem;    margin-bottom: 0.5rem;  color: #fff; }
  .prose h6 { font-size: 1rem;     font-weight: 600; line-height: 1.4; margin-top: 1rem;    margin-bottom: 0.5rem;  color: #fff; }

  .prose p { line-height: 1.6; color: var(--color-text-primary); }

  /* --- Lists --- */
  .prose ul, .prose ol  { margin-top: 0.75rem; margin-bottom: 0.75rem; padding-left: 1.5rem; color: var(--color-text-primary); }
  .prose ul             { list-style-type: disc; }
  .prose ol             { list-style-type: decimal; }
  .prose ul ul          { list-style-type: circle;      margin-top: 0.25rem; margin-bottom: 0.25rem; }
  .prose ul ul ul       { list-style-type: square; }
  .prose ol ol          { list-style-type: lower-alpha; margin-top: 0.25rem; margin-bottom: 0.25rem; }
  .prose ol ol ol       { list-style-type: lower-roman; }
  .prose li             { margin-top: 0.25rem; margin-bottom: 0.25rem; }

  /* --- Links --- */
  .prose a              { color: var(--color-link); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; transition: color 0.2s ease; }
  .prose a:hover        { color: var(--color-link-hover); }
  .prose a:visited      { color: var(--color-link-visited); }
  .prose .wiki-link     { color: var(--color-link); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; transition: color 0.2s ease; cursor: pointer; }
  .prose .wiki-link:hover   { color: var(--color-link-hover); }
  .prose .wiki-link:visited { color: var(--color-link-visited); }

  /* --- Blockquote / Code / Pre --- */
  .prose blockquote   { border-left: 4px solid var(--color-text-faint); padding-left: 1rem; font-style: italic; margin: 1rem 0; }
  .prose code         { background-color: var(--color-surface-border); color: #e5e7eb; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; }
  .prose pre          { background-color: var(--color-surface-raised); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
  .prose pre code     { background-color: transparent; padding: 0; color: #e5e7eb; }

  /* --- Tables --- */
  .prose table          { border-collapse: collapse; max-width: 100%; margin: 1.5rem 0; border: 2px solid var(--color-surface-border); border-radius: 0.375rem; }
  .prose table td,
  .prose table th       { border: 1px solid var(--color-surface-border); padding: 0.75rem; vertical-align: top; box-sizing: border-box; position: relative; }
  .prose table th       { background: var(--color-surface-border); font-weight: bold; text-align: left; color: #e5e7eb; }
  .prose table td       { background: var(--color-surface-raised); color: #d1d5db; }
  .prose table tr:nth-child(even) td { background: var(--color-surface); }
  .prose table p        { margin: 0; }
  .prose table colgroup,
  .prose table col      { display: none; }
  .prose table span     { display: contents; }
  .prose table table    { margin: 0.5rem 0; border: 1px solid var(--color-surface-muted); }
  .prose table table td,
  .prose table table th { padding: 0.5rem; font-size: 0.875rem; }
  .prose .tableWrapper  { margin: 1.5rem 0; overflow-x: auto; max-width: 100%; }

  /* --- Table resize handles (shared between view and editor) --- */
  .prose table .column-resize-handle {
    position: absolute; right: -3px; top: 0; bottom: -2px; width: 6px;
    background-color: var(--color-resize-handle);
    pointer-events: auto; opacity: 0; transition: opacity 0.2s ease; cursor: col-resize; z-index: 10;
  }
  .prose table:hover .column-resize-handle      { opacity: 1; }
  .prose table .column-resize-handle.active     { opacity: 1; background-color: var(--color-resize-handle-active); }
  .prose table .selectedCell::after {
    z-index: 2; position: absolute; content: ""; inset: 0;
    background: rgba(59,130,246,0.5); pointer-events: none;
  }

  /* --- Restricted block in rendered HTML (from parser) --- */
  .restricted-block-html {
    background: var(--color-restricted-bg);
    padding: 8px;
    border: 1px dashed var(--color-danger);
    border-radius: 6px;
    margin: 8px 0;
  }

  /* --- TipTap live editor content (see Phase 4) --- */
  /* .tiptap-content rules go here ... */
}
```

---

## Checklist for the implementing agent

### Phase 1
- [ ] Run `npm install clsx`
- [ ] Create `src/lib/cn.ts` with `cn()` export
- [ ] Rewrite `globals.css`: add `@theme` block, remove light-mode vars, add `@layer` declaration, keep base styles

### Phase 2
- [ ] Inline all `styleTokens.*` usages in `PageEditor.tsx`
- [ ] Inline all `styleTokens.*` usages in `app/groups/page.tsx`
- [ ] Delete `export const styleTokens = { ... }` from `PageEditor.tsx`

### Phase 3
- [ ] Remove `import styles from "./PageView.module.css"` from `PagesView.tsx`
- [ ] Replace all `styles.` references in `PagesView.tsx` with inline Tailwind strings
- [ ] Delete `src/features/pages/PageView.module.css`

### Phase 4
- [ ] Remove `import styles from "./Editor.module.css"` from `TiptapEditor.tsx`
- [ ] Replace all `styles.` references in `TiptapEditor.tsx` with inline Tailwind strings
- [ ] Replace `styles.editorContent` with `"tiptap-content ..."` (keep layout classes inline)
- [ ] Add `.tiptap-content` CSS block to `globals.css` inside `@layer wiki-typography`
- [ ] Delete `src/components/editor/Editor.module.css`

### Phase 5
- [ ] Remove `import styles from "./RestrictedBlock.module.css"` from all three component files
- [ ] Replace all `styles.` references with inline Tailwind strings
- [ ] Check and update `PlaceholderContentView.tsx` for hardcoded string class names matching the module
- [ ] Update `.restricted-block-html` in `globals.css` to use `var(--color-restricted-bg)`
- [ ] Delete `src/components/editor/RestrictedBlock.module.css`

### Phase 6
- [ ] Move all `.prose` and `.prose-invert` rules into `@layer wiki-typography { }` in `globals.css`
- [ ] Remove all `!important` declarations
- [ ] Replace all hardcoded hex values with token variables (use the hex-to-token table above)
- [ ] Delete all `.prose-invert` duplicate rules; merge into `.prose` (app is always dark)
- [ ] Delete light-mode-only link/code color overrides (listed in "Light-mode prose rules to remove" section above)

### Verification after all phases
- [ ] `npm run build` produces no TypeScript or CSS errors
- [ ] No remaining `import styles from "*.module.css"` anywhere in `src/`
- [ ] No remaining `styleTokens` references anywhere in `src/`
- [ ] No remaining `!important` in `globals.css`
- [ ] No remaining hardcoded hex color strings in `globals.css` (only `var(--color-*)` references)
- [ ] Visual smoke test: view a wiki page, open the editor, open admin panel — check that nothing looks broken
