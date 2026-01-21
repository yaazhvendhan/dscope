const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkBackendStatus: async () => {
        try {
            // Check health endpoint with retries handled by UI or just simple fetch here
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                const data = await response.json();
                return { running: data.status === 'ok' };
            }
            return { running: false };
        } catch (error) {
            return { running: false };
        }
    }
});
