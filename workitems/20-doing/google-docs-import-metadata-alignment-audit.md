---
id: google-docs-import-metadata-alignment-audit
title: Google Docs Import — Metadata Alignment Audit Report
status: doing
retry_count: 0
priority: medium
created: 2026-06-15
updated: 2026-06-15T12:00:00Z
completed: 
target_release: next
estimate: M
risk: low
tags: [audit, google-docs]
owner: pi
---

# Google Docs Import — Metadata Alignment Audit Report

**Date**: 2026-06-13  
**Scope**: `src/scripts/import/google-docs/` + schema.prisma + existing page creation patterns  
**Purpose**: Verify that the LLM's JSON output for slicing and metadata aligns with current database schema, path-handling logic, and wiki requirements.

---

## 1. Schema Audit (`schema.prisma`)

### Page Model Fields (source of truth)
| Field | Type | Default / Constraint | Required? |
|-------|------|---------------------|-----------|
| `id` | Int | autoincrement PK | Yes (auto) |
| `title` | String | — | **Yes** |
| `content` | String | — | **Yes** |
| `created_at` | DateTime | @default(now()) | No |
| `updated_at` | DateTime | @updatedAt | No |
| `edit_groups` | String[] | — | No (but expected) |
| `view_groups` | String[] | — | No (but expected) |
| `path` | String | — | **Yes** |

### Media Model Fields
| Field | Type | Default / Constraint | Required? |
|-------|------|---------------------|-----------|
| `id` | Int | autoincrement PK | Yes (auto) |
| `filename` | String | — | **Yes** |
| `mimetype` | String | — | **Yes** |
| `data` | Bytes | — | **Yes** |
| `createdAt` | DateTime | @default(now()) | No |
| `userId` | String FK → User.id | — | **Yes** |

### ⚠️ Critical Finding: `visibility` field does NOT exist on Page model
The design doc states *"New pages default to visibility: owner for user review"*, but the schema uses group-based access control (`edit_groups`, `view_groups`) instead. The LLM JSON output must map its concept of "visibility" into these two array fields, not a single string field that doesn't exist in the DB.

---

## 2. Current Code vs Schema — Gap Analysis

### orchestrator.ts → `createWikiPages()`
```typescript
await prisma.page.create({
  data: {
    title: page.title,   // ✅ matches schema
    content: page.content,// ✅ matches schema  
    path: page.path,      // ✅ matches schema (but see Path Logic issues below)
  }
});
```

**Missing fields:**
| Field | Status | Impact | Recommendation |
|-------|--------|--------|----------------|
| `edit_groups` | **NOT SET** → defaults to empty array [] | Pages created with no editors — impossible to edit via wiki UI | Set default: `[importer]` or prompt for user group; design doc says "owner" concept should map here |
| `view_groups` | **NOT SET** → defaults to empty array [] | Pages invisible even to owner (wiki likely requires at least one view_group) | Set default per design doc's visibility=owner semantics: e.g., `[importer_username]`. If no username available, use a safe fallback. |

### image-importer.ts → `uploadImage()`
```typescript
const media = await prisma.media.create({
  data: { filename, mimetype, data: imageData, userId } // ✅ all fields present
});
```

**✅ This is correct.** However there are two concerns:

1. **`userId` resolution**: The code does `prisma.user.findFirst()` — if no users exist in the DB (fresh install), this throws a cryptic error during import instead of giving actionable guidance. Add explicit check with user-friendly message.
2. **MIME type detection**: Uses extension-based heuristic only, not file-content sniffing. Acceptable for known image formats but could be improved.

---

## 3. Path Logic Verification

### Current path generation (parser.ts)
```typescript
// Level-1 headings → top-level slug: [slug]
// Level-2 headings → nested under level-1: [level1_slug, slug]
pathStack.join('/') // e.g., "my-topic/subtopic" or "" for title-less docs
```

### Issues found with path handling:

| Issue | Severity | Detail | Recommendation |
|-------|----------|--------|----------------|
| **Empty paths** | High | Documents without h1/h2 produce `path: ''` (empty string). The schema requires a non-null String, and empty strings may collide or be rejected by the wiki's routing logic. | Generate fallback path from document title slugified + timestamp suffix for uniqueness. E.g., `"untitled-20260613"`. |
| **No collision detection** | Critical | If two imported documents contain pages with identical paths, `prisma.page.create()` will succeed silently — the wiki's routing likely uses path as a unique key. This causes duplicate/conflicting page access. | Add pre-import uniqueness check: query existing pages by path before creating; append numeric suffix on collision (e.g., `/topic` → `/topic-1`). Design doc explicitly requires "path-based hierarchy and collision handling". |
| **No LLM-driven paths** | Medium | The current parser builds paths from heading structure, not from an LLM. Per the design doc: *"LLM generates full, unique path/to/page strings"*. This is expected as Phase 2 functionality — but the types/schema must be ready for it. | Update `GoogleDocsPage.path` type to accept pre-computed LLM paths; add validation that LLM-generated paths match wiki conventions (lowercase-slug format). |
| **Path normalization** | Low | No canonicalization of generated paths: no trailing slash removal, no duplicate separator handling (`/topic//sub`) — though `slugify()` prevents most issues. | Add a single path-sanitization function that normalizes all paths before DB write. |

---

## 4. Metadata Field Mapping (LLM JSON → Database)

### Design doc requirements for LLM output:
- Page titles ✅ already in types.ts as `title`  
- Hierarchical full paths (`path/to/page`) ⚠️ currently generated by parser, not LLM — **Phase 2** target
- Visibility/permissions ❌ NOT YET mapped to edit_groups / view_groups arrays

### Required mapping for Phase 2 (LLM output → DB):

```typescript
// Expected LLM JSON schema shape:
interface LLMSliceOutput {
  title: string;          // maps to Page.title ✅
  content: string;        // raw HTML/markdown — NO ALTERATION per design doc constraints ✅
  path: string;           // e.g., "my-topic/subtopic" → maps to Path.page.path ⚠️ Phase 2
  
  metadata?: {            // NEW fields needed for LLM output type definition
    visibility?: 'public' | 'owner' | 'group';   // must map to view_groups[] / edit_groups[]
    targetGroups?: string[];                       // group names that should get access
    
    // Optional but recommended:
    sourceDocTitle?: string;  // for provenance tracking  
    sourceFile?: string;      // name of the uploaded source file
    
    // Slicing metadata — content fidelity verification:
    sliceIndex?: number;      // which page in document this represents
    totalSlices?: number;     // expected count of pages from LLM
  };
}

// Mapping function needed for Phase 2:
function mapVisibilityToGroups(visibility, targetGroups): { edit_groups: string[], view_groups: string[] } {
  switch (visibility) {
    case 'public':   return { edit_groups: ['admin'],      view_groups: ['public'] };
    case 'owner':    return { edit_groups: [importerUser], view_groups: [importerUser] }; // design doc default
    case 'group':    return { 
                       edit_groups: targetGroups || [],     // or same as import group for safety  
                       view_groups:  targetGroups || []    
                     };
    default:         return { edit_groups: ['admin'],      view_groups: [importerUser] };
  }
}
```

### ⚠️ Current types.ts is missing metadata fields
The `GoogleDocsPage` interface only has `{ title, content, path }`. For Phase 2 LLM integration, it needs to expand. See **Recommendation #1** below.

---

## 5. Content Fidelity (LLM "No-Alteration" Guarantee)

### ✅ Currently compliant:
- The parser uses `remark` → HTML transformation — this is structural parsing only, no content rewriting by an LLM.
- Image URL replacement happens via cheerio DOM manipulation on the already-parsed HTML string — original text/structure preserved.

### ⚠️ Risk area for Phase 2 (LLM slicing):
When the design doc's semantic-slicing feature is implemented:
1. The LLM must output **exact** content boundaries without modifying wording, formatting, or meaning
2. There should be a post-import verification step that compares original text segments against stored page.content to confirm zero alteration
3. Consider adding `content_hash` (from PageVersion model) on initial creation for future integrity checks

---

## 6. Test Coverage Audit

### verify-implementation.ts — Integration test
| Check | Status | Detail |
|-------|--------|--------|
| Pages created with correct titles? | ✅ Yes | Checks `title: 'Test Page 1'` and `'Test Page 2'` exist |
| Images uploaded to DB? | ✅ Yes | Verifies media record exists by filename |
| Image URLs replaced in content? | ✅ Yes | Checks `/api/images/{id}` substitution |

### ❌ Missing test coverage:
- **edit_groups / view_groups**: No assertion that these are set. Pages created with empty arrays will be broken per wiki conventions (see e2e tests which always specify groups).
- **Path uniqueness/collision**: Not tested at all. Two pages or two imports could produce identical paths.
- **Empty path handling**: Test document without headings → `path: ''` is never validated against schema constraints.
- **userId resolution failure**: No test for the case where no users exist in DB (fresh install).

### verify-implementation.test.ts — Unit test with mock
| Issue | Severity | Detail |
|-------|----------|--------|
| Mock prisma doesn't validate field shapes | High | `page.create` returns `{ id: 1, title, content, path }` but omits edit_groups/view_groups entirely. The real Prisma client would fail or create invalid records silently. |

---

## 7. Other Import Scripts — Comparison for Best Practices

### import-from-filesystem.ts
This script already handles metadata correctly:
```typescript
// Reads YAML frontmatter from files and maps to page fields
case 'edit_groups':   metadata.edit_groups = value.split(', ').map(g => g.trim()).filter(Boolean); break;
case 'view_groups':   metadata.view_groups  = value.split(', ').map(g => g.trim()).filter(Boolean); break;
```

**Recommendation**: Adopt the same YAML frontmatter + group-mapping pattern for Phase 2 LLM output. The import-from-filesystem script is a good reference implementation.

---

## Summary of Findings & Recommendations

### 🔴 Critical (must fix before Phase 2)
1. **Missing edit_groups/view_groups on page creation** — `createWikiPages()` creates pages with empty access arrays, making them unusable in the wiki UI. Add defaults per design doc's "visibility: owner" requirement.
2. **No path collision detection** — Duplicate paths will corrupt the wiki hierarchy. Implement pre-create uniqueness check + suffix-based resolution.

### 🟡 Important (should fix before Phase 2)  
3. **Empty path fallback missing** — Documents without h1/h2 headings produce `path: ''`. Generate a slugified title-fallback with timestamp for uniqueness.
4. **types.ts needs metadata expansion** — Add visibility/group fields to `GoogleDocsPage` interface so it's ready for Phase 2 LLM output schema alignment.

### 🟢 Low-priority (nice-to-have)  
5. **User existence check before import** — Make the "no user found" error actionable with guidance on seeding users first.
6. **Content hash verification post-import** — Add a step to verify original content wasn't altered by any processing pipeline stage.

---

## LLM JSON Schema (Draft for Phase 2)

Based on this audit, here is the recommended strict JSON schema that the LLM's output must conform to:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["pages"],
  "properties": {
    "pages": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/page"
      }
    },
    "_meta": {
      "$ref": "#/$defs/meta"
    }
  },
  "$defs": {
    "page": {
      "type": "object",
      "required": ["title", "content", "path"],
      "properties": {
        "title": { 
          "type": "string", 
          "minLength": 1,
          "description": "Human-readable page title"
        },
        "content": { 
          "type": "string", 
          "description": "Raw HTML content — must not alter original text/structure"
        },
        "path": { 
          "type": "string", 
          "pattern": "^([a-z0-9]+(-[a-z0-9]+)*/)*[a-z0-9]+$|^$",
          "description": "Full hierarchical wiki path, e.g. 'my-topic/subtopic'. Lowercase slug format only."
        },
        "visibility": { 
          "type": "string", 
          "enum": ["public", "owner"],
          "default": "owner",
          "description": "Visibility level — maps to edit_groups/view_groups on DB write"
        }
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "sourceDocumentTitle": { "type": "string" },
        "totalPagesExpected": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

This schema ensures:
- **Schema alignment**: All required fields match `schema.prisma` Page model exactly (title, content, path)
- **Path validation**: Regex enforces lowercase-slug format consistent with wiki routing and existing slugify logic  
- **Visibility mapping**: Enum values map cleanly to the edit_groups/view_groups arrays already in the schema
- **Content fidelity constraint**: Schema description explicitly states no alteration — LLM prompts should reinforce this

---

*Audit complete. All findings traceable to specific files: `schema.prisma`, `src/scripts/import/google-docs/orchestrator.ts`, `parser.ts`, `types.ts`, `image-importer.ts`.*
