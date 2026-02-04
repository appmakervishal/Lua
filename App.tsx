
import React, { useState, useCallback, useMemo } from 'react';
import { FileNode, TerminalMessage } from './types';
import Explorer from './components/Explorer';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import { LuaRunner } from './services/luaRunner';

const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'PROJECT-LUA',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'main.lua',
            name: 'main.lua',
            type: 'file',
            content: `local math = require("math")

-- Main calculation module
local function calculate_sum(a, b)
  return a + b
end

local x = 10
local y = 20

print("Starting summation script...")
local result = calculate_sum(x, y)
print("Result: " .. result)

-- Validation block
if result > 25 then
  print("Condition met: Value exceeds 25")
end`
          },
          {
            id: 'utils.lua',
            name: 'utils.lua',
            type: 'file',
            content: '-- Utility functions\nlocal function greet(name)\n  print("Hello, " .. name)\nend\n\nreturn { greet = greet }'
          }
        ]
      },
      {
        id: 'config.json',
        name: 'config.json',
        type: 'file',
        content: '{\n  "version": "1.0.0",\n  "debug": true\n}'
      }
    ]
  }
];

const App: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('main.lua');
  const [openFileIds, setOpenFileIds] = useState<string[]>(['main.lua']);
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const findFileById = useCallback((nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const activeFile = useMemo(() => findFileById(files, activeFileId), [files, activeFileId, findFileById]);

  const selectFile = (id: string) => {
    setActiveFileId(id);
    if (!openFileIds.includes(id)) {
      setOpenFileIds(prev => [...prev, id]);
    }
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenIds = openFileIds.filter(oid => oid !== id);
    setOpenFileIds(newOpenIds);
    if (activeFileId === id && newOpenIds.length > 0) {
      setActiveFileId(newOpenIds[newOpenIds.length - 1]);
    } else if (newOpenIds.length === 0) {
      setActiveFileId('');
    }
  };

  const updateFileContent = (id: string, newContent: string) => {
    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, content: newContent };
        if (node.children) return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    };
    setFiles(prev => updateRecursive(prev));
  };

  const toggleFolder = (id: string) => {
    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, isOpen: !node.isOpen };
        if (node.children) return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    };
    setFiles(prev => updateRecursive(prev));
  };

  const createNewFile = (parentId: string) => {
    const name = prompt("Enter file name:", "new_file.lua");
    if (!name) return;

    const newFile: FileNode = {
      id: `${name}_${Date.now()}`,
      name,
      type: 'file',
      content: '-- Start coding here...'
    };

    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, isOpen: true, children: [...(node.children || []), newFile] };
        }
        if (node.children) return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    };
    setFiles(prev => updateRecursive(prev));
    selectFile(newFile.id);
  };

  const addTerminalMessage = (text: string, type: TerminalMessage['type'] = 'info') => {
    setTerminalMessages(prev => [...prev, { text, type, timestamp: Date.now() }]);
  };

  const handleRun = useCallback(() => {
    if (!activeFile || activeFile.type !== 'file') {
      addTerminalMessage("No file selected or invalid file.", "error");
      return;
    }
    
    setIsRunning(true);
    addTerminalMessage(`lua ${activeFile.name}`, 'input');
    
    try {
      const runner = LuaRunner.getInstance();
      runner.run(
        activeFile.content || '',
        (msg) => addTerminalMessage(msg, 'info'),
        (err) => addTerminalMessage(err, 'error')
      );
    } catch (e: any) {
      addTerminalMessage(e.message || "Execution error", "error");
    } finally {
      setTimeout(() => setIsRunning(false), 300);
    }
  }, [activeFile]);

  return (
    <div className="flex flex-col h-screen w-full select-none text-gray-300">
      {/* Header */}
      <header className="flex items-center justify-between h-10 px-4 border-b border-border-dark bg-background-dark z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-5 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
            {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(item => (
              <span key={item} className="hover:text-white cursor-pointer transition-colors">{item}</span>
            ))}
          </div>
        </div>
        <div className="text-[11px] font-mono text-gray-500 uppercase tracking-widest hidden md:block">Lua - Professional Studio</div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all shadow-lg active:scale-95 ${
              isRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-primary text-background-dark hover:brightness-110'
            }`}
          >
            <span className="material-symbols-outlined !text-[14px]">
              {isRunning ? 'pending' : 'play_arrow'}
            </span>
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-6 border border-primary/30" style={{ backgroundImage: 'url("https://picsum.photos/32/32?random=lua")' }}></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <aside className="w-12 flex flex-col items-center py-4 gap-4 border-r border-border-dark bg-background-dark z-10 shrink-0">
          <button className="p-2 text-primary border-l-2 border-primary"><span className="material-symbols-outlined">file_copy</span></button>
          <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors"><span className="material-symbols-outlined">search</span></button>
          <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors"><span className="material-symbols-outlined">account_tree</span></button>
          <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors"><span className="material-symbols-outlined">extension</span></button>
          <button className="p-2 text-gray-500 hover:text-gray-300 mt-auto transition-colors"><span className="material-symbols-outlined">account_circle</span></button>
          <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors"><span className="material-symbols-outlined">settings</span></button>
        </aside>

        <Explorer 
          files={files} 
          activeFileId={activeFileId} 
          onSelectFile={selectFile} 
          onToggleFolder={toggleFolder}
          onCreateFile={createNewFile}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-background-dark border-b border-border-dark overflow-x-auto h-9 shrink-0 no-scrollbar">
            {openFileIds.map(fid => {
              const file = findFileById(files, fid);
              if (!file) return null;
              const isActive = activeFileId === fid;
              return (
                <div 
                  key={fid}
                  onClick={() => setActiveFileId(fid)}
                  className={`group flex items-center px-4 py-2 gap-2 border-r border-border-dark cursor-pointer transition-all min-w-[140px] shrink-0 ${
                    isActive ? 'bg-panel-dark border-t-2 border-t-primary' : 'hover:bg-panel-dark/40 border-t-2 border-t-transparent'
                  }`}
                >
                  <span className={`material-symbols-outlined !text-[14px] ${file.name.endsWith('.json') ? 'text-gray-500' : 'text-primary'}`}>
                    {file.name.endsWith('.json') ? 'settings' : 'description'}
                  </span>
                  <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-500'}`}>{file.name}</span>
                  <button 
                    onClick={(e) => closeTab(fid, e)}
                    className="material-symbols-outlined !text-[14px] ml-auto text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                  >
                    close
                  </button>
                </div>
              );
            })}
          </div>

          {activeFile ? (
            <Editor 
              content={activeFile.content || ''} 
              onChange={(val) => updateFileContent(activeFile.id, val)} 
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-panel-dark text-gray-600 flex-col gap-4">
               <span className="material-symbols-outlined !text-6xl opacity-20">code_off</span>
               <p className="text-sm">Select a file from the explorer to start coding.</p>
            </div>
          )}

          <Terminal 
            messages={terminalMessages} 
            onClear={() => setTerminalMessages([])} 
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="h-6 flex items-center justify-between px-3 bg-background-dark border-t border-border-dark text-[11px] text-gray-500 z-20 shrink-0">
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-1 hover:bg-accent-dark px-2 h-full cursor-pointer text-white/70">
            <span className="material-symbols-outlined !text-[14px]">fork_right</span>
            <span>main*</span>
          </div>
          <div className="flex items-center gap-1 hover:bg-accent-dark px-2 h-full cursor-pointer">
            <span className="material-symbols-outlined !text-[14px]">sync</span>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined !text-[14px]">check_circle</span>
            <span>Ready</span>
          </div>
        </div>
        <div className="flex items-center h-full">
          <div className="px-3 hover:bg-accent-dark h-full flex items-center cursor-pointer">UTF-8</div>
          <div className="px-3 hover:bg-accent-dark h-full flex items-center cursor-pointer">Lua 5.4.x</div>
          <div className="px-3 hover:bg-accent-dark h-full flex items-center cursor-pointer">
            <span className="material-symbols-outlined !text-[14px]">notifications</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
