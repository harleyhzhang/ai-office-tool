export interface FileType {
  id: string;
  name: string;
  type: 'doc' | 'sheet';
  content: Record<string, unknown>;
  createdAt: string;
  parentFolderId?: string | null;
}

export interface FolderType {
  id: string;
  name: string;
  createdAt: string;
}

export interface TabType {
  id: string;
  name: string;
  type: 'doc' | 'sheet';
}

export interface FileState {
  files: FileType[];
  folders: FolderType[];
  openTabs: TabType[];
  activeTab: string | null;
}

export type FileAction = 
  | { type: 'LOAD_STATE'; payload: { files: FileType[]; folders: FolderType[] } }
  | { type: 'CREATE_FILE'; payload: FileType }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'UPDATE_FILE'; payload: { id: string; content: Record<string, unknown> } }
  | { type: 'UPDATE_FILE_PARENT'; payload: { id: string; parentFolderId: string | null } }
  | { type: 'CREATE_FOLDER'; payload: FolderType }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'OPEN_TAB'; payload: string }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string };

export const initialState: FileState = {
  files: [],
  folders: [],
  openTabs: [],
  activeTab: null,
};

export function fileReducer(state: FileState, action: FileAction): FileState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, files: action.payload.files, folders: action.payload.folders };
    
    case 'CREATE_FILE':
      const newFile = action.payload;
      if (state.files.some(file => file.id === newFile.id)) return state;
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
      if (action.payload.parentFolderId !== null && !state.folders.some(folder => folder.id === action.payload.parentFolderId)) return state;
      return {
        ...state,
        files: state.files.map(file => file.id === action.payload.id ? { ...file, parentFolderId: action.payload.parentFolderId } : file),
      };

    case 'CREATE_FOLDER':
      const newFolder = action.payload;
      if (state.folders.some(folder => folder.id === newFolder.id)) return state;
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
      return state.openTabs.some(tab => tab.id === action.payload) ? { ...state, activeTab: action.payload } : state;
    
    default:
      return state;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validBase = (value: Record<string, unknown>) =>
  typeof value.id === 'string' && value.id.length > 0 && typeof value.name === 'string' &&
  typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt));

/** Reject invalid saves without replacing the browser's only copy with an empty workspace. */
export function restoreWorkspace(savedFiles: string | null, savedFolders: string | null) {
  const files: unknown = savedFiles === null ? [] : JSON.parse(savedFiles);
  const folders: unknown = savedFolders === null ? [] : JSON.parse(savedFolders);
  if (!Array.isArray(files) || !Array.isArray(folders) ||
    !files.every(file => isRecord(file) && validBase(file) && (file.type === 'doc' || file.type === 'sheet') &&
      isRecord(file.content) && (file.parentFolderId == null || typeof file.parentFolderId === 'string')) ||
    !folders.every(folder => isRecord(folder) && validBase(folder)) ||
    new Set(files.map(file => file.id)).size !== files.length ||
    new Set(folders.map(folder => folder.id)).size !== folders.length) {
    throw new Error('Invalid saved workspace');
  }
  const folderIds = new Set(folders.map(folder => folder.id));
  return { files: (files as FileType[]).map(file => file.parentFolderId && !folderIds.has(file.parentFolderId)
    ? { ...file, parentFolderId: null } : file), folders: folders as FolderType[] };
}
