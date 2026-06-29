import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';

export abstract class BaseRepository<T extends { id: string }> {
  protected constructor(protected readonly repo: Repository<T>) { }

  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.repo.findOne({
      where: { id, tenantId } as unknown as FindOptionsWhere<T>,
    });
  }

  async save(entity: DeepPartial<T>): Promise<T> {
    return this.repo.save(entity);
  }
}
