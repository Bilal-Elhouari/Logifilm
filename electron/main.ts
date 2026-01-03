// ... existing code ...
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { existsSync } from "fs";

// Check if we're running from dist (production) or dev
// app.isPackaged is true when running from built executable, false in dev
const isDev = !app.isPackaged;

// Disable GPU cache in development to avoid permission errors
if (isDev) {
  app.commandLine.appendSwitch('disable-http-cache');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,

    transparent: false,
    titleBarStyle: "default",
    autoHideMenuBar: true,
    backgroundColor: "#1a1a1a",
    icon: (() => {
      const isMac = process.platform === "darwin";
      const name = isMac ? "logoFenetreMac.icns" : "logoFenetre.ico";
      return isDev
        ? path.join(__dirname, `../public/${name}`)
        : path.join(__dirname, `../dist/${name}`);
    })(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: false, // Disable DevTools completely to prevent auto-open
    },
  });

  // Prevent DevTools from opening automatically
  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });

  // Always try localhost first in dev mode
  if (isDev) {
    console.log("🔧 Development mode: Loading from http://localhost:5173");
    win.loadURL("http://localhost:5173");

    // Open DevTools in dev mode (commented out to prevent auto-open)
    // win.webContents.openDevTools();
  } else {
    console.log("📦 Production mode: Loading from dist/index.html");
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  // IPC Handler for checking if app is packaged
  ipcMain.on('app-is-packaged', (event) => {
    event.returnValue = app.isPackaged;
  });

  // IPC Handler for app version
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  createWindow();
});

