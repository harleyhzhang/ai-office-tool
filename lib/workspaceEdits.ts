import type { FileType } from './fileState.ts';

export type EditResult = { ok: boolean; message?: string };
export type EditRequest = { id: string; text?: string; cell?: string; value?: string; result?: Promise<EditResult> };
export const editFailure = (message: string): EditResult => ({ ok: false, message });

export function resolveEditTarget(files: FileType[], type: FileType['type'], reference: string) {
  const candidates = files.filter(file => file.type === type);
  const byId = candidates.find(file => file.id === reference);
  if (byId) return byId;
  const byName = candidates.filter(file => file.name.toLowerCase() === reference.toLowerCase());
  if (byName.length === 1) return byName[0];
  return byName.length === 0 && candidates.length === 1 ? candidates[0] : undefined;
}

export function parseA1(cell: string): { row: number; col: number } | null {
  const match = /^([A-Za-z]+)([1-9]\d*)$/.exec(cell);
  if (!match) return null;
  const rowNumber = Number(match[2]);
  if (!Number.isSafeInteger(rowNumber)) return null;
  const row = rowNumber - 1;
  let col = 0;
  for (const letter of match[1].toUpperCase()) col = col * 26 + letter.charCodeAt(0) - 64;
  return Number.isSafeInteger(row) && Number.isSafeInteger(col) ? { row, col: col - 1 } : null;
}

/** The mounted editor supplies the result; dispatch alone is not evidence of an edit. */
export async function executeWorkspaceEdit(target: Pick<EventTarget, 'dispatchEvent'>, files: FileType[], toolName: string, args: unknown): Promise<EditResult> {
  const type = toolName === 'edit_doc' ? 'doc' : toolName === 'edit_sheet' ? 'sheet' : null;
  if (!type || !args || typeof args !== 'object') return editFailure('Invalid edit request.');
  const input = args as Record<string, unknown>;
  const reference = type === 'doc' ? input.docId : input.sheetId;
  if (typeof reference !== 'string' || (type === 'doc' ? typeof input.text !== 'string' :
    typeof input.cell !== 'string' || !parseA1(input.cell) || typeof input.value !== 'string')) {
    return editFailure('Invalid edit request.');
  }
  const file = resolveEditTarget(files, type, reference);
  if (!file) return editFailure('File not found or target is ambiguous.');
  const detail: EditRequest = { id: file.id, text: input.text as string, cell: input.cell as string, value: input.value as string };
  target.dispatchEvent(new CustomEvent(`edit-${type}`, { detail }));
  if (!detail.result) return editFailure('Open the target file before editing it.');
  try { return await detail.result; } catch { return editFailure('The editor could not apply the change.'); }
}
