export class MoveStageCommand {
  constructor(
    public readonly jobId: string,
    public readonly candidateId: string,
    public readonly tenantId: string,
    public readonly toStage: string,
    public readonly notes: string | null,
    public readonly movedBy: string | null,
  ) {}
}
