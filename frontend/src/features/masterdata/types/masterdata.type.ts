export interface MasterData {
  id: number;
  group: string;
  value?: string | null;
  name?: string | null;
  nameGroup?: string | null;
  description?: string | null;
  displayOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export interface CreateMasterDataDto {
  group: string;
  value?: string;
  name?: string;
  nameGroup?: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateMasterDataDto {
  group?: string;
  value?: string;
  name?: string;
  nameGroup?: string;
  description?: string;
  displayOrder?: number;
}

export interface MasterDataDto extends CreateMasterDataDto {}

export interface FilterMasterDataDto {
  group?: string;
  nameGroup?: string;
  key?: string;
  search?: string;
}
