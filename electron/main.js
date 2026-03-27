const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createServer(privileged = false) {


    // In both dev and prod (bundled in ASAR), the server is at ../server relative to this file
    // This works because we now include "server/**/*" in "files" effectively.
    const serverPath = path.join(__dirname, '../server/src/index.js');

    // IMPORTANT: 'cwd' cannot be inside an ASAR archive for spawn().
    // We must use a real directory. process.resourcesPath is safe.
    // The server script will resolve its dependencies relative to itself (__dirname), so this is fine.
    const cwd = app.isPackaged ? process.resourcesPath : path.join(__dirname, '../server');

    console.log(`Starting backend from: ${serverPath} (Privileged: ${privileged})`);

    let command;
    let args;
    let env = { ...process.env };

    if (app.isPackaged) {
        // PRODUCTION: Use the bundled Electron executable as the Node runtime
        // This removes the dependency on the system having 'node' installed.
        command = process.execPath;

        if (privileged) {
            // pkexec with env trick to set ELECTRON_RUN_AS_NODE
            command = 'pkexec';
            args = ['env', 'ELECTRON_RUN_AS_NODE=1', process.execPath, serverPath];
        } else {
            // Normal unprivileged run
            env.ELECTRON_RUN_AS_NODE = '1';
            args = [serverPath];
        }
    } else {
        // DEVELOPMENT: Use system node
        command = privileged ? 'pkexec' : 'node';
        args = privileged ? ['node', serverPath] : [serverPath];
    }

    console.log(`Spawning backend with CWD: ${cwd}`);

    backendProcess = spawn(command, args, {
        cwd: cwd,
        stdio: 'inherit',
        env: env
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
