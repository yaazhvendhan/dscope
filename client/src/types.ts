export interface ScanNode {
    path: string;
    size: number;
    type: 'directory' | 'file' | 'symlink' | 'error';
    children?: ScanNode[];
    category?: string;
    explanation?: string;
    title?: string;
    riskLevel?: string;
    error?: string;
}

export interface ScanResult extends ScanNode { }


export interface FileInfo {
    name: string;
    path: string;
    size: number;
    parent: string;
}

export interface OverviewCategory {
    id: string;
    label: string;
    size: number;
    delta: number | null;
    files: FileInfo[];
}

export interface DirectoryNode {
    name: string;
    path: string;
    size: number;
    category?: string;
    type?: string;
    hasChildren?: boolean;
    children?: DirectoryNode[];
}

export interface PresentationData {
    overview: {
        categories: OverviewCategory[];
    };
    directory: {
        root: DirectoryNode;
    };
}

export interface AppState {
    status: 'idle' | 'scanning' | 'success' | 'error' | 'cancelled';
    data: PresentationData | null;
    path: string;
    error: string | null;
}
