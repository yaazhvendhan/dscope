const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkBackendStatus: async () => {
        try {
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                const data = await response.json();
                return { running: data.status === 'ok' };
            }
            return { running: false };
        } catch (error) {
            return { running: false };
        }
    },
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
    getExternalDevices: () => ipcRenderer.invoke('get-external-devices'),
    restartBackend: (privileged) => ipcRenderer.invoke('restart-backend', privileged)
});
