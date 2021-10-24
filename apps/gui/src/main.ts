import path from "path";
import url, { URL } from "url";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  OpenDialogOptions,
} from "electron";

import { environment } from "./environments/environment";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  const startUrl =
    environment.devServerUrl ||
    url.format(
      new URL("file://" + path.join(__dirname, "../../web/index.html")),
    );

  // and load the index.html of the app.
  win.loadURL(startUrl);

  ipcMain.handle("showOpenDialog", (e, options: OpenDialogOptions) => {
    return dialog.showOpenDialog(options);
  });
}

app.on("ready", createWindow); // Quit when all windows are closed.

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});
