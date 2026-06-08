import { app, BrowserWindow, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";

// Check if we're running from dist (production) or dev
// app.isPackaged is true when running from built executable, false in dev
const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

type UpdateStatus = {
  state: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error" | "disabled";
  version?: string;
  percent?: number;
  message?: string;
};

function sendUpdateStatus(status: UpdateStatus) {
  mainWindow?.webContents.send("update-status", status);
}

function sendFriendlyUpdateError(error: unknown) {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  const noPublishedRelease =
    technicalMessage.includes("Unable to find latest version") ||
    technicalMessage.includes("Cannot parse releases feed") ||
    technicalMessage.includes("latest.yml") ||
    technicalMessage.includes("404");

  if (noPublishedRelease) {
    sendUpdateStatus({
      state: "not-available",
      message: "Aucune mise a jour publiee pour le moment.",
    });
    return;
  }

  sendUpdateStatus({
    state: "error",
    message: "Verification impossible. Controlez votre connexion puis reessayez.",
  });
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", (info) => {
    sendUpdateStatus({ state: "not-available", version: info.version });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateStatus({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    sendFriendlyUpdateError(error);
  });
}

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
      const name = isMac ? "logoFenetreMac.icns" : "logoBureau.ico";
      return isDev
        ? path.join(__dirname, `../public/${name}`)
        : path.join(__dirname, `../dist/${name}`);
    })(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: false, // Disable DevTools completely to prevent auto-open
    },
  });
  mainWindow = win;

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
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

  ipcMain.handle("check-for-updates", async () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: "disabled", message: "La verification est disponible dans l'application installee." });
      return { ok: false };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (error) {
      sendFriendlyUpdateError(error);
      return { ok: false };
    }
  });

  ipcMain.handle("download-update", async () => {
    if (!app.isPackaged) return { ok: false };
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      sendUpdateStatus({
        state: "error",
        message: "Telechargement impossible. Controlez votre connexion puis reessayez.",
      });
      return { ok: false };
    }
  });

  ipcMain.handle("install-update", () => {
    if (!app.isPackaged) return { ok: false };
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  ipcMain.handle("open-releases", async () => {
    await shell.openExternal("https://github.com/Bilal-Elhouari/Logifilm/releases");
  });

  configureAutoUpdater();
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        sendFriendlyUpdateError(error);
      });
    }, 5000);
  }
});

