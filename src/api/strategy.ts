import type { ApiResponse, CreateStrategyRequest, UpdateStrategyRequest } from "@/types/api";
import type { Strategy, StrategyConfigs } from "@/types/interface";
import request from "@/utils/request";

export class StrategyAPI {


  static async getStrategies(): Promise<ApiResponse<Strategy[]>> {
    return request.get('/strategy/list');
  }

  static async createStrategy(data: CreateStrategyRequest): Promise<ApiResponse<string>> {
    return request.post('/strategy', data);
  }



  static async deleteStrategy(id: string): Promise<ApiResponse<null>> {
    return request.delete(`/strategy/delete/${id}`);
  }


  static async updateStrategy(id: string, data: UpdateStrategyRequest): Promise<ApiResponse<Strategy>> {
    return request.patch(`/strategy/update/${id}`, data);
  }


  static async getStrategy(id: string): Promise<ApiResponse<{ strategy: Strategy }>> {
    return request.get(`/strategy/detail/${id}`);
  }


  static async getStrategyConfigs(): Promise<ApiResponse<StrategyConfigs>> {
    return request.get('/strategy/configs');
  }





}
