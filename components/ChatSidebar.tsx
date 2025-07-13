'use client';

import { useChat } from '@ai-sdk/react';
import { useFiles } from '@/context/FileContext';
import React, { useState } from 'react';
import { LuFileText, LuFileSpreadsheet } from 'react-icons/lu';
import { RiRobot2Line } from 'react-icons/ri';
import { MdOutlineChatBubbleOutline } from 'react-icons/md';
import { BsChevronExpand } from 'react-icons/bs';
import { GoPlus } from 'react-icons/go';
import { HiOutlinePencilAlt } from 'react-icons/hi';
import { FaArrowUp, FaStop } from 'react-icons/fa6';
import { TbCopy } from 'react-icons/tb';
import { FaRegCircleCheck } from 'react-icons/fa6';
import { RiLoopRightLine } from 'react-icons/ri';

export default function ChatSidebar() {
  const { files, openTabs } = useFiles();
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageContexts, setMessageContexts] = useState<Record<string, string[]>>({});
  const [mode, setMode] = useState<'Agent' | 'Ask'>('Ask');
  const [showCopyTooltip, setShowCopyTooltip] = useState<string | null>(null);

  const { messages, setMessages, input, setInput, handleInputChange, append, stop, status } = useChat({
    sendExtraMessageFields: true,
    maxSteps: mode === 'Agent' ? 5 : 1,
    // Handle client-side execution of edit_doc tool
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === 'edit_doc') {
        const { docId, text } = toolCall.args as { docId: string; text: string };
        let file = files.find((f) => f.id === docId && f.type === 'doc');
        if (!file) {
          // fallback by name (case-insensitive)
          file = files.find((f) => f.type === 'doc' && f.name.toLowerCase() === docId.toLowerCase());
        }
        // fallback: if only one doc in context, assume it's the target
        if (!file) {
          const docs = files.filter((f) => f.type === 'doc');
          if (docs.length === 1) file = docs[0];
        }
        if (file) {
          window.dispatchEvent(new CustomEvent('edit-doc', { detail: { id: docId, text } }));
        } else {
          console.warn('edit_doc: file not found or not a doc', docId);
        }
        // Return result, useChat will add it automatically
        return 'done';
      }
      if (toolCall.toolName === 'edit_sheet') {
        const { sheetId, cell, value } = toolCall.args as { sheetId: string; cell: string; value: string };
        let file = files.find((f) => f.id === sheetId && f.type === 'sheet');
        if (!file) {
          file = files.find((f) => f.type === 'sheet' && f.name.toLowerCase() === sheetId.toLowerCase());
        }
        if (!file) {
          const sheets = files.filter((f) => f.type === 'sheet');
          if (sheets.length === 1) file = sheets[0];
        }
        if (file) {
          window.dispatchEvent(new CustomEvent('edit-sheet', { detail: { id: sheetId, cell, value } }));
        } else {
          console.warn('edit_sheet: file not found or not a sheet', sheetId);
        }
        return 'done';
      }
    },
    onError(error) {
      console.error('Chat error:', error);
    },
  });

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const min = 24; // 1.5rem
    const max = 192; // 12rem (tailwind max-h-48)
    e.target.style.height = 'auto';
    let newHeight = e.target.scrollHeight;
    if (newHeight < min) newHeight = min;
    if (newHeight > max) newHeight = max;
    e.target.style.height = newHeight + 'px';
    handleInputChange(e);
  };

  const toggleFile = (id: string) => {
    setContextIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    setShowDropdown(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && contextIds.length === 0) return;

    const selectedFiles = files.filter(f => contextIds.includes(f.id));

    const tempId = `temp-${Date.now()}`;
    
    if (selectedFiles.length) {
      setMessageContexts(prev => ({ ...prev, [tempId]: contextIds }));
    }

    append(
      {
        role: 'user' as const,
        content: input,
        data: { contextIds, tempId },
      },
      {
        body: {
          context: selectedFiles.map(({ id, name, content, type }) => ({ id, name, content, type })),
          mode,
        },
      }
    );

    setInput('');
    // keep contextIds until user removes manually
    setShowDropdown(false);
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyTooltip(messageId);
      setTimeout(() => setShowCopyTooltip(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const retryMessage = (messageIndex: number) => {
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1];
      const data = userMessage.data as Record<string, string> | undefined;
      const contextForMessage = messageContexts[userMessage.id] || messageContexts[data?.tempId ?? ''] || [];
      const selectedFiles = files.filter(f => contextForMessage.includes(f.id));
      
      append(
        {
          role: 'user' as const,
          content: typeof userMessage.content === 'string' ? userMessage.content : '',
        },
        {
          body: {
            context: selectedFiles.map(({ id, name, content, type }) => ({ id, name, content, type })),
            mode,
          },
        }
      );
    }
  };

  const getMessageContextIds = (msg: typeof messages[number]): string[] => {
    const data = msg.data as Record<string, string> | undefined;
    return messageContexts[msg.id] || messageContexts[data?.tempId ?? ''] || [];
  };

  const hasOpenFile = openTabs.length > 0;
  const sidebarStyle: React.CSSProperties = {
    width: hasOpenFile ? '24rem' : 'calc(100vw - 12rem)', // leave left sidebar visible
    transition: 'width 0.3s ease-in-out',
  };

  return (
    <div className="fixed right-0 top-0 h-screen bg-[#F8FAFD] flex flex-col p-2 border-l border-[#EEEEEC]" style={sidebarStyle}>
      <div className="mb-4 flex items-start">
        <button
          onClick={() => {
            setMessages([]);
            setMessageContexts({});
            setContextIds([]);
          }}
          className="p-2 text-gray-500 hover:text-gray-700 transition-opacity duration-200 cursor-pointer"
        >
          <HiOutlinePencilAlt className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <p className="text-lg text-gray-600" style={{fontFamily:'"DM Mono", monospace'}}>WELCOME TO AIRA</p>
              <p className="text-sm mt-1 text-gray-500">Chat to start working</p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`whitespace-pre-wrap break-words text-sm p-3 ${
              message.role === 'user'
                ? 'bg-white border border-gray-100 rounded-xl'
                : ''
            }`}
          >
            {getMessageContextIds(message).length > 0 && (
              <div className="flex items-center flex-wrap gap-1 mb-2">
                {getMessageContextIds(message).map(cid => {
                  const f = files.find(fl => fl.id === cid);
                  if (!f) return null;
                  return (
                    <div key={cid} className="flex items-center space-x-1 h-6 bg-[#F8FAFD] border border-gray-100 rounded-md px-2 text-xs">
                      <div className="flex items-center w-3">
                        {f.type === 'doc' ? (
                          <LuFileText className="w-3 h-3 text-blue-500" />
                        ) : (
                          <LuFileSpreadsheet className="w-3 h-3 text-[#1DB044]" />
                        )}
                      </div>
                      <span className="max-w-[60px] truncate">{f.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {message.parts.map((part, i) => {
              if (part.type === 'text') {
                return <span key={`${message.id}-${i}`}>{part.text}</span>;
              }
              if (part.type === 'tool-invocation') {
                const { state, toolName, args } = part.toolInvocation;
                if (state === 'call' || state === 'partial-call') {
                  return (
                    <div key={`${message.id}-${i}`} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-md p-2 mb-2">
                      <span className="font-medium mr-1">{toolName}</span>
                      {args && (
                        <pre className="whitespace-pre-wrap break-words text-[11px] mt-1">{JSON.stringify(args, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
                if (state === 'result') {
                  return (
                    <div key={`${message.id}-${i}`} className="flex items-center text-xs text-green-600 mb-2">
                      <FaRegCircleCheck className="w-3 h-3 mr-1" />
                      {`${toolName} executed`}
                    </div>
                  );
                }
              }
              return null;
            })}
            
            {/* Action buttons for AI messages */}
            {message.role === 'assistant' && (
              <div className="mt-2 flex items-center space-x-2 opacity-0 animate-fade-in">
                <div className="relative">
                  <button
                    onClick={() => {
                      const text = message.parts.filter(p => p.type === 'text').map(p => p.text).join('');
                      copyToClipboard(text, message.id);
                    }}
                    className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <TbCopy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </button>
                  {showCopyTooltip === message.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black bg-opacity-80 text-white text-xs rounded whitespace-nowrap">
                      Copied
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const messageIndex = messages.findIndex(m => m.id === message.id);
                    retryMessage(messageIndex);
                  }}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <RiLoopRightLine className="w-4 h-4" />
                  <span className="text-xs">Retry</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input container */}
      <form onSubmit={onSubmit} className="mt-2">
        <div className="bg-white border border-gray-100 rounded-xl p-3 focus-within:ring-0 focus-within:border-blue-300">
          {/* pills row inside input */}
          <div className="flex items-center flex-wrap gap-1 mb-2 relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-center w-6 h-6 text-xs bg-[#F8FAFD] border border-gray-100 rounded-md flex-shrink-0 cursor-pointer"
            >
              <GoPlus className="w-3 h-3" />
            </button>
            {contextIds.map(id => {
              const f = files.find(fl => fl.id === id);
              if (!f) return null;
              return (
                <div key={id} className="flex items-center space-x-1 h-6 bg-[#F8FAFD] border border-gray-100 rounded-md px-2 text-xs group cursor-pointer">
                  <div className="flex items-center w-3" onClick={() => toggleFile(id)}>
                    {f.type === 'doc' ? (
                      <LuFileText className="w-3 h-3 text-blue-500 group-hover:hidden" />
                    ) : (
                      <LuFileSpreadsheet className="w-3 h-3 text-[#1DB044] group-hover:hidden" />
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFile(id); }} className="hidden group-hover:block text-gray-400 hover:text-gray-600 text-xs cursor-pointer">×</button>
                  </div>
                  <span className="max-w-[60px] truncate">{f.name}</span>
                </div>
              );
            })}
            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-40 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-md shadow-sm z-20">
                {files.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No files</div>
                )}
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => toggleFile(file.id)}
                    className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 text-xs cursor-pointer ${contextIds.includes(file.id) ? 'bg-gray-100' : ''}`}
                  >
                    {file.type === 'doc' ? (
                      <LuFileText className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0" />
                    ) : (
                      <LuFileSpreadsheet className="w-3 h-3 mr-2 text-[#1DB044] flex-shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            value={input}
            onChange={autoResize}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const formEl = (e.target as HTMLTextAreaElement).closest('form');
                formEl?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }
            }}
            placeholder="Say something..."
            className="w-full text-sm outline-none bg-transparent resize-none max-h-48 overflow-y-auto"
            style={{ 
              wordWrap: 'break-word', 
              overflowWrap: 'break-word',
              minHeight: '1.5rem'
            }}
          />
          {/* Mode selector below input */}
          <div className="mt-3 flex items-center justify-between">
            <div className="relative flex items-center">
              {mode === 'Agent' ? (
                <RiRobot2Line className="absolute left-2 w-3 h-3 text-gray-500 pointer-events-none z-10" />
              ) : (
                <MdOutlineChatBubbleOutline className="absolute left-2 w-3 h-3 text-gray-500 pointer-events-none z-10" />
              )}
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'Agent' | 'Ask')}
                className="text-xs text-gray-600 bg-gray-50 rounded-full pl-7 pr-6 py-0.5 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="Agent">Agent</option>
                <option value="Ask">Ask</option>
              </select>
              <BsChevronExpand className="absolute right-2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Send/Stop button */}
            <div className="flex items-center">
              {status !== 'ready' ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-6 h-6 bg-gray-400 hover:bg-gray-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaStop className="w-2.5 h-2.5 text-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const form = new Event('submit', { bubbles: true, cancelable: true });
                    const formElement = document.querySelector('form');
                    if (formElement) formElement.dispatchEvent(form);
                  }}
                  disabled={!input.trim() && contextIds.length === 0}
                  className="w-6 h-6 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
                >
                  <FaArrowUp className="w-2.5 h-2.5 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
      {/* Global overlay to close @ dropdown */}
      {showDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
      )}

    </div>
  );
} 