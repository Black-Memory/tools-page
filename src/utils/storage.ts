interface LoginCredentials {
  username: string
  password: string
  rememberMe: boolean
  timestamp: number
}

// 简单加密函数
function encrypt(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
}

// 简单解密函数
function decrypt(encryptedText: string): string {
  return decodeURIComponent(escape(atob(encryptedText)))
}

export class StorageUtil {
  private static readonly CREDENTIALS_KEY = 'loginCredentials'
  private static readonly EXPIRE_DAYS = 30

  // 保存登录凭据
  static saveCredentials(username: string, password: string, rememberMe: boolean): void {
    if (!rememberMe) {
      this.clearCredentials()
      return
    }

    const credentials: LoginCredentials = {
      username,
      password: encrypt(password),
      rememberMe,
      timestamp: Date.now()
    }

    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(credentials))
  }

  // 获取保存的登录凭据
  static getCredentials(): { username: string; password: string; rememberMe: boolean } | null {
    try {
      const saved = localStorage.getItem(this.CREDENTIALS_KEY)
      if (!saved) return null

      const credentials: LoginCredentials = JSON.parse(saved)

      // 检查是否过期
      const expireTime = this.EXPIRE_DAYS * 24 * 60 * 60 * 1000
      const isExpired = Date.now() - credentials.timestamp > expireTime

      if (isExpired) {
        this.clearCredentials()
        return null
      }

      return {
        username: credentials.username,
        password: decrypt(credentials.password),
        rememberMe: credentials.rememberMe
      }
    } catch (error) {
      console.error('获取登录凭据失败:', error)
      this.clearCredentials()
      return null
    }
  }

  // 清除登录凭据
  static clearCredentials(): void {
    localStorage.removeItem(this.CREDENTIALS_KEY)
  }
}
