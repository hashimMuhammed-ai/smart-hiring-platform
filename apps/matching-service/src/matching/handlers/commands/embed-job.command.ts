export class EmbedJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly description: string,
    public readonly tenantId: string,
  ) {}
}
