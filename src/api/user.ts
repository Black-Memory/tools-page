import request from '@/utils/request';
import type { LoginRequest, LoginResponse, ApiResponse, UserInfo, UpdateUserInfoRequest } from '@/types/api';

export class UserAPI {
  // 获取用户信息
  static async getUserInfo(): Promise<ApiResponse<UserInfo>> {
    return request.get<UserInfo>('/user/info');
  }


  static async updateUserInfo(data: UpdateUserInfoRequest): Promise<ApiResponse<UserInfo>> {
    return request.post<UserInfo>('/user/update', data);
  }


}
