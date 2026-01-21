import type { ScanNode } from '../types';

interface Props {
    node: ScanNode;
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const ResultsView: React.FC<Props> = ({ node }) => {
    return (
        <div className="node-item" style={{ marginLeft: '20px', borderLeft: '1px solid #ccc', paddingLeft: '5px' }}>
            <div className="node-header">
                <strong>{node.title || node.path.split('/').pop() || node.path}</strong>
                <span style={{ color: '#666', fontSize: '0.9em' }}> ({formatBytes(node.size)})</span>
                {node.category && <span className={'badge ' + node.riskLevel}>[{node.category}]</span>}
            </div>

            {node.explanation && (
                <div className="node-explanation" style={{ fontSize: '0.85em', color: '#444', marginBottom: '5px' }}>
                    {node.explanation}
                </div>
            )}

            {/* Render children recursively */}
            {node.children && node.children.length > 0 && (
                <div className="node-children">
                    {node.children.map((child, index) => (
                        <ResultsView key={`${child.path}-${index}`} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultsView;
