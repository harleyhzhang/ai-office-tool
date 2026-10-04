import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileReducer, initialState, restoreWorkspace, type FileType } from '../lib/fileState.ts';
import { executeWorkspaceEdit, parseA1, resolveEditTarget, type EditRequest } from '../lib/workspaceEdits.ts';
import { debounce } from '../lib/debounce.ts';

const file = (id: string, name = 'Notes', type: FileType['type'] = 'doc'): FileType =>
  ({ id, name, type, content: {}, createdAt: '2026-10-04T12:00:00Z' });

test('ID, case-insensitive name and single-file fallback dispatch the resolved ID for both editors', async () => {
  for (const type of ['doc', 'sheet'] as const) {
    const f = file('actual-id', 'Notes', type);
    for (const reference of ['actual-id', 'NOTES', 'model-shortened-id']) {
      const target = new EventTarget();
      let changed = false;
      target.addEventListener(`edit-${type}`, event => {
        const detail = (event as CustomEvent<EditRequest>).detail;
        if (detail.id !== f.id) return;
        changed = true;
        detail.result = Promise.resolve({ ok: true });
      });
      const args = type === 'doc' ? { docId: reference, text: 'hello' } : { sheetId: reference, cell: 'C3', value: 'hello' };
      assert.deepEqual(await executeWorkspaceEdit(target, [f], `edit_${type}`, args), { ok: true });
      assert.equal(changed, true);
    }
  }
});

test('ambiguous, missing, closed, invalid-cell and failed editor targets never report success', async () => {
  assert.equal(resolveEditTarget([file('a'), file('b')], 'doc', 'Notes'), undefined);
  const target = new EventTarget();
  assert.equal((await executeWorkspaceEdit(target, [], 'edit_doc', { docId: 'a', text: 'x' })).ok, false);
  assert.equal((await executeWorkspaceEdit(target, [file('a')], 'edit_doc', { docId: 'a', text: 'x' })).ok, false);
  assert.equal((await executeWorkspaceEdit(target, [file('a', 'Sheet', 'sheet')], 'edit_sheet', { sheetId: 'a', cell: 'A0', value: 'x' })).ok, false);
  target.addEventListener('edit-doc', e => { (e as CustomEvent<EditRequest>).detail.result = Promise.reject(new Error('editor failure')); });
  assert.equal((await executeWorkspaceEdit(target, [file('a')], 'edit_doc', { docId: 'a', text: 'x' })).ok, false);
  assert.deepEqual(parseA1('aa12'), { row: 11, col: 26 });
  for (const cell of ['A0', 'A-1', '1A', 'A9007199254740993']) assert.equal(parseA1(cell), null);
});

test('creation actions are deterministic and retain distinct files created within the same millisecond', () => {
  const action = { type: 'CREATE_FILE' as const, payload: file('first') };
  const once = fileReducer(initialState, action);
  assert.deepEqual(once, fileReducer(initialState, action));
  const both = fileReducer(once, { type: 'CREATE_FILE', payload: file('second') });
  assert.deepEqual(both.files.map(file => file.id), ['first', 'second']);
  assert.equal(fileReducer(both, action), both);
  assert.equal(fileReducer(both, { type: 'SET_ACTIVE_TAB', payload: 'missing' }), both);
  assert.equal(fileReducer(both, { type: 'UPDATE_FILE_PARENT', payload: { id: 'first', parentFolderId: 'missing' } }), both);
});

test('restore accepts saved snapshots, repairs orphan folders, and rejects malformed or duplicate state', () => {
  const saved = { ...file('a'), content: { body: { dataStream: 'hello' } }, parentFolderId: 'orphan' };
  assert.deepEqual(restoreWorkspace(JSON.stringify([saved]), null).files, [{ ...saved, parentFolderId: null }]);
  for (const invalid of ['{', '{}', 'null', JSON.stringify([{ ...file('a'), content: [] }]), JSON.stringify([file('a'), file('a')])]) {
    assert.throws(() => restoreWorkspace(invalid, null));
  }
  assert.throws(() => restoreWorkspace(null, JSON.stringify([{ id: 'bad' }])));
  assert.deepEqual(restoreWorkspace(null, null), { files: [], folders: [] });
});

test('closing an editor flushes its latest pending snapshot; a tool save can cancel a stale pending snapshot', () => {
  const saved: number[] = [];
  const pending = debounce((value: number) => saved.push(value), 10000);
  pending(1); pending(2); pending.flush();
  assert.deepEqual(saved, [2]);
  pending(3); pending.cancel(); pending.flush();
  assert.deepEqual(saved, [2]);
});
