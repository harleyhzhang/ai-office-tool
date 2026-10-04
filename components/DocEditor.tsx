"use client";

import React, { useEffect, useRef } from 'react';
import { createUniver, LocaleType, merge } from '@univerjs/presets';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US';
import '@univerjs/preset-docs-core/lib/index.css';
import { useFiles } from '@/context/FileContext';
import { debounce } from '@/lib/debounce';
import { editFailure, type EditRequest } from '@/lib/workspaceEdits';

interface UniverInstance {
  univer: { dispose: () => void };
  univerAPI: ReturnType<typeof createUniver>['univerAPI'];
}

interface DocEditorProps {
  fileId: string;
}

export default function DocEditor({ fileId }: DocEditorProps) {
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
      locales: { [LocaleType.EN_US]: merge({}, UniverPresetDocsCoreEnUS) },
      presets: [
        UniverDocsCorePreset({ container: containerRef.current }),
      ],
    });

    univerRef.current = { univer, univerAPI };

    try {
      if (file.content && Object.keys(file.content).length) {
        univerAPI.createUniverDoc(file.content);
      } else {
        univerAPI.createUniverDoc({});
      }
    } catch {
      univerAPI.createUniverDoc({});
    }

    lastSnapRef.current = JSON.stringify(univerAPI.getActiveDocument()?.getSnapshot());
    const debouncedSave = debounce((snap: Record<string, unknown>) => {
      updateFileRef.current(fileId, snap);
    }, 500);
    
    pendingSaveRef.current = debouncedSave;
    const grabSnapshot = () => {
      const doc = univerAPI.getActiveDocument?.();
      const snap = doc?.getSnapshot?.();
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
          const doc = api?.getActiveDocument();
          if (!doc?.appendText) return editFailure('The document editor is not ready.');
          if (!await doc.appendText('\r' + detail.text)) return editFailure('The document could not apply the edit.');
          const snap = doc.getSnapshot();
          pendingSaveRef.current?.cancel();
          lastSnapRef.current = JSON.stringify(snap);
          updateFileRef.current(fileId, snap as unknown as Record<string, unknown>);
          return { ok: true };
        } catch {
          return editFailure('The editor could not apply the change.');
        }
      })();
    };
    window.addEventListener('edit-doc', handler);
    return () => window.removeEventListener('edit-doc', handler);
  }, [fileId]);

  if (!file) {
    return <div className="flex items-center justify-center h-full text-gray-500">File not found</div>;
  }

  return (
    <div className="h-full w-full">
      <div
        ref={containerRef}
        id={`doc-editor-${fileId}`}
        className="h-full w-full"
      />
    </div>
  );
}
