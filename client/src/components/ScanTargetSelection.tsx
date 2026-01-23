import React, { useEffect, useState } from 'react';
import '../App.css';

interface Device {
    name: string;
    path: string;
}

interface Props {
    onSelect: (path: string, type: 'home' | 'system' | 'device') => void;
}

const ScanTargetSelection: React.FC<Props> = ({ onSelect }) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [scanningDevices, setScanningDevices] = useState(true);
    const [homeDir, setHomeDir] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            // @ts-ignore
            const home = await window.api?.getHomeDir();
            setHomeDir(home || '/');

            // @ts-ignore
            const devs = await window.api?.getExternalDevices();
            setDevices(devs || []);
            setScanningDevices(false);
        };
        load();
    }, []);

    return (
        <div className="target-selection-overlay">
            <div className="target-selection-modal">
                <div className="modal-header">
                    <h2>What would you like to analyze?</h2>
                    <p>Select a scope to begin scanning your Linux system.</p>
                </div>

                <div className="target-options">
                    {/* Option 1: Home */}
                    <div
                        className="target-card recommended"
                        onClick={() => onSelect(homeDir, 'home')}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="target-icon">🏠</div>
                        <div className="target-info">
                            <h3>Home Directory</h3>
                            <p>Analyze your personal files. Ideal for freeing up space safely.</p>
                            <span className="target-badge">Recommended</span>
                        </div>
                    </div>

                    {/* Option 2: System */}
                    <div
                        className="target-card system"
                        onClick={() => onSelect('/', 'system')}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="target-icon">⚙️</div>
                        <div className="target-info">
                            <h3>Entire System</h3>
                            <p>Analyze root, logs, and system files. Requires administrator password.</p>
                            <span className="target-badge warning">Advanced</span>
                        </div>
                    </div>

                    {/* Option 3: External Devices */}
                    <div className="external-section">
                        <h4>External Devices</h4>
                        {scanningDevices ? (
                            <p className="device-status">Scanning for devices...</p>
                        ) : devices.length > 0 ? (
                            <div className="device-list">
                                {devices.map((dev, idx) => (
                                    <div
                                        key={idx}
                                        className="target-card device"
                                        onClick={() => onSelect(dev.path, 'device')}
                                    >
                                        <div className="target-icon">💾</div>
                                        <div className="target-info">
                                            <h3>{dev.name}</h3>
                                            <p>{dev.path}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="device-status">No external devices detected.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanTargetSelection;
