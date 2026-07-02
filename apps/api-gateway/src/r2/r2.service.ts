import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID ?? '';
    this.bucket = process.env.R2_BUCKET_NAME ?? 'smart-hiring-resumes';
    this.publicUrl = process.env.R2_PUBLIC_URL ?? '';

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
   * Uploads a buffer to Cloudflare R2.
   * @param key    The R2 object key (e.g. "tenants/<id>/resumes/<uuid>.pdf")
   * @param buffer The file content
   * @param contentType MIME type of the file
   * @returns The public URL of the uploaded object
   */
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}/${key}`;

    this.logger.log(`Uploaded ${key} to R2`);
    return url;
  }
}
