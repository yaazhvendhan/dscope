import React, { useState, useCallback } from 'react';
import type { DirectoryNode } from '../types';
import { formatBytes } from '../utils/format';

interface Props {
    root: DirectoryNode;
}

interface ItemProps {
    node: DirectoryNode;
    depth: number;
}

const DirectoryItem: React.FC<ItemProps> = ({ node, depth }) => {
    const [expanded, setExpanded] = useState(false);

    const hasChildren = node.children && node.children.length > 0;
    const isDirectory = node.type === 'directory' || hasChildren;
    const displayName = node.name || node.path?.split('/').pop() || 'Unknown';

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDirectory) {
            setExpanded(prev => !prev);
        }
    }, [isDirectory]);

    return (
        <>
            <div
                className={`directory-item ${isDirectory ? 'folder' : ''}`}
                onClick={handleToggle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle(e as any)}
            >
                <div className="item-info">
                    <div className={`item-icon ${isDirectory ? 'folder-icon' : 'file-icon'}`}>
                        {isDirectory ? (expanded ? '📂' : '📁') : '📄'}
                    </div>
                    <span className="item-name">
                        {displayName}
                        {isDirectory && hasChildren && (
                            <span style={{ marginLeft: '8px', opacity: 0.5, fontSize: '12px' }}>
                                ({node.children!.length} items)
                            </span>
                        )}
                    </span>
                </div>
                <span className="item-size">{formatBytes(node.size)}</span>
            </div>

            {expanded && hasChildren && (
                <div className="directory-children">
                    {node.children!.map((child, idx) => (
                        <DirectoryItem
                            key={child.path || `${child.name}-${idx}`}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </>
    );
};

const Directory: React.FC<Props> = ({ root }) => {
    if (!root) {
        return (
            <div className="directory-view">
                <div className="directory-header">
                    <h2>Directory Explorer</h2>
                </div>
                <div className="empty-message">No directory data available</div>
            </div>
        );
    }

    return (
        <div className="directory-view">
            <div className="directory-header">
                <h2>📁 Directory Explorer</h2>
                <span style={{ color: 'var(--gray)', fontSize: '14px' }}>
                    {root.path}
                </span>
            </div>
            <div className="directory-content">
                {root.children && root.children.length > 0 ? (
                    root.children.map((child, idx) => (
                        <DirectoryItem
                            key={child.path || `${child.name}-${idx}`}
                            node={child}
                            depth={0}
                        />
                    ))
                ) : (
                    <div className="empty-message">No items in this directory</div>
                )}
            </div>
        </div>
    );
};

export default Directory;
