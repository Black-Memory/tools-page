import { io, Socket } from 'socket.io-client'

export class SocketService {
  private socket: Socket | null = null
  private url: string

  subKeys = new Map<string, { key: string }>()

  constructor(url: string = '/') {
    this.url = url
  }

  /**
   * 连接到Socket服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ["websocket"],
        withCredentials: true, // 自动发送cookies，包含JWT token
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        path: '/socket',
      })

      this.socket.on('connect', () => {
        console.log('Socket connected successfully')
        resolve()
      })

      this.socket.on('disconnect', (reason: string) => {
        console.warn('Socket disconnected:', reason)
      })

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error)
        reject(error)
      })
    })
  }


  async batchSubscribe(keys: string[], callObj: { (key: string): (...args: any[]) => void }) {

    if (!this.socket) await wait(() => this.socket != null && this.socket.connected, 100, 5000)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      this.subKeys.set(key, { key })
      this.on(key, callObj(key))
    }
    //需要处理订阅失败的情况 TODO

    return this.emitWithCallback('subscribe', keys)
  }


  async subscribe(key: string, callFunc: (...args: any[]) => void) {

    if (!this.socket) await wait(() => this.socket != null && this.socket.connected, 100, 5000)


    this.subKeys.set(key, { key })
    this.on(key, callFunc)

    //需要处理订阅失败的情况 TODO
    return this.emitWithCallback('subscribe', [key])
  }


  unsubscribe(keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      if (this.subKeys.has(key)) {
        this.subKeys.delete(key)
        this.off(key)
      }
    }
    return this.emitWithCallback('unsubscribe', keys)
  }


  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('Socket disconnected')
    }
  }

  /**
   * 发送消息到服务器
   */
  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected')
    }
  }

  /**
   * 发送消息并等待响应
   */
  emitWithCallback<T = any>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket未连接'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('请求超时'))
      }, 10000)

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timeout)
        resolve(response)
      })
    })
  }

  /**
   * 监听服务器事件
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback)
      } else {
        this.socket.off(event)
      }
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// 等待某个条件成立
async function wait(func: () => boolean, interval: number, timeout: number) {
  const start = Date.now()
  return new Promise<void>((resolve, reject) => {
    const timer = setInterval(() => {
      if (func()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - start > timeout) {
        clearInterval(timer)
        reject(new Error('等待超时'))
      }
    }, interval)
  })
}



export const socketService = new SocketService()
