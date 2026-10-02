import { apiClient } from "@/lib/axios";
import type {
  CreateMasterDataDto,
  MasterData,
  MasterDataDto,
  UpdateMasterDataDto,
} from "../types";

export const masterdataService = {
  /**
   * Lấy danh sách tất cả các nhóm master data
   * GET /master-data/groups/all
   */
  getGroups: async (): Promise<{ group: string; nameGroup?: string | null }[]> => {
    return apiClient.get<unknown, { group: string; nameGroup?: string | null }[]>(
      "/master-data/groups/all",
    );
  },

  /**
   * Lấy danh sách master data theo nhóm (group)
   * GET /master-data/:group
   */
  getByGroup: async (group: string): Promise<MasterData[]> => {
    return apiClient.get<unknown, MasterData[]>(`/master-data/${group}`);
  },

  /**
   * Tạo master data mới
   * POST /master-data
   */
  create: async (
    dto: CreateMasterDataDto | MasterDataDto,
  ): Promise<MasterData> => {
    return apiClient.post<unknown, MasterData>("/master-data", dto);
  },

  /**
   * Cập nhật master data theo ID
   * PATCH /master-data/:id
   */
  update: async (
    id: number,
    dto: UpdateMasterDataDto | MasterDataDto,
  ): Promise<MasterData> => {
    return apiClient.patch<unknown, MasterData>(`/master-data/${id}`, dto);
  },

  /**
   * Xóa master data theo ID
   * DELETE /master-data/:id
   */
  delete: async (id: number): Promise<MasterData> => {
    return apiClient.delete<unknown, MasterData>(`/master-data/${id}`);
  },
};
