import type { ApiResponse } from '@/types/api'
import { ErrorCode } from '@/constants/error-codes'

// 请求配置接口
interface RequestConfig extends RequestInit {
  timeout?: number
  skipAuth?: boolean
  showError?: boolean
}

// 自定义错误类
export class ApiError extends Error {
  code: number
  response?: Response

  constructor(code: number, message: string, response?: Response) {
    super(message)
    this.code = code
    this.response = response
    this.name = 'ApiError'
  }
}

class RequestUtil {
  private baseURL: string
  private timeout: number

  constructor(baseURL = '/api', timeout = 10000) {
    this.baseURL = baseURL
    this.timeout = timeout
  }

  // 请求拦截器
  private async beforeRequest(url: string, config: RequestConfig): Promise<[string, RequestConfig]> {
    // 处理 URL
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`

    // 设置默认 headers
    const headers = new Headers(config.headers)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const finalConfig: RequestConfig = {
      ...config,
      headers,
      credentials: 'include', // 关键：允许携带 Cookie
      signal: this.createAbortSignal(config.timeout || this.timeout)
    }

    return [fullURL, finalConfig]
  }

  // 响应拦截器
  private async afterResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')

    // 处理非 JSON 响应
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          response
        )
      }
      // 对于非 JSON 响应，包装成 ApiResponse 格式
      const text = await response.text()
      return {
        code: ErrorCode.SUCCESS,
        message: '请求成功',
        data: text as unknown as T
      }
    }

    // 解析 JSON 响应
    const result: ApiResponse<T> = await response.json()

    // 根据业务状态码判断
    if (result.code !== ErrorCode.SUCCESS) {
      // 处理认证失败 - 只需要跳转，Cookie 由后台清理
      if (result.code === ErrorCode.UNAUTHORIZED) {
        // 重定向到登录页（如果不在登录页的话）
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      throw new ApiError(result.code, result.message, response)
    }

    return result
  }

  // 创建超时控制器
  private createAbortSignal(timeout: number): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    return controller.signal
  }

  // 通用请求方法
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      // 请求前处理
      const [finalURL, finalConfig] = await this.beforeRequest(url, {
        method,
        body: data ? JSON.stringify(data) : undefined,
        ...config
      })

      // 发送请求
      const response = await fetch(finalURL, finalConfig)

      // 响应后处理
      return await this.afterResponse<T>(response)

    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // 处理网络错误、超时等
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(0, '请求超时')
        }
        throw new ApiError(0, `网络错误: ${error.message}`)
      }

      throw new ApiError(0, '未知错误')
    }
  }

  // GET 请求
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config)
  }

  // POST 请求
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config)
  }

  // PUT 请求
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config)
  }

  // DELETE 请求
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  // PATCH 请求
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config)
  }
}

// 创建默认实例
export const request = new RequestUtil()

// 导出工具方法
export { RequestUtil }
export default request
