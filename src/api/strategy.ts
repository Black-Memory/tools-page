import type { ApiResponse, CreateBacktestDto, CreateStrategyRequest, UpdateStrategyRequest } from "@/types/api";
import type { BacktestUpdate, Strategy, StrategyConfigs } from "@/types/interface";
import request from "@/utils/request";
import { socketService } from "@/utils/socket";
import qs from 'qs';

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

  static async getKline(query: { symbol: string; period: string; endTime?: number; limit?: number }): Promise<ApiResponse<any>> {
    return request.get('/strategy/kline', query);
  }


  /**
   * 创建回测任务
   * @param data
   * @returns
   */
  static async backtest(data: CreateBacktestDto): Promise<ApiResponse<string>> {
    return request.post(`/strategy/backtest`, data);
  }



  static async subscribeStrategyUpdates(userId: string, call: (data: Partial<Strategy>) => void) {
    return socketService.subscribe(`strategy:update:${userId}`, call);
  }

  static async unsubscribeStrategyUpdates(userId: string) {
    return socketService.unsubscribe([`strategy:update:${userId}`]);
  }


  static async subKline(symbol: string, period: string, call: (data: any) => void) {
    return socketService.subscribe(`kline:update:${symbol}:${period}`, call);
  }

  static async unsubKline(symbol: string, period: string) {
    return socketService.unsubscribe([`kline:update:${symbol}:${period}`]);
  }


  static async subsscribeBacktestUpdates(taskId: string, call: (data: BacktestUpdate) => void) {
    return socketService.subscribe(`backtest:update:${taskId}`, call);
  }

  static async unsubscribeBacktestUpdates(taskId: string) {
    return socketService.unsubscribe([`backtest:update:${taskId}`]);
  }


}
