import { contextBridge, ipcRenderer } from "electron";

// Expose isElectron flag to detect Electron environment in React
contextBridge.exposeInMainWorld("isElectron", true);

// Get production status from main process
const isProd = ipcRenderer.sendSync('app-is-packaged');
const appVersion = ipcRenderer.sendSync('get-app-version');

// Expose platform info
contextBridge.exposeInMainWorld("platform", {
    os: process.platform,
    isProd: isProd,
    isElectron: true,
    version: appVersion
});

// Expose electron API (for future use)
contextBridge.exposeInMainWorld("electron", {});
