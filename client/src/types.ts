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

export interface AppState {
    status: 'idle' | 'scanning' | 'success' | 'error' | 'cancelled';
    data: ScanResult | null;
    path: string;
    error: string | null;
}
