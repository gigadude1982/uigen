# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + Prisma generate + migrate)
npm run setup

# Development server (uses NODE_OPTIONS to load node-compat.cjs polyfill)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset
```

## Environment

Create a `.env` file with:
```
ANTHROPIC_API_KEY=your-key   # optional — omitting uses the mock provider
JWT_SECRET=your-secret        # optional — defaults to "development-secret-key"
```

## Architecture

UIGen is an AI-powered React component generator. Users chat with Claude to produce React components that render in a live preview pane. No files are written to disk — everything lives in a **virtual file system** held in memory.

### Request Flow

1. User submits a message in `ChatInterface` → `ChatContext` (wraps Vercel AI SDK's `useChat`) sends a POST to `/api/chat`
2. `/api/chat/route.ts` reconstructs the `VirtualFileSystem` from the serialized `files` payload, then streams a `streamText` response using two AI tools: `str_replace_editor` and `file_manager`
3. As tool calls stream back, `FileSystemContext.handleToolCall` mutates the in-memory `VirtualFileSystem` and triggers a `refreshTrigger` increment
4. `PreviewFrame` reacts to `refreshTrigger`, calls `createImportMap` + `createPreviewHTML` from `src/lib/transform/jsx-transformer.ts` to transpile JSX via `@babel/standalone` into blob URLs, then writes the resulting HTML into a sandboxed `<iframe>`

### Key Modules

| Path | Purpose |
|---|---|
| `src/lib/file-system.ts` | `VirtualFileSystem` class — in-memory tree with `serialize`/`deserialize` for persistence |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping `VirtualFileSystem`; exposes CRUD ops and `handleToolCall` |
| `src/lib/contexts/chat-context.tsx` | Wraps Vercel AI SDK `useChat`; bridges AI tool calls → `handleToolCall` |
| `src/lib/transform/jsx-transformer.ts` | Client-side Babel transpilation; builds import maps with blob URLs; resolves `@/` aliases; fetches unknown packages from `esm.sh` |
| `src/lib/provider.ts` | Returns real `anthropic(MODEL)` if `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel` that returns static code |
| `src/lib/tools/str-replace.ts` | Builds the `str_replace_editor` AI tool (create/str_replace/insert/view commands) |
| `src/lib/tools/file-manager.ts` | Builds the `file_manager` AI tool (rename/delete) |
| `src/lib/auth.ts` | JWT-based sessions via `jose`; sessions stored in httpOnly cookies |
| `src/lib/prompts/generation.tsx` | System prompt for the AI — sets file system rules, import alias conventions, and Tailwind requirement |
| `src/app/api/chat/route.ts` | Streaming API route; saves project state to SQLite via Prisma on finish (authenticated users only) |
| `src/app/main-content.tsx` | Layout: resizable left chat panel + right preview/code panel with tab toggle |

### Data Persistence

- **Anonymous users**: state lives only in React memory (tracked in `anon-work-tracker.ts` via `localStorage`); lost on refresh
- **Authenticated users**: on each chat completion, the API route persists `messages` (JSON string) and `data` (serialized `VirtualFileSystem`) to the `Project` model in SQLite
- Prisma schema: `User` → `Project` (one-to-many, userId optional for anonymous creation)
- Prisma client is generated to `src/generated/prisma`

### Preview Rendering

`PreviewFrame` looks for an entry point in this order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, `/src/App.tsx`. The AI system prompt requires every project to have `/App.jsx` as the root.

Third-party npm imports in generated code are resolved to `https://esm.sh/<package>` automatically. Local imports use `@/` aliasing mapped to `/`.

### AI Tool Convention

The AI operates on the virtual FS root `/`. Local file imports must use the `@/` alias (e.g., `import Foo from '@/components/Foo'`). The system prompt in `src/lib/prompts/generation.tsx` enforces these rules.
