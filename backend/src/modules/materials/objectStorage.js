import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { S3Client, CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const localRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "uploads");
const driver = process.env.OBJECT_STORAGE_DRIVER || "local";
let bucketReady = false;

const s3 = driver === "s3"
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "eu-central-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      }
    })
  : null;

async function ensureBucket() {
  if (!s3 || bucketReady) return;
  const bucket = process.env.S3_BUCKET;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  bucketReady = true;
}

export async function savePrivateObject({ userId, buffer, contentType, extension = "bin" }) {
  const key = `${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  if (s3) {
    await ensureBucket();
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION || undefined
    }));
  } else {
    const filePath = path.join(localRoot, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }
  return key;
}

export async function deletePrivateObject(key) {
  if (!key) return;
  if (s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  } else {
    await fs.rm(path.join(localRoot, key), { force: true });
  }
}

export async function readPrivateObject(key) {
  if (s3) {
    const response = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Buffer.from(await response.Body.transformToByteArray());
  }
  return fs.readFile(path.join(localRoot, key));
}
