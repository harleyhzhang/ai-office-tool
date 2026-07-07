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
