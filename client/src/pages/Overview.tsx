import React from 'react';
import type { OverviewCategory } from '../types';
import { formatBytes } from '../utils/format';
import '../App.css';

interface Props {
    categories: OverviewCategory[];
    onCategoryClick: (id: string) => void;
}

const Overview: React.FC<Props> = ({ categories, onCategoryClick }) => {
    return (
        <div className="overview-container">
            {categories.map(cat => (
                <div key={cat.id} className="overview-card" onClick={() => onCategoryClick(cat.id)}>
                    <div className="overview-header">
                        <span className="overview-label">{cat.label}</span>
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
                                {cat.delta !== 0 && ` ${formatBytes(cat.delta)}`}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Overview;
