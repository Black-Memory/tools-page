import type { ApiResponse, CreateMonitorDto, UpdateMonitorDto } from "@/types/api";
import type { Monitor } from "@/types/interface";
import request from "@/utils/request";

export class MonitorAPI {
  static async create(data: CreateMonitorDto): Promise<ApiResponse<Monitor>> {
    return request.post('/monitor', data);
  }

  static async findAll(): Promise<ApiResponse<Monitor[]>> {
    return request.get('/monitor');
  }

  static async findOne(id: string): Promise<ApiResponse<Monitor>> {
    return request.get(`/monitor/${id}`);
  }

  static async update(id: string, data: UpdateMonitorDto): Promise<ApiResponse<Monitor>> {
    return request.patch(`/monitor/${id}`, data);
  }

  static async remove(id: string): Promise<ApiResponse<null>> {
    return request.delete(`/monitor/${id}`);
  }
}
