import React from 'react';
import type { OverviewCategory } from '../types';
import { formatBytes } from '../utils/format';

interface Props {
    categories: OverviewCategory[];
    onCategoryClick: (categoryId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
    photos: '🖼️',
    videos: '🎬',
    documents: '📄',
    apps: '📦',
    cache: '🗑️',
    containers: '🐳',
    system: '⚙️',
    other: '📁'
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    photos: 'All image files across this system',
    videos: 'Video files and media content',
    documents: 'PDFs, docs, spreadsheets & text files',
    apps: 'Application packages and dependencies',
    cache: 'Cached files and temporary data',
    containers: 'Docker images and container data',
    system: 'System files, logs, and kernel data',
    other: 'Uncategorized files and data'
};

const Overview: React.FC<Props> = ({ categories, onCategoryClick }) => {
    return (
        <div className="dashboard">
            {categories.map(cat => (
                <div
                    key={cat.id}
                    className="card"
                    data-category={cat.id}
                    onClick={() => onCategoryClick(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onCategoryClick(cat.id)}
                >
                    <div className="category-icon">
                        {CATEGORY_ICONS[cat.id] || '📁'}
                    </div>
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">{cat.label}</h3>
                            <p className="card-subtitle">{CATEGORY_DESCRIPTIONS[cat.id] || ''}</p>
                        </div>
                        <div className="card-value">{formatBytes(cat.size)}</div>
                    </div>
                    {cat.files && (
                        <p className="card-subtitle" style={{ marginTop: '8px' }}>
                            {cat.files.length} files
                        </p>
                    )}
                    {cat.delta !== null && cat.delta !== 0 && (
                        <span className={`delta ${cat.delta > 0 ? 'positive' : 'negative'}`}>
                            {cat.delta > 0 ? '+' : ''}{formatBytes(cat.delta)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Overview;
