import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindOptionsRelations } from 'typeorm';
import { BaseRepository, PipelineStage } from '@app/shared/database';

@Injectable()
export class PipelineRepository extends BaseRepository<PipelineStage> {
  constructor(
    @InjectRepository(PipelineStage)
    pipelineStageRepo: Repository<PipelineStage>,
  ) {
    super(pipelineStageRepo);
  }

  /**
   * Fetches the pipeline board view for a job.
   * Uses a LEFT JOIN from candidates to pipeline_stages to ensure all candidates
   * for the job are listed (implicitly starting in the 'applied' stage if no stage entry exists).
   */
  async getBoard(jobId: string, tenantId: string): Promise<any[]> {
    return this.repo.manager.query(
      `
      SELECT
        c.id AS "candidateId",
        c.name AS "name",
        c.email AS "email",
        COALESCE(ps.stage, 'applied') AS "stage",
        ps.notes AS "notes",
        ps.moved_at AS "movedAt",
        cjm.score AS "matchScore",
        c.parsed_data->>'total_experience_years' AS "experienceYears"
      FROM candidates c
      LEFT JOIN pipeline_stages ps ON ps.candidate_id = c.id AND ps.job_id = c.job_id
      LEFT JOIN candidate_job_matches cjm ON cjm.candidate_id = c.id AND cjm.job_id = c.job_id
      WHERE c.job_id = $1 AND c.tenant_id = $2
      ORDER BY "stage", "matchScore" DESC NULLS LAST
      `,
      [jobId, tenantId]
    );
  }

  /**
   * Fetch a single pipeline stage row for a candidate and job.
   */
  async getStage(
    jobId: string,
    candidateId: string,
    tenantId: string,
  ): Promise<PipelineStage | null> {
    return this.repo.findOne({
      where: { jobId, candidateId, tenantId } as unknown as FindOptionsWhere<PipelineStage>,
    });
  }

  /**
   * Upserts the pipeline stage row for a candidate.
   * If the stage exists, updates it; otherwise, creates a new one.
   */
  async upsertStage(
    jobId: string,
    candidateId: string,
    tenantId: string,
    stage: string,
    notes?: string | null,
    movedBy?: string | null,
  ): Promise<PipelineStage> {
    let pipelineStage = await this.getStage(jobId, candidateId, tenantId);

    if (pipelineStage) {
      pipelineStage.stage = stage;
      pipelineStage.notes = notes ?? null;
      pipelineStage.movedBy = movedBy ?? null;
      pipelineStage.movedAt = new Date();
    } else {
      pipelineStage = this.repo.create({
        jobId,
        candidateId,
        tenantId,
        stage,
        notes: notes ?? null,
        movedBy: movedBy ?? null,
        movedAt: new Date(),
      });
    }

    return this.repo.save(pipelineStage);
  }

  /**
   * Fetch a single pipeline stage row by ID with specific relation joins.
   */
  async findByIdWithRelations(
    id: string,
    tenantId: string,
    relations: FindOptionsRelations<PipelineStage>,
  ): Promise<PipelineStage | null> {
    return this.repo.findOne({
      where: { id, tenantId } as unknown as FindOptionsWhere<PipelineStage>,
      relations,
    });
  }
}
