"use client";

import React, { useEffect, useRef } from 'react';
import { createUniver, LocaleType, merge } from '@univerjs/presets';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US';
import '@univerjs/preset-docs-core/lib/index.css';
import { useFiles } from '@/context/FileContext';
import { debounce } from '@/lib/debounce';

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

    const debouncedSave = debounce((snap: Record<string, unknown>) => {
      updateFileRef.current(fileId, snap);
    }, 500);
    
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
      try {
        const api = univerRef.current?.univerAPI;
        if (!api) return;
        const doc = api.getActiveDocument?.();
        doc?.appendText?.('\r' + detail.text);
      } catch (err) {
        console.error('appendText failed', err);
      }
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
