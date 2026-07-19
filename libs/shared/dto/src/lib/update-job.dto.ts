import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class UpdateJobDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsEnum(['open', 'closed', 'draft'])
  @IsOptional()
  status?: 'open' | 'closed' | 'draft';
}
