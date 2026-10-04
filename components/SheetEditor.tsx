"use client";

import React, { useEffect, useRef } from 'react';
import { createUniver, defaultTheme, LocaleType, merge } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/presets/preset-sheets-core/locales/en-US';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import { useFiles } from '@/context/FileContext';
import { debounce } from '@/lib/debounce';
import { editFailure, type EditRequest } from '@/lib/workspaceEdits';

interface UniverInstance {
  univer: { dispose: () => void };
  univerAPI: ReturnType<typeof createUniver>['univerAPI'];
}

interface SheetEditorProps {
  fileId: string;
}

export default function SheetEditor({ fileId }: SheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<UniverInstance | null>(null);
  const pendingSaveRef = useRef<{ cancel: () => void } | null>(null);
  const lastSnapRef = useRef<string | null>(null);
  const { files, updateFile } = useFiles();
  const updateFileRef = useRef(updateFile);
  const filesRef = useRef(files);

  useEffect(() => {
    updateFileRef.current = updateFile;
    filesRef.current = files;
  }, [updateFile, files]);
  
  const file = files.find(f => f.id === fileId);
  const fileReady = !!file;

  useEffect(() => {
    // Snapshot saves update context without recreating the mounted editor.
    const file = filesRef.current.find(file => file.id === fileId);
    if (!containerRef.current || !file || univerRef.current) return;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: merge({}, UniverPresetSheetsCoreEnUS) },
      theme: defaultTheme,
      presets: [
        UniverSheetsCorePreset({ container: containerRef.current }),
      ],
    });

    univerRef.current = { univer, univerAPI };

    try {
      if (file.content && Object.keys(file.content).length) {
        univerAPI.createWorkbook(file.content);
      } else {
        univerAPI.createWorkbook({ name: file.name || 'Sheet1' });
      }
    } catch {
      univerAPI.createWorkbook({ name: file.name || 'Sheet1' });
    }

    lastSnapRef.current = JSON.stringify(univerAPI.getActiveWorkbook()?.save());
    const debouncedSave = debounce((snap: Record<string, unknown>) => {
      updateFileRef.current(fileId, snap);
    }, 500);
    
    pendingSaveRef.current = debouncedSave;
    const grabSnapshot = () => {
      const wb = univerAPI.getActiveWorkbook?.();
      const snap = wb?.save?.();
      if (!snap) return;
      const snapStr = JSON.stringify(snap);
      if (lastSnapRef.current === null) {
        lastSnapRef.current = snapStr;
        return;
      }
      if (snapStr !== lastSnapRef.current) {
        lastSnapRef.current = snapStr;
        debouncedSave(snap as unknown as Record<string, unknown>);
      }
    };
    
    const intervalId = setInterval(grabSnapshot, 2000);

    return () => {
      clearInterval(intervalId);
      grabSnapshot();
      debouncedSave.flush();
      pendingSaveRef.current = null;
      if (univerRef.current) {
        univerRef.current.univer.dispose();
        univerRef.current = null;
      }
    };
  }, [fileId, fileReady]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EditRequest>).detail;
      if (!detail || detail.id !== fileId) return;
      detail.result = (async () => {
        try {
          const api = univerRef.current?.univerAPI;
          const wb = api?.getActiveWorkbook();
          const sheet = wb?.getActiveSheet();
          if (!wb || !sheet || !detail.cell) return editFailure('The spreadsheet editor is not ready.');
          sheet.getRange(detail.cell).setValue(detail.value ?? '');
          const snap = wb.save();
          pendingSaveRef.current?.cancel();
          lastSnapRef.current = JSON.stringify(snap);
          updateFileRef.current(fileId, snap as unknown as Record<string, unknown>);
          return { ok: true };
        } catch {
          return editFailure('The editor could not apply the change.');
        }
      })();
    };
    window.addEventListener('edit-sheet', handler);
    return () => window.removeEventListener('edit-sheet', handler);
  }, [fileId]);

  if (!file) {
    return <div className="flex items-center justify-center h-full text-gray-500">File not found</div>;
  }

  return (
    <div className="h-full w-full">
      <div
        ref={containerRef}
        id={`sheet-editor-${fileId}`}
        className="h-full w-full"
      />
    </div>
  );
}
