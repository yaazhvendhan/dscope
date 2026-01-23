import React, { useMemo } from 'react';
import type { OverviewCategory, FileInfo } from '../types';
import { formatBytes } from '../utils/format';

interface Props {
    category: OverviewCategory;
    onBack: () => void;
}

// Group files by parent folder
function groupByFolder(files: FileInfo[]): Map<string, FileInfo[]> {
    const groups = new Map<string, FileInfo[]>();

    files.forEach(file => {
        const existing = groups.get(file.parent) || [];
        existing.push(file);
        groups.set(file.parent, existing);
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

const categoryDescriptions: Record<string, string> = {
    photos: 'Image files found across all scanned directories',
    videos: 'Video files found across all scanned directories',
    documents: 'Document files found across all scanned directories',
    apps: 'Application packages and dependencies',
    cache: 'Cached files and temporary data',
    containers: 'Docker and container-related files',
    system: 'System files, logs, and kernel data',
    other: 'Uncategorized files'
};

const categoryIcons: Record<string, string> = {
    photos: '🖼️',
    videos: '🎬',
    documents: '📄',
    apps: '📦',
    cache: '🗑️',
    containers: '🐳',
    system: '⚙️',
    other: '📁'
};

const DrilldownList: React.FC<Props> = ({ category, onBack }) => {
    const files = category.files || [];

    const groupedFiles = useMemo(() => {
        return groupByFolder(files);
    }, [files]);

    const totalFiles = files.length;
    const totalSize = category.size;

    return (
        <div className="drilldown-container">
            <div className="drilldown-header">
                <button onClick={onBack} className="back-btn">← Back to Overview</button>
                <h2>{categoryIcons[category.id] || '📁'} {category.label}</h2>
                <p className="drilldown-description">{categoryDescriptions[category.id] || ''}</p>
                <p className="file-count">{totalFiles} files · {formatBytes(totalSize)}</p>
            </div>

            <div className="drilldown-groups">
                {totalFiles === 0 ? (
                    <div className="empty-message">No files found in this category</div>
                ) : (
                    Array.from(groupedFiles.entries()).map(([folder, folderFiles]) => (
                        <div key={folder} className="drilldown-group">
                            <div className="group-header">
                                <span className="group-folder">📁 {folder}</span>
                                <span className="group-stats">
                                    {folderFiles.length} files · {formatBytes(folderFiles.reduce((s, f) => s + f.size, 0))}
                                </span>
                            </div>
                            <div className="group-files">
                                {folderFiles.sort((a, b) => b.size - a.size).map((file, index) => (
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
