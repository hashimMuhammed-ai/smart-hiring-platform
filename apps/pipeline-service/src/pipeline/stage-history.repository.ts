import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, StageHistory } from '@app/shared/database';

@Injectable()
export class StageHistoryRepository extends BaseRepository<StageHistory> {
  constructor(
    @InjectRepository(StageHistory)
    private readonly stageHistoryRepo: Repository<StageHistory>,
  ) {
    super(stageHistoryRepo);
  }

  /**
   * Insert a new record in the stage_history table to keep an audit trail
   * of candidates moving through pipeline stages.
   */
  async createHistory(
    tenantId: string,
    pipelineId: string,
    fromStage: string | null,
    toStage: string,
    notes?: string | null,
    movedBy?: string | null,
  ): Promise<StageHistory> {
    const history = this.stageHistoryRepo.create({
      tenantId,
      pipelineId,
      fromStage,
      toStage,
      notes: notes ?? null,
      movedBy: movedBy ?? null,
    });
    return this.stageHistoryRepo.save(history);
  }
}
