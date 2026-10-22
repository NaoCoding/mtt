/// <reference types="vite/client" />
interface Window {
  mtt: {
    launch(url: string, count: number): Promise<void>
    setCount(count: number): Promise<void>
    setUrl(url: string): Promise<void>
    reload(id: number): Promise<void>
    reset(id: number): Promise<void>
    setOffline(id: number, offline: boolean): Promise<void>
    setFullscreen(id: number, enabled: boolean): Promise<void>
  }
}
