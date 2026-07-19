export class GetBoardQuery {
  constructor(
    public readonly jobId: string,
    public readonly tenantId: string,
  ) {}
}
