import { app, BrowserWindow } from "electron";
import path from "path";
import { existsSync } from "fs";

// Check if we're running from dist (production) or dev
const isDev = !existsSync(path.join(__dirname, "../dist/index.html")) ||
  process.argv.includes("--dev") ||
  process.env.NODE_ENV === "development";

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
      devTools: true,
    },
  });

  // Always try localhost first in dev mode
  if (isDev) {
    console.log("🔧 Development mode: Loading from http://localhost:5173");
    win.loadURL("http://localhost:5173");

    // Open DevTools in dev mode
    win.webContents.openDevTools();
  } else {
    console.log("📦 Production mode: Loading from dist/index.html");
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

