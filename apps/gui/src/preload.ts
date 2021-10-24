import { contextBridge, ipcRenderer, OpenDialogOptions } from "electron";

const exposedElectronBridge = {
  showOpenDialog: (
    options: OpenDialogOptions,
  ): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke("showOpenDialog", options),
};

export type IpcBridge = typeof exposedElectronBridge;

contextBridge.exposeInMainWorld("ipc", exposedElectronBridge);
