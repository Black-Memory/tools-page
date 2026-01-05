import type { ApiResponse } from '@/types/api'
import { ErrorCode } from '@/constants/error-codes'
import qs from 'qs'
import axios from "axios";

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

  // 请求拦截器（axios专用配置）
  private beforeRequest(url: string, config: RequestConfig): [string, any] {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    const axiosConfig = {
      url: fullURL,
      headers,
      timeout: config.timeout || this.timeout,
      withCredentials: true, // 允许携带 Cookie
      ...config
    };
    return [fullURL, axiosConfig];
  }

  // 响应拦截器（axios专用）
  private async afterResponse<T>(response: any): Promise<ApiResponse<T>> {
    const result: ApiResponse<T> = response.data;
    if (result.code !== ErrorCode.SUCCESS) {
      if (result.code === ErrorCode.UNAUTHORIZED) {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new ApiError(result.code, result.message);
    }
    return result;
  }

  // axios已内置超时控制，无需AbortSignal

  // 通用请求方法（axios实现）
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const [finalURL, axiosConfig] = this.beforeRequest(url, config);
      const reqConfig = {
        ...axiosConfig,
        method,
        url: finalURL,
        data: data ? data : undefined
      };
      const response = await axios(reqConfig);
      return await this.afterResponse<T>(response);
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      // axios错误处理
      if (error.response) {
        // 响应错误
        const result = error.response.data;
        throw new ApiError(result?.code || error.response.status, result?.message || error.message);
      } else if (error.code === 'ECONNABORTED') {
        throw new ApiError(0, '请求超时');
      } else if (error.message) {
        throw new ApiError(0, `网络错误: ${error.message}`);
      }
      throw new ApiError(0, '未知错误');
    }
  }

  // GET 请求
  async get<T>(url: string,data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    if(data){
        const queryString = qs.stringify(data, { skipNulls: true });
        url += `?${queryString}`;
    }
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
