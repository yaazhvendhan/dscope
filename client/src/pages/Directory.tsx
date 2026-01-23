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

    // Check if we have explanation data to show
    const hasExplanation = !!(node.title || node.explanation);

    // Allow expansion if it's a directory OR if there's an explanation to show
    const isExpandable = isDirectory || hasExplanation;

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpandable) {
            setExpanded(prev => !prev);
        }
    }, [isExpandable]);

    return (
        <>
            <div
                className={`directory-item ${isDirectory ? 'folder' : ''}`}
                onClick={handleToggle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle(e as any)}
                style={{ cursor: isExpandable ? 'pointer' : 'default' }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {node.riskLevel && node.riskLevel !== 'low' && node.riskLevel !== 'unknown' && (
                        <span className={`risk-badge ${node.riskLevel}`}>
                            {node.riskLevel} risk
                        </span>
                    )}
                    <span className="item-size">{formatBytes(node.size)}</span>
                </div>
            </div>

            {expanded && (
                <div className="directory-expanded-content">
                    {/* Explanation Panel */}
                    {(node.title || node.explanation) && (
                        <div className="explanation-panel">
                            <div className="explanation-header">
                                <span className="explanation-icon">💡</span>
                                <strong>{node.title || 'Insight'}</strong>
                            </div>
                            <p>{node.explanation}</p>
                            {node.riskLevel && (
                                <div className="risk-indicator">
                                    Risk Level: <span className={`risk-tag ${node.riskLevel}`}>{node.riskLevel}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Children */}
                    {hasChildren && (
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
