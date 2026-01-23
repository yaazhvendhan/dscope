import React, { useMemo } from 'react';
import type { DirectoryNode } from '../types';
import { formatBytes } from '../utils/format';
import '../App.css';

interface Props {
    root: DirectoryNode;
    categoryId: string;
    onBack: () => void;
}

const EXTENSIONS: Record<string, string[]> = {
    photos: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic', '.svg', '.raw'],
    videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf', '.odt', '.ods']
};

interface FileInfo {
    name: string;
    path: string;
    size: number;
    parentFolder: string;
}

// Collect all files matching the category extension
function collectFiles(node: DirectoryNode, categoryId: string, result: FileInfo[] = []) {
    const allowedExts = EXTENSIONS[categoryId];
    if (!allowedExts) return result;

    if (node.type === 'file') {
        const filename = node.name || node.path.split('/').pop() || '';
        const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
        if (allowedExts.includes(ext)) {
            // Extract parent folder from path
            const pathParts = node.path.split('/');
            pathParts.pop(); // Remove filename
            const parentFolder = pathParts.pop() || 'Root';

            result.push({
                name: filename,
                path: node.path,
                size: node.size,
                parentFolder
            });
        }
    }

    if (node.children) {
        node.children.forEach(child => collectFiles(child, categoryId, result));
    }

    return result;
}

// Group files by parent folder
function groupByFolder(files: FileInfo[]): Map<string, FileInfo[]> {
    const groups = new Map<string, FileInfo[]>();

    files.forEach(file => {
        const existing = groups.get(file.parentFolder) || [];
        existing.push(file);
        groups.set(file.parentFolder, existing);
    });

    // Sort groups by total size (largest first)
    const sortedGroups = new Map(
        [...groups.entries()].sort((a, b) => {
            const sizeA = a[1].reduce((sum, f) => sum + f.size, 0);
            const sizeB = b[1].reduce((sum, f) => sum + f.size, 0);
            return sizeB - sizeA;
        })
    );

    return sortedGroups;
}

const categoryLabels: Record<string, string> = {
    photos: 'Photos',
    videos: 'Videos',
    documents: 'Documents'
};

const categoryDescriptions: Record<string, string> = {
    photos: 'Image files found across all scanned directories',
    videos: 'Video files found across all scanned directories',
    documents: 'Document files found across all scanned directories'
};

const DrilldownList: React.FC<Props> = ({ root, categoryId, onBack }) => {
    const groupedFiles = useMemo(() => {
        const collected = collectFiles(root, categoryId);
        return groupByFolder(collected);
    }, [root, categoryId]);

    const totalFiles = useMemo(() => {
        let count = 0;
        groupedFiles.forEach(files => count += files.length);
        return count;
    }, [groupedFiles]);

    const totalSize = useMemo(() => {
        let size = 0;
        groupedFiles.forEach(files => {
            files.forEach(f => size += f.size);
        });
        return size;
    }, [groupedFiles]);

    return (
        <div className="drilldown-container">
            <div className="drilldown-header">
                <button onClick={onBack} className="back-btn">← Back to Overview</button>
                <h2>{categoryLabels[categoryId] || categoryId}</h2>
                <p className="drilldown-description">{categoryDescriptions[categoryId] || ''}</p>
                <p className="file-count">{totalFiles} files · {formatBytes(totalSize)}</p>
            </div>

            <div className="drilldown-groups">
                {totalFiles === 0 ? (
                    <div className="empty-message">No files found in this category</div>
                ) : (
                    Array.from(groupedFiles.entries()).map(([folder, files]) => (
                        <div key={folder} className="drilldown-group">
                            <div className="group-header">
                                <span className="group-folder">📁 {folder}</span>
                                <span className="group-stats">
                                    {files.length} files · {formatBytes(files.reduce((s, f) => s + f.size, 0))}
                                </span>
                            </div>
                            <div className="group-files">
                                {files.sort((a, b) => b.size - a.size).map((file, index) => (
                                    <div key={`${file.path}-${index}`} className="drilldown-item">
                                        <div className="drilldown-name">
                                            <span className="file-icon">📄</span>
                                            {file.name}
                                        </div>
                                        <div className="drilldown-size">{formatBytes(file.size)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DrilldownList;
