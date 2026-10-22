import { contextBridge, ipcRenderer } from 'electron'

const api = {
  launch: (url: string, count: number) => ipcRenderer.invoke('mtt:launch', url, count),
  setCount: (count: number) => ipcRenderer.invoke('mtt:set-count', count),
  setUrl: (url: string) => ipcRenderer.invoke('mtt:set-url', url),
  reload: (id: number) => ipcRenderer.invoke('mtt:reload', id),
  reset: (id: number) => ipcRenderer.invoke('mtt:reset', id)
}
contextBridge.exposeInMainWorld('mtt', api)
