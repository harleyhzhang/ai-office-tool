"use client";

import React, { useEffect, useRef } from 'react';
import { createUniver, defaultTheme, LocaleType, merge } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/presets/preset-sheets-core/locales/en-US';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import { useFiles } from '@/context/FileContext';
import { debounce } from '@/lib/debounce';

interface UniverInstance {
  univer: { dispose: () => void };
  univerAPI: ReturnType<typeof createUniver>['univerAPI'];
}

interface SheetEditorProps {
  fileId: string;
}

function parseA1(cell: string): { row: number; col: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(cell);
  if (!match) return null;
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10) - 1;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { row, col: col - 1 };
}

export default function SheetEditor({ fileId }: SheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<UniverInstance | null>(null);
  const lastSnapRef = useRef<string | null>(null);
  const { files, updateFile } = useFiles();
  const updateFileRef = useRef(updateFile);

  useEffect(() => {
    updateFileRef.current = updateFile;
  }, [updateFile]);
  
  const file = files.find(f => f.id === fileId);
  const fileReady = !!file;

  useEffect(() => {
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

    const debouncedSave = debounce((snap: Record<string, unknown>) => {
      updateFileRef.current(fileId, snap);
    }, 500);
    
    const grabSnapshot = () => {
      const wb = univerAPI.getActiveWorkbook?.();
      const snap = wb?.getSnapshot?.();
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
      if (univerRef.current) {
        univerRef.current.univer.dispose();
        univerRef.current = null;
      }
    };
  }, [fileId, fileReady]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.id !== fileId) return;
      const { cell, value } = detail;
      try {
        const api = univerRef.current?.univerAPI;
        if (!api) return;
        const wb = api.getActiveWorkbook?.();
        const sheet = wb?.getActiveSheet?.();
        if (!sheet) return;
        const parsed = parseA1(cell);
        if (parsed && 'setValue' in sheet) {
          (sheet as unknown as { setValue: (r: number, c: number, v: string) => void }).setValue(parsed.row, parsed.col, value);
        } else if (sheet.getRange) {
          sheet.getRange(cell)?.setValue?.(value);
        }
      } catch (err) {
        console.error('edit-sheet failed', err);
      }
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
