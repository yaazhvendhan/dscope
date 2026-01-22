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

// Collect all files matching the category extension
function collectFiles(node: DirectoryNode, categoryId: string, result: Array<{ name: string, path: string, size: number }> = []) {
    const allowedExts = EXTENSIONS[categoryId];
    if (!allowedExts) return result;

    if (node.type === 'file') {
        const ext = node.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
        if (allowedExts.includes(ext)) {
            result.push({ name: node.name, path: node.path, size: node.size });
        }
    }

    if (node.children) {
        node.children.forEach(child => collectFiles(child, categoryId, result));
    }

    return result;
}

const DrilldownList: React.FC<Props> = ({ root, categoryId, onBack }) => {
    const files = useMemo(() => {
        const collected = collectFiles(root, categoryId);
        return collected.sort((a, b) => b.size - a.size); // Largest first
    }, [root, categoryId]);

    const categoryLabels: Record<string, string> = {
        photos: 'Photos',
        videos: 'Videos',
        documents: 'Documents'
    };

    return (
        <div className="drilldown-container">
            <div className="drilldown-header">
                <button onClick={onBack} className="back-btn">← Back to Overview</button>
                <h2>{categoryLabels[categoryId] || categoryId}</h2>
                <p className="file-count">{files.length} files</p>
            </div>

            <div className="drilldown-list">
                {files.length === 0 ? (
                    <div className="empty-message">No files found in this category</div>
                ) : (
                    files.map((file, index) => (
                        <div key={`${file.path}-${index}`} className="drilldown-item">
                            <div className="drilldown-name">
                                <span className="file-icon">📄</span>
                                {file.name}
                            </div>
                            <div className="drilldown-size">{formatBytes(file.size)}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DrilldownList;
