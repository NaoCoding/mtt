import { contextBridge, ipcRenderer } from 'electron'

const api = {
  launch: (url: string, count: number) => ipcRenderer.invoke('mtt:launch', url, count),
  setCount: (count: number) => ipcRenderer.invoke('mtt:set-count', count),
  setUrl: (url: string) => ipcRenderer.invoke('mtt:set-url', url),
  reload: (id: number) => ipcRenderer.invoke('mtt:reload', id),
  reset: (id: number) => ipcRenderer.invoke('mtt:reset', id),
  setOffline: (id: number, offline: boolean) => ipcRenderer.invoke('mtt:set-offline', id, offline),
  setFullscreen: (id: number, enabled: boolean) => ipcRenderer.invoke('mtt:set-fullscreen', id, enabled)
}
contextBridge.exposeInMainWorld('mtt', api)
