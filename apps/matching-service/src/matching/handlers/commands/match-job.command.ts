/**
 * CQRS Command to trigger matching orchestrations for a given job.
 * Handled by MatchJobHandler.
 */
export class MatchJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly tenantId: string,
  ) {}
}
