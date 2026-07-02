import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID ?? '';
    this.bucket = process.env.R2_BUCKET_NAME ?? 'smart-hiring-resumes';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  /**
   * Downloads an object from Cloudflare R2 and returns its buffer.
   * @param key The R2 object key (e.g. "tenants/<id>/jobs/<jobId>/resumes/<uuid>.pdf")
   */
  async download(key: string): Promise<Buffer> {
    this.logger.log(`Downloading ${key} from R2`);
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`R2 download body is empty for key: ${key}`);
      }

      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to download ${key} from R2: ${message}`);
      throw err;
    }
  }
}
