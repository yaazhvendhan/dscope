const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createServer(privileged = false) {
    const serverPath = path.join(__dirname, '../server/src/index.js');
    console.log(`Starting backend from: ${serverPath} (Privileged: ${privileged})`);

    const command = privileged ? 'pkexec' : 'node';
    const args = privileged ? ['node', serverPath] : [serverPath];

    backendProcess = spawn(command, args, {
        cwd: path.join(__dirname, '../server'),
        stdio: 'inherit'
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}
const { Menu } = require('electron');
Menu.setApplicationMenu(null);


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Handle getHomeDir request
    ipcMain.handle('get-home-dir', () => {
        return os.homedir();
    });

    ipcMain.handle('get-external-devices', async () => {
        const user = os.userInfo().username;
        const candidates = [
            `/media/${user}`,
            `/run/media/${user}`
        ];
        const devices = [];
        for (const base of candidates) {
            try {
                if (fs.existsSync(base)) {
                    const dirs = fs.readdirSync(base);
                    for (const dir of dirs) {
                        devices.push({
                            name: dir,
                            path: path.join(base, dir)
                        });
                    }
                }
            } catch (e) {
                console.error(`Error scanning mounts at ${base}:`, e);
            }
        }
        return devices;
    });

    ipcMain.handle('restart-backend', async (event, privileged) => {
        if (backendProcess) {
            console.log('Stopping current backend...');
            backendProcess.kill();
            backendProcess = null;
        }
        // Small delay to ensure port release?
        // Node spawn kill is usually fast but OS might hold port.
        // We'll hope for the best or rely on retry logic in server if port busy.
        // But better to just restart.
        createServer(privileged);
        return true;
    });

    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (backendProcess) {
        console.log('Killing backend process...');
        backendProcess.kill();
    }
});
