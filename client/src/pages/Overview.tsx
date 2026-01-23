import React from 'react';
import type { OverviewCategory } from '../types';
import { formatBytes } from '../utils/format';
import '../App.css';

interface Props {
    categories: OverviewCategory[];
    onCategoryClick: (id: string) => void;
}

// Category descriptions to clarify semantic scope
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    photos: 'All image files across this system',
    videos: 'All video files across this system',
    documents: 'All document files across this system',
    apps: 'Installed packages and dependencies',
    cache: 'Temporary cached data',
    containers: 'Docker and container data',
    system: 'System logs and configuration',
    other: 'Unclassified files'
};

const Overview: React.FC<Props> = ({ categories, onCategoryClick }) => {
    return (
        <div className="overview-container">
            {categories.map(cat => (
                <div key={cat.id} className="overview-card" onClick={() => onCategoryClick(cat.id)}>
                    <div className="overview-header">
                        <span className="overview-label">{cat.label}</span>
                        <span className="overview-subtitle">{CATEGORY_DESCRIPTIONS[cat.id] || ''}</span>
                        <span className="overview-size">{formatBytes(cat.size)}</span>
                    </div>

                    <div className="overview-delta">
                        {cat.delta === null ? (
                            <span className="delta-neutral">&mdash;</span>
                        ) : (
                            <span className={cat.delta > 0 ? 'delta-up' : cat.delta < 0 ? 'delta-down' : 'delta-neutral'}>
                                {cat.delta > 0 && '▲'}
                                {cat.delta < 0 && '▼'}
                                {cat.delta === 0 && '—'}
                                {cat.delta !== 0 && ` ${formatBytes(Math.abs(cat.delta))}`}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Overview;
