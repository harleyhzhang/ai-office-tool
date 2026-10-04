# AIRA

AIRA is a Neo Scholars demo of an AI-native office workspace for creating, editing, and organizing documents and spreadsheets with tool-calling agents.

The project explores what a lightweight office suite could feel like if an assistant could read workspace context, answer questions about open files, and make bounded edits through explicit tools. It combines a Drive-style file manager, document and spreadsheet editors, and a chat sidebar with separate Ask and Agent modes.

## Features

- Drive-style workspace with documents, spreadsheets, folders, tabs, and local persistence.
- Ask mode for chatting with selected file context.
- Agent mode with tool calls that append to documents or write values into spreadsheet cells.
- Univer-powered document and spreadsheet editing.
- Next.js API route powered by the Vercel AI SDK and OpenAI.

## Tech Stack

- Next.js 15
- TypeScript
- React 19
- Vercel AI SDK
- OpenAI
- Univer docs and sheets
- Tailwind CSS

## Running Locally

```bash
npm install
npm run dev
```

The chat API expects an OpenAI API key in the local environment.

```bash
OPENAI_API_KEY=your_key_here
```

Then open `http://localhost:3000`.

## Architecture

The app keeps file and folder state in `FileContext`, persists workspace state to `localStorage`, and renders files through dedicated document and sheet editors. The chat sidebar sends selected file context to `app/api/chat/route.ts`, where Agent mode exposes constrained edit tools:

- `edit_doc` appends text to a selected document.
- `edit_sheet` writes a value to a selected spreadsheet cell using A1 notation.

Tool calls are executed client-side so the model can propose edits while the UI remains in control of applying them.

## Checks and state ownership

Use Node.js 22.18+ for the native TypeScript regression runner:

```sh
npm ci
npm run check # typecheck, lint and synthetic workspace/edit regressions
npm run build
```

`lib/fileState.ts` owns the pure workspace reducer and validation of the existing
`files`/`folders` localStorage format. UUIDs/timestamps are generated before dispatch.
Malformed or duplicate saved state is preserved in storage and surfaced to the user
instead of overwritten; this session remains usable but cannot persist over that
invalid copy. Missing folder references move files back to the root.

`lib/workspaceEdits.ts` resolves selected context files by ID, unique case-insensitive name,
then the existing single-file fallback. It dispatches the resolved ID and waits for
the mounted editor's result. Closed, ambiguous, unavailable or failed edits return
an error instead of reporting success. Agent edits save their snapshot immediately;
closing an editor flushes pending manual changes. Manual editing still uses the
existing two-second polling interval, so abruptly terminating the browser can lose
recent unpolled changes. Editors load on demand rather than in the empty workspace.

Tests use synthetic files and editor responses, with no paid model requests or
private document uploads. No authentication, hosted CI or production configuration
is introduced. The retained Univer/AI SDK generations still have dependency audit
findings; compatible patches are included, without claiming the audit is clean.

A retained Univer 0.9.2 diagnostic can appear when a document is opened after a
spreadsheet: the globally mixed sheet facade requests a sheet service from the
separate document instance. This also reproduces on the original source with the
same installed dependencies. Visible editing and snapshot restoration were verified;
resolving the library integration is outside this focused target/state fix.
