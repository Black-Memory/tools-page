import type { ErrorCode } from "@/constants/error-codes"
import type { Strategy } from "./interface"

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
    _id: number
    username: string
    email?: string
  }
}

export interface UserInfo {
  _id: number
  username: string
  email?: string
}







export interface CreateStrategyRequest extends Omit<Strategy, 'id' | 'createdAt'> { }


export interface UpdateStrategyRequest extends Partial<Omit<Strategy, 'id' | 'createdAt'>> { }



