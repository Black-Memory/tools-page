import type { ErrorCode } from "@/constants/error-codes"
import type { BacktestParams, Strategy } from "./interface"

export interface ApiResponse<T = any> {
  code: ErrorCode
  message: string
  data: T | null
  timestamp?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    _id: string
    username: string
    email?: string
  }
}

export interface UserInfo {
  _id: string
  username: string
  email?: string

  telegram?: {
    appId: string
    appHash: string
    phoneNumber: string
    session?: string
  }
}


export interface UpdateUserInfoRequest extends Partial<Omit<UserInfo, '_id'>> { }





export interface CreateStrategyRequest extends Omit<Strategy, 'id' | 'createdAt'> { }


export interface UpdateStrategyRequest extends Partial<Omit<Strategy, 'id' | 'createdAt'>> { }




export interface CreateBacktestDto extends BacktestParams {
  taskId?: string
}

export interface CreateMonitorDto {
  monitorUser: string
  source: string
  pushEnabled?: boolean
  remark?: string
}

export interface UpdateMonitorDto extends Partial<CreateMonitorDto> { }
