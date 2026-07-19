import { IsString, IsUUID, IsOptional } from 'class-validator';

export class MoveStageDto {
  @IsUUID()
  jobId: string;

  @IsString()
  toStage: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
