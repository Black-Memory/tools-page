import request from '@/utils/request';
import type { LoginRequest, LoginResponse, ApiResponse, UserInfo, UpdateUserInfoRequest, DingDingConfig } from '@/types/api';

export class UserAPI {
  // 获取用户信息
  static async getUserInfo(): Promise<ApiResponse<UserInfo>> {
    return request.get<UserInfo>('/user/info');
  }


  static async updateUserInfo(data: UpdateUserInfoRequest): Promise<ApiResponse<UserInfo>> {
    return request.post<UserInfo>('/user/update', data);
  }


  static async getDingDingConfigs(): Promise<ApiResponse<DingDingConfig[]>> {
    return request.get<DingDingConfig[]>('/user/dingding');
  }


  static async deleteDingDingConfig(id: string): Promise<ApiResponse<null>> {
    return request.delete<null>(`/user/dingding/${id}`);
  }

  static async createDingDingConfig(data: Partial<DingDingConfig>): Promise<ApiResponse<DingDingConfig>> {
    return request.post<DingDingConfig>('/user/dingding', data);
  }
}
