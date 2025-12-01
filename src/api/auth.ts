import request from '@/utils/request';
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types/api';

export class AuthAPI {
  // 用户登录
  static async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return request.post<LoginResponse>('/auth/login', data);
  }

  // 用户注册
  static async register(data: {
    username: string;
    password: string;
    email?: string;
  }): Promise<ApiResponse<any>> {
    return request.post('/auth/register', data);
  }


  // 用户登出
  static async logout(): Promise<ApiResponse<any>> {
    return request.post('/auth/logout');
  }

  // 修改密码
  static async changePassword(data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<any>> {
    return request.put('/auth/password', data);
  }


  static async checkAuthStatus(): Promise<ApiResponse<any>> {
    return request.get('/auth/check');
  }
  static async getUserInfo(): Promise<ApiResponse<any>> {
    return request.get('/user/info');
  }
}

