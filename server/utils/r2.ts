import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectTaggingCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import type { Readable } from 'stream'

interface R2Config {
    r2AccountId: string | unknown;
    r2AccessKeyId: string | unknown;
    r2SecretAccessKey: string | unknown;
    r2BucketName: string | unknown;
    r2PublicUrl: string | unknown;
}

function createR2Client(config: any) {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.r2AccessKeyId as string,
            secretAccessKey: config.r2SecretAccessKey as string,
        },
    })
}

/**
 * Upload to R2 using a Buffer
 */
export async function uploadToS3(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
    metadata?: Record<string, string>
): Promise<string> {
    const config = useRuntimeConfig()
    const client = createR2Client(config)
    
    await client.send(new PutObjectCommand({
        Bucket: config.r2BucketName as string,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata
    }))
    
    return `${config.r2PublicUrl}/${key}`
}

/**
 * Upload to R2 using a Stream (Memory efficient)
 */
export async function uploadStreamToS3(
    key: string,
    body: Readable,
    contentType: string,
    metadata?: Record<string, string>
): Promise<string> {
    const config = useRuntimeConfig()
    const client = createR2Client(config)

    const parallelUploads3 = new Upload({
        client,
        params: {
            Bucket: config.r2BucketName as string,
            Key: key,
            Body: body,
            ContentType: contentType,
            Metadata: metadata
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5, // 5MB
        leavePartsOnError: false,
    })

    await parallelUploads3.done()
    
    return `${config.r2PublicUrl}/${key}`
}

export async function deleteFromS3(key: string): Promise<void> {
    const config = useRuntimeConfig()
    const client = createR2Client(config)
    
    await client.send(new DeleteObjectCommand({
        Bucket: config.r2BucketName as string,
        Key: key,
    }))
}

export async function getFromS3(key: string): Promise<any> {
    const config = useRuntimeConfig()
    const client = createR2Client(config)
    
    const response = await client.send(new GetObjectCommand({
        Bucket: config.r2BucketName as string,
        Key: key,
    }))

    return response.Body
}

export async function updateObjectTags(key: string, tags: Record<string, string>): Promise<void> {
    const config = useRuntimeConfig()
    const client = createR2Client(config)
    
    await client.send(new PutObjectTaggingCommand({
        Bucket: config.r2BucketName as string,
        Key: key,
        Tagging: {
            TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value }))
        }
    }))
}

/**
 * Generate a Presigned POST for direct browser upload (UGC)
 */
export async function createDirectUploadContrat(key: string, contentType: string, maxSize: number = 10 * 1024 * 1024) {
    const config = useRuntimeConfig()
    const client = createR2Client(config)
    
    const post = await createPresignedPost(client, {
        Bucket: config.r2BucketName as string,
        Key: key,
        Conditions: [
            ['content-length-range', 0, maxSize],
            ['starts-with', '$Content-Type', contentType.split('/')[0]]
        ],
        Fields: {
            'Content-Type': contentType,
            'x-amz-meta-status': 'pending'
        },
        Expires: 600 // 10 minutes
    })
    
    return post
}

export function getS3PublicUrl(key: string): string {
    const config = useRuntimeConfig()
    return `${config.r2PublicUrl}/${key}`
}
