"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface FileType {
  id: string;
  name: string;
  type: 'doc' | 'sheet';
  content: Record<string, unknown>;
  createdAt: string;
  parentFolderId?: string | null;
}

interface FolderType {
  id: string;
  name: string;
  createdAt: string;
}

interface TabType {
  id: string;
  name: string;
  type: 'doc' | 'sheet';
}

interface FileState {
  files: FileType[];
  folders: FolderType[];
  openTabs: TabType[];
  activeTab: string | null;
}

type FileAction = 
  | { type: 'LOAD_FILES'; payload: FileType[] }
  | { type: 'LOAD_STATE'; payload: { files: FileType[]; folders: FolderType[] } }
  | { type: 'CREATE_FILE'; payload: { name: string; type: 'doc' | 'sheet' } }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'UPDATE_FILE'; payload: { id: string; content: Record<string, unknown> } }
  | { type: 'UPDATE_FILE_PARENT'; payload: { id: string; parentFolderId: string | null } }
  | { type: 'CREATE_FOLDER'; payload: { name: string } }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'OPEN_TAB'; payload: string }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string };

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

const initialState: FileState = {
  files: [],
  folders: [],
  openTabs: [],
  activeTab: null,
};

function fileReducer(state: FileState, action: FileAction): FileState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, files: action.payload.files, folders: action.payload.folders };
    
    case 'CREATE_FILE':
      const newFile: FileType = {
        id: Date.now().toString(),
        name: action.payload.name,
        type: action.payload.type,
        content: action.payload.type === 'doc' ? {} : {},
        createdAt: new Date().toISOString(),
      };
      return { 
        ...state, 
        files: [...state.files, newFile],
        openTabs: [...state.openTabs, { id: newFile.id, name: newFile.name, type: newFile.type }],
        activeTab: newFile.id,
      };
    
    case 'DELETE_FILE':
      return {
        ...state,
        files: state.files.filter(file => file.id !== action.payload),
        openTabs: state.openTabs.filter(tab => tab.id !== action.payload),
        activeTab: state.activeTab === action.payload ? null : state.activeTab,
      };
    
    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(file =>
          file.id === action.payload.id
            ? { ...file, content: action.payload.content }
            : file
        ),
      };

    case 'UPDATE_FILE_PARENT':
      return {
        ...state,
        files: state.files.map(file => file.id === action.payload.id ? { ...file, parentFolderId: action.payload.parentFolderId } : file),
      };

    case 'CREATE_FOLDER':
      const newFolder: FolderType = {
        id: Date.now().toString(),
        name: action.payload.name,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        folders: [...state.folders, newFolder],
      };

    case 'DELETE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(f => f.id !== action.payload),
        files: state.files.map(f => f.parentFolderId === action.payload ? { ...f, parentFolderId: null } : f),
      };
    
    case 'OPEN_TAB':
      const file = state.files.find(f => f.id === action.payload);
      if (!file) return state;
      
      const existingTab = state.openTabs.find(tab => tab.id === action.payload);
      if (existingTab) {
        return { ...state, activeTab: action.payload };
      }
      
      return {
        ...state,
        openTabs: [...state.openTabs, { id: file.id, name: file.name, type: file.type }],
        activeTab: action.payload,
      };
    
    case 'CLOSE_TAB':
      const newTabs = state.openTabs.filter(tab => tab.id !== action.payload);
      const newActiveTab = state.activeTab === action.payload
        ? (newTabs.length > 0 ? newTabs[0].id : null)
        : state.activeTab;
      
      return {
        ...state,
        openTabs: newTabs,
        activeTab: newActiveTab,
      };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    default:
      return state;
  }
}

interface FileProviderProps {
  children: ReactNode;
}

export function FileProvider({ children }: FileProviderProps) {
  const [state, dispatch] = useReducer(fileReducer, initialState);
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    const savedFiles = localStorage.getItem('files');
    const savedFolders = localStorage.getItem('folders');
    const filesArr: FileType[] = savedFiles ? JSON.parse(savedFiles) : [];
    const foldersArr: FolderType[] = savedFolders ? JSON.parse(savedFolders) : [];
    if (filesArr.length || foldersArr.length) {
      dispatch({ type: 'LOAD_STATE', payload: { files: filesArr, folders: foldersArr } });
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('files', JSON.stringify(state.files));
      localStorage.setItem('folders', JSON.stringify(state.folders));
    }
  }, [state.files, state.folders, isLoaded]);

  const createFile = (name: string, type: 'doc' | 'sheet') => {
    dispatch({ type: 'CREATE_FILE', payload: { name, type } });
  };

  const createFolder = (name: string) => {
    dispatch({ type: 'CREATE_FOLDER', payload: { name } });
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

  return (
    <FileContext.Provider
      value={{
        ...state,
        createFile,
        createFolder,
        deleteFolder,
        deleteFile,
        updateFile,
        updateFileParent,
        openTab,
        closeTab,
        setActiveTab,
      }}
    >
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