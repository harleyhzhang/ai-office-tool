"use client";

import React, { useState } from 'react';
import { LuFileText, LuFileSpreadsheet, LuFolder } from 'react-icons/lu';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPlus } from 'react-icons/go';
import { useFiles } from '@/context/FileContext';
import dynamic from 'next/dynamic';

const DocEditor = dynamic(() => import('@/components/DocEditor'), { ssr: false, loading: () => <p className="p-4 text-sm text-gray-500">Loading document editor…</p> });
const SheetEditor = dynamic(() => import('@/components/SheetEditor'), { ssr: false, loading: () => <p className="p-4 text-sm text-gray-500">Loading spreadsheet editor…</p> });

interface ItemToDelete {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

export default function DriveInterface() {
  const {
    files,
    folders,
    openTabs,
    activeTab,
    createFile,
    deleteFile,
    openTab,
    closeTab,
    setActiveTab,
    createFolder,
    updateFileParent,
    deleteFolder,
  } = useFiles();

  const [showNewFileDropdown, setShowNewFileDropdown] = useState<boolean>(false);
  const [showNameFileModal, setShowNameFileModal] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<'doc' | 'sheet' | 'folder' | ''>('');
  const [newFileName, setNewFileName] = useState<string>('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<ItemToDelete | null>(null);

  const handleNewType = (type: 'doc' | 'sheet' | 'folder') => {
    setSelectedType(type);
    setShowNewFileDropdown(false);
    setShowNameFileModal(true);
  };

  const handleCreate = () => {
    if (!newFileName.trim() || !selectedType) return;
    if (selectedType === 'folder') {
      createFolder(newFileName.trim());
    } else {
      createFile(newFileName.trim(), selectedType);
    }
      setNewFileName('');
      setShowNameFileModal(false);
      setSelectedType('');
  };

  const handleDelete = (item: ItemToDelete) => {
    if(item.type==='file') deleteFile(item.id);
    else deleteFolder(item.id);
    setDeleteConfirmModal(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 pr-96">
      {/* Sidebar */}
      <div className="w-48 bg-[#F8FAFD] flex flex-col px-1.5 py-4 border-r border-[#EEEEEC]">
        <div className="px-4">
          <h1 className="text-2xl font-semibold text-gray-800" style={{fontFamily:'"DM Mono", monospace'}}>
            AIRA
          </h1>
        </div>
        
        {/* Create button */}
        <div className="px-3 py-3">
          <div className="relative">
            <button
              onClick={() => setShowNewFileDropdown(!showNewFileDropdown)}
              className="flex items-center justify-center px-4 py-3 bg-white text-[#1F1F1F] rounded-xl hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
            >
              <GoPlus className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">New</span>
            </button>
            
            {showNewFileDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleNewType('doc')}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <LuFileText className="w-4 h-4 mr-3 text-blue-500" />
                  <span className="text-sm text-gray-700">Document</span>
                </button>
                <button
                  onClick={() => handleNewType('sheet')}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100 cursor-pointer"
                >
                  <LuFileSpreadsheet className="w-4 h-4 mr-3 text-[#1DB044]" />
                  <span className="text-sm text-gray-700">Spreadsheet</span>
                </button>
                <button
                  onClick={() => handleNewType('folder')}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100 cursor-pointer"
                >
                  <LuFolder className="w-4 h-4 mr-3 text-gray-500" />
                  <span className="text-sm text-gray-700">Folder</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h2 className="text-sm font-semibold text-[#92928F] mb-2">Files</h2>
            <div className="space-y-0.5">
              {/* Folders */}
              {folders.map(folder => (
                <div key={folder.id} className="mt-2">
                   <div className="-mx-2 flex items-center justify-between px-2 py-1 rounded-lg group transition-colors hover:bg-gray-100 cursor-pointer" onDragOver={e=>e.preventDefault()} onDrop={e=>{const id=e.dataTransfer.getData('text/plain'); updateFileParent(id,folder.id);}}>
                     <div className="flex items-center space-x-2 flex-1">
                       <LuFolder className="w-4 h-4 text-gray-500" />
                       <span className="text-sm font-medium truncate max-w-[100px] text-gray-700">{folder.name}</span>
                     </div>
                     <button aria-label={`Delete ${folder.name}`} onClick={()=>setDeleteConfirmModal({id:folder.id,name:folder.name,type:'folder'})} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 cursor-pointer"><FaRegTrashAlt className="w-3 h-3"/></button>
                   </div>
                  <div className="ml-4 mt-1 space-y-0.5">
                    {files.filter(f=>f.parentFolderId===folder.id).map(f=>{
                      const isActive = activeTab===f.id;
                      return (
                        <div key={f.id} className={`-mx-2 flex items-center justify-between px-2 py-1 rounded-lg group cursor-pointer ${isActive?'bg-[#C2E7FE]':'hover:bg-gray-100'}`}
                          draggable onDragStart={(e)=>e.dataTransfer.setData('text/plain',f.id)}
                        >
                          <button type="button" aria-label={`Open ${f.name}`} onClick={()=>openTab(f.id)} className="flex items-center flex-1 text-left min-w-0">
                          {f.type==='doc'?<LuFileText className="w-4 h-4 text-blue-500"/>:<LuFileSpreadsheet className="w-4 h-4 text-[#1DB044]"/>}
                          <span className="text-sm truncate ml-2 max-w-[100px]">{f.name}</span>
                          </button>
                          <button aria-label={`Delete ${f.name}`} onClick={(e)=>{e.stopPropagation();setDeleteConfirmModal({id:f.id,name:f.name,type:'file'});}} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 cursor-pointer"><FaRegTrashAlt className="w-3 h-3"/></button>
                        </div>
                      )})}
                    {/* inner items handled above; no extra dropzone */}
                  </div>
                </div>
              ))}

              {/* root files */}
              {files.filter(f=>!f.parentFolderId).map((file) => {
                  const isActive = activeTab === file.id;
                  return (
                    <div key={file.id}
                      className={`-mx-2 flex items-center justify-between px-2 py-1 rounded-lg group transition-colors ${
                        isActive ? 'bg-[#C2E7FE] rounded-full' : 'hover:bg-gray-100'
                      }`}
                      draggable onDragStart={(e)=>e.dataTransfer.setData('text/plain',file.id)} onDrop={e=>{
                        e.preventDefault();
                        const id=e.dataTransfer.getData('text/plain');
                        updateFileParent(id,null);
                      }} onDragOver={e=>e.preventDefault()}
                    >
<button type="button" aria-label={`Open ${file.name}`} onClick={() => openTab(file.id)} className="flex items-center space-x-2 flex-1 text-left min-w-0">
                        {file.type === 'doc' ? (
                          <LuFileText className="w-4 h-4 text-blue-500" />
                        ) : (
                          <LuFileSpreadsheet className="w-4 h-4 text-[#1DB044]" />
                        )}
                        <span className={`text-sm font-medium truncate max-w-[100px] ${isActive ? 'text-[#004A76]' : 'text-gray-700'}`}>{file.name}</span>
                      </button>
                      <button aria-label={`Delete ${file.name}`} onClick={(e)=>{e.stopPropagation();setDeleteConfirmModal({id:file.id,name:file.name,type:'file'});}} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 cursor-pointer"><FaRegTrashAlt className="w-3 h-3"/></button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div className="bg-[#F8FAFD] border-b border-[#EEEEEC] flex items-center px-3">
            <div role="tablist" aria-label="Open files" className="flex space-x-1 overflow-x-auto">
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center space-x-2 px-3 py-2 border-b-2 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#004A76] text-[#004A76]'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <button type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center space-x-2">
                  {tab.type === 'doc' ? (
                    <LuFileText className="w-3 h-3 text-blue-500" />
                  ) : (
                    <LuFileSpreadsheet className="w-3 h-3 text-[#1DB044]" />
                  )}
                  <span className="text-sm font-medium whitespace-nowrap">{tab.name}</span>
                  </button>
                  <button
                    aria-label={`Close ${tab.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 overflow-hidden relative">
          {/* no placeholder when no file; chat fills space */}

          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`${activeTab === tab.id ? 'block' : 'hidden'} absolute inset-0 h-full w-full`}
            >
              {tab.type === 'doc' ? (
                <DocEditor fileId={tab.id} />
              ) : (
                <SheetEditor fileId={tab.id} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Name File Modal */}
      {showNameFileModal && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300">
          <div role="dialog" aria-modal="true" aria-labelledby="name-dialog-title" className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 id="name-dialog-title" className="text-lg font-semibold mb-4 text-gray-800">{selectedType==='folder' ? 'Name your folder' : 'Name your file'}</h3>
            <div className="flex items-center mb-4">
              {selectedType === 'doc' ? (
                <LuFileText className="w-5 h-5 mr-3 text-blue-500" />
              ) : selectedType==='sheet' ? (
                <LuFileSpreadsheet className="w-5 h-5 mr-3 text-[#1DB044]" />
              ) : (
                <LuFolder className="w-5 h-5 mr-3 text-gray-500" />
              )}
               <span className="text-gray-600 capitalize">{selectedType === 'doc' ? 'Document' : selectedType==='sheet' ? 'Spreadsheet' : 'Folder'}</span>
            </div>
            <input
              aria-label={selectedType === 'folder' ? 'Folder name' : 'File name'}
              type="text"
              placeholder="Enter file name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              onKeyDown={handleKeyPress}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNameFileModal(false);
                  setNewFileName('');
                  setSelectedType('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newFileName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex items-center mb-4">
              <FaRegTrashAlt className="w-5 h-5 mr-3 text-red-500" />
              <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-800">Delete File</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &ldquo;{deleteConfirmModal.name}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button onClick={()=>handleDelete(deleteConfirmModal)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for dropdown */}
      {showNewFileDropdown && (
        <button
          type="button" aria-label="Close new file menu"
          className="fixed inset-0 z-0"
          onClick={() => setShowNewFileDropdown(false)}
        />
      )}
    </div>
  );
} 