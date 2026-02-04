
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface TerminalMessage {
  type: 'info' | 'error' | 'success' | 'input';
  text: string;
  timestamp: number;
}

declare global {
  interface Window {
    fengari: any;
  }
}
