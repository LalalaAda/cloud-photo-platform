import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { config } from './config'

let s3Client: S3Client | null = null

/** 获取 RustFS S3 客户端（懒初始化） */
export function getRustfsClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.rustfs.region,
      credentials: {
        accessKeyId: config.rustfs.accessKey,
        secretAccessKey: config.rustfs.secretKey,
      },
      endpoint: config.rustfs.endpoint,
      forcePathStyle: true,
    })
  }
  return s3Client
}

/** 确保 bucket 存在 */
export async function ensureBucket(): Promise<void> {
  const client = getRustfsClient()
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.rustfs.bucket }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.rustfs.bucket }))
    console.log(`[RustFS] Bucket "${config.rustfs.bucket}" created`)
  }
}

/** 上传文件到 RustFS */
export async function uploadToRustfs(
  objectName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const client = getRustfsClient()
  await client.send(new PutObjectCommand({
    Bucket: config.rustfs.bucket,
    Key: objectName,
    Body: buffer,
    ContentType: mimeType,
  }))
  // 返回可直接访问的 URL
  const baseUrl = config.rustfs.endpoint.replace(/\/+$/, '')
  return `${baseUrl}/${config.rustfs.bucket}/${objectName}`
}

/** 从 RustFS 下载文件 */
export async function downloadFromRustfs(objectName: string): Promise<Buffer> {
  const client = getRustfsClient()
  const response = await client.send(new GetObjectCommand({
    Bucket: config.rustfs.bucket,
    Key: objectName,
  }))
  return Buffer.from(await response.Body!.transformToByteArray())
}

/** 删除 RustFS 文件 */
export async function deleteFromRustfs(objectName: string): Promise<void> {
  const client = getRustfsClient()
  await client.send(new DeleteObjectCommand({
    Bucket: config.rustfs.bucket,
    Key: objectName,
  }))
}
