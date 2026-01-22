import React from 'react';
import type { OverviewCategory } from '../types';
import { formatBytes } from '../utils/format';
import '../App.css'; // Utilizing existing and new styles

interface Props {
    categories: OverviewCategory[];
}

const Overview: React.FC<Props> = ({ categories }) => {
    return (
        <div className="overview-container">
            {categories.map(cat => (
                <div key={cat.id} className="overview-card">
                    <div className="overview-header">
                        <span className="overview-label">{cat.label}</span>
                        <span className="overview-size">{formatBytes(cat.size)}</span>
                    </div>

                    <div className="overview-delta">
                        {/* Delta logic: null -> —, positive -> ▲, negative -> ▼ */}
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
