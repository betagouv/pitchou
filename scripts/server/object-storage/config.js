import { S3Client } from "@aws-sdk/client-s3";

const ACCESS_KEY_ID = process.env.OBJECT_STORAGE_ACCESS_KEY_ID || ''
const SECRET_ACCESS_KEY = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || ''
const DEFAULT_REGION = process.env.OBJECT_STORAGE_DEFAULT_REGION || ''
const ENDPOINT_URL = process.env.OBJECT_STORAGE_ENDPOINT_URL || ''
export const BUCKET_NAME = process.env.OBJECT_STORAGE_BUCKET_NAME || ''

if(!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !DEFAULT_REGION || !ENDPOINT_URL || !BUCKET_NAME){
    console.error('Missing object storage environment variables')
    process.exit(1);
}


export function créerClient() {
    return new S3Client({
        region: DEFAULT_REGION,
        endpoint: ENDPOINT_URL,
        credentials: {
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY
        }
    })
}
