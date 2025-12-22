import request from '@/utils/request'
import type { ApiResponse } from '@/types/api'

export class TelegramAPI {
  // 发送验证码
  static async sendCode(data: { appId: string; appHash: string; phoneNumber: string }): Promise<ApiResponse<any>> {
    return request.post('/telegram/sendCode', data)
  }

  // 登录获取session
  static async loginWithCode(data: { appId: string; appHash: string; phoneNumber: string; code: string }): Promise<ApiResponse<{ session: string }>> {
    return request.post('/telegram/login', data)
  }
}
