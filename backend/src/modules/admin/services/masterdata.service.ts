import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MasterData } from '../entites/index.js';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { MasterDataDto } from '../dtos/index.js';
import { UserResponse } from '../../users/dtos/index.js';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(MasterData)
    private readonly masterDataRepo: Repository<MasterData>,
  ) {}

  async getAllGroups() {
    const groups = await this.masterDataRepo
      .createQueryBuilder('md')
      .select('md.group', 'group')
      .addSelect('MAX(md.name_group)', 'nameGroup')
      .groupBy('md.group')
      .getRawMany();

    return groups.map((g) => ({
      group: g.group,
      nameGroup: g.nameGroup || null,
    }));
  }

  async getMasterDataByGroup(group: string) {
    const masterData = await this.masterDataRepo.find({
      where: { group },
    });
    if (!masterData) throw new BadRequestException('Master Data không tồn tại');
    return masterData;
  }

  async saveMasterData(dto: MasterDataDto, user?: UserResponse, id?: number) {
    let masterData;
    const whereCondition: FindOptionsWhere<MasterData>[] = [];
    if (id) {
      whereCondition.push({ id: Not(id) });
      const existMasterData = await this.masterDataRepo.findOne({
        where: { id },
      });
      if (!existMasterData)
        throw new BadRequestException('Master Data không tồn tại !');
      existMasterData.updatedBy = user?.id ? user.id : null;
      masterData = this.masterDataRepo.merge(existMasterData, dto);
    } else
      masterData = this.masterDataRepo.create({
        ...dto,
        createdBy: user?.id ?? null,
        updatedBy: user?.id ?? null,
      });

    const response = await this.masterDataRepo.save(masterData);

    return response;
  }

  async removeMasterData(id: number, user?: UserResponse) {
    const masterData = await this.masterDataRepo.findOne({ where: { id } });
    if (!masterData)
      throw new BadRequestException('Master Data không tồn tại !');
    masterData.deletedBy = user?.id ? user.id : null;
    return await this.masterDataRepo.softRemove(masterData);
  }
}
