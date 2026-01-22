import React, { useState } from 'react';
import type { DirectoryNode } from '../types';
import { formatBytes } from '../utils/format';
import '../App.css';

interface Props {
    root: DirectoryNode;
}

const DirectoryItem: React.FC<{ node: DirectoryNode; level: number; defaultExpanded?: boolean }> = ({ node, level, defaultExpanded }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || false);
    const hasChildren = node.children && node.children.length > 0;

    const handleToggle = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className="directory-item-container">
            <div
                className={`directory-row ${hasChildren ? 'clickable' : ''}`}
                style={{ paddingLeft: `${level * 20 + 10}px` }}
                onClick={handleToggle}
            >
                <div className="directory-name">
                    <span className="directory-icon">
                        {node.type === 'file' ? '📄' : (isExpanded ? '📂' : '📁')}
                    </span>
                    {node.name}
                </div>
                <div className="directory-meta">
                    <span className="directory-size">{formatBytes(node.size)}</span>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="directory-children">
                    {node.children!.map((child, index) => (
                        <DirectoryItem key={`${child.path}-${index}`} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Directory: React.FC<Props> = ({ root }) => {
    return (
        <div className="directory-view">
            <div className="directory-header-row">
                <span>Name</span>
                <span>Size</span>
            </div>
            <div className="directory-list">
                <DirectoryItem node={root} level={0} defaultExpanded={true} />
            </div>
        </div>
    );
};

export default Directory;
