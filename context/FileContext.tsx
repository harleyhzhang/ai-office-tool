"use client";

import React, { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';

import { fileReducer, initialState, type FileState, restoreWorkspace } from '@/lib/fileState';

interface FileContextType extends FileState {
  createFile: (name: string, type: 'doc' | 'sheet') => void;
  deleteFile: (id: string) => void;
  updateFile: (id: string, content: Record<string, unknown>) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  updateFileParent: (id: string, parentFolderId: string | null) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

interface FileProviderProps {
  children: ReactNode;
}

export function FileProvider({ children }: FileProviderProps) {
  const [state, dispatch] = useReducer(fileReducer, initialState);
  const [canPersist, setCanPersist] = React.useState(false);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  useEffect(() => {
    try {
      const restored = restoreWorkspace(localStorage.getItem('files'), localStorage.getItem('folders'));
      dispatch({ type: 'LOAD_STATE', payload: restored });
      setCanPersist(true);
    } catch {
      setStorageError('Saved workspace could not be read. Existing browser data was preserved; changes in this session will not be saved.');
    }
  }, []);

  useEffect(() => {
    if (!canPersist) return;
    try {
      localStorage.setItem('files', JSON.stringify(state.files));
      localStorage.setItem('folders', JSON.stringify(state.folders));
      setStorageError(null);
    } catch {
      setStorageError('Workspace could not be saved. Your changes are still available in this session.');
    }
  }, [state.files, state.folders, canPersist]);

  const actions = useMemo(() => {
    const createFile = (name: string, type: 'doc' | 'sheet') => {
      dispatch({ type: 'CREATE_FILE', payload: { id: crypto.randomUUID(), name, type, content: {}, createdAt: new Date().toISOString() } });
    };

    const createFolder = (name: string) => {
      dispatch({ type: 'CREATE_FOLDER', payload: { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() } });
    };

    const deleteFolder = (id: string) => {
      dispatch({ type: 'DELETE_FOLDER', payload: id });
    };

    const deleteFile = (id: string) => {
      dispatch({ type: 'DELETE_FILE', payload: id });
    };

    const updateFile = (id: string, content: Record<string, unknown>) => {
      dispatch({ type: 'UPDATE_FILE', payload: { id, content } });
    };

    const updateFileParent = (id: string, parentFolderId: string | null) => {
      dispatch({ type: 'UPDATE_FILE_PARENT', payload: { id, parentFolderId } });
    };

    const openTab = (id: string) => {
      dispatch({ type: 'OPEN_TAB', payload: id });
    };

    const closeTab = (id: string) => {
      dispatch({ type: 'CLOSE_TAB', payload: id });
    };

    const setActiveTab = (id: string) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: id });
    };
    return { createFile, createFolder, deleteFolder, deleteFile, updateFile, updateFileParent, openTab, closeTab, setActiveTab };
  }, []);
  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <FileContext.Provider
      value={value}
    >
      {storageError && <p role="status" className="fixed top-2 left-52 right-4 z-50 rounded bg-white p-2 text-sm text-gray-700 shadow">{storageError}</p>}
      {children}
    </FileContext.Provider>
  );
}

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}; 