import { IpcBridge } from "./src/preload";

declare global {
  interface Window {
    ipc: IpcBridge;
  }
}

declare let window: Window & globalThis;
