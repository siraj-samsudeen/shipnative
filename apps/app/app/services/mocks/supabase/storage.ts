/**
 * Mock Supabase Storage
 *
 * Mock implementation of Supabase storage operations
 */

import { delay, base64Utils } from "./helpers"
import type { StorageFile } from "./types"
import { sharedState } from "./types"
import { logger } from "../../../utils/Logger"

export class MockStorageFileApi {
  private bucket: string
  private path: string

  constructor(bucket: string, path: string) {
    this.bucket = bucket
    this.path = path
  }

  async upload(
    fileBody: Blob | ArrayBuffer | string,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    await delay(500)

    const fullPath = `${this.bucket}/${this.path}`

    // Check if file exists and upsert is false
    if (sharedState.mockFileStorage.has(fullPath) && !options?.upsert) {
      return {
        data: null,
        error: new Error("The resource already exists"),
      }
    }

    // Convert to base64 for storage
    let base64Data = ""
    let size = 0

    if (typeof fileBody === "string") {
      base64Data = fileBody
      size = fileBody.length
    } else if (fileBody instanceof ArrayBuffer) {
      const bytes = new Uint8Array(fileBody)
      base64Data = base64Utils.encode(bytes)
      size = fileBody.byteLength
    } else if (fileBody instanceof Blob) {
      // For Blob, we'll store a placeholder
      base64Data = "blob-placeholder"
      size = fileBody.size
    }

    const file: StorageFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.path.split("/").pop() || "file",
      bucket: this.bucket,
      path: this.path,
      size,
      mimeType: options?.contentType || "application/octet-stream",
      data: base64Data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    sharedState.mockFileStorage.set(fullPath, file)

    if (__DEV__) {
      logger.debug(`[MockStorage] Uploaded`, { path: fullPath, size })
    }

    return {
      data: { path: this.path },
      error: null,
    }
  }

  async download(): Promise<{ data: Blob | null; error: Error | null }> {
    await delay(300)

    const fullPath = `${this.bucket}/${this.path}`
    const file = sharedState.mockFileStorage.get(fullPath)

    if (!file) {
      return {
        data: null,
        error: new Error("Object not found"),
      }
    }

    // Create a blob from the stored data
    const decodedData = base64Utils.decode(file.data)
    const arrayBuffer = decodedData.buffer.slice(
      decodedData.byteOffset,
      decodedData.byteOffset + decodedData.byteLength,
    ) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: file.mimeType })

    if (__DEV__) {
      logger.debug(`[MockStorage] Downloaded`, { path: fullPath })
    }

    return {
      data: blob,
      error: null,
    }
  }

  async remove(): Promise<{ data: { path: string }[] | null; error: Error | null }> {
    await delay(200)

    const fullPath = `${this.bucket}/${this.path}`
    const existed = sharedState.mockFileStorage.has(fullPath)
    sharedState.mockFileStorage.delete(fullPath)

    if (__DEV__) {
      logger.debug(`[MockStorage] Removed`, { path: fullPath, existed })
    }

    return {
      data: [{ path: this.path }],
      error: null,
    }
  }

  getPublicUrl(): { data: { publicUrl: string } } {
    const publicUrl = `https://mock-storage.supabase.co/${this.bucket}/${this.path}`

    if (__DEV__) {
      logger.debug(`[MockStorage] Public URL`, { url: publicUrl })
    }

    return {
      data: { publicUrl },
    }
  }

  async createSignedUrl(
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    await delay(100)

    const signedUrl = `https://mock-storage.supabase.co/${this.bucket}/${this.path}?token=mock-signed-${Date.now()}&expires=${expiresIn}`

    if (__DEV__) {
      logger.debug(`[MockStorage] Signed URL`, { expiresIn, url: signedUrl })
    }

    return {
      data: { signedUrl },
      error: null,
    }
  }
}

export class MockStorageBucket {
  private bucketName: string

  constructor(bucketName: string) {
    this.bucketName = bucketName
    sharedState.mockBuckets.add(bucketName)
  }

  upload(
    path: string,
    fileBody: Blob | ArrayBuffer | string,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).upload(fileBody, options)
  }

  download(path: string): Promise<{ data: Blob | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).download()
  }

  remove(paths: string[]): Promise<{ data: { path: string }[] | null; error: Error | null }> {
    // Remove multiple files
    const removed: { path: string }[] = []
    paths.forEach((path) => {
      const fullPath = `${this.bucketName}/${path}`
      sharedState.mockFileStorage.delete(fullPath)
      removed.push({ path })
    })

    if (__DEV__) {
      logger.debug(`[MockStorage] Removed files`, {
        bucket: this.bucketName,
        count: removed.length,
      })
    }

    return Promise.resolve({
      data: removed,
      error: null,
    })
  }

  async list(
    path?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{
    data: Array<{ name: string; id: string; metadata: any }> | null
    error: Error | null
  }> {
    await delay(200)

    const prefix = path ? `${this.bucketName}/${path}` : this.bucketName
    const files: Array<{ name: string; id: string; metadata: any }> = []

    sharedState.mockFileStorage.forEach((file, fullPath) => {
      if (fullPath.startsWith(prefix)) {
        files.push({
          name: file.name,
          id: file.id,
          metadata: {
            size: file.size,
            mimeType: file.mimeType,
            created_at: file.created_at,
          },
        })
      }
    })

    // Apply limit/offset
    const start = options?.offset || 0
    const end = options?.limit ? start + options.limit : files.length
    const result = files.slice(start, end)

    if (__DEV__) {
      logger.debug(`[MockStorage] Listed files`, { prefix, count: result.length })
    }

    return {
      data: result,
      error: null,
    }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    return new MockStorageFileApi(this.bucketName, path).getPublicUrl()
  }

  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).createSignedUrl(expiresIn)
  }
}

export class MockStorage {
  from(bucket: string): MockStorageBucket {
    return new MockStorageBucket(bucket)
  }

  async listBuckets(): Promise<{
    data: Array<{ name: string; id: string }> | null
    error: Error | null
  }> {
    await delay(100)

    const buckets = Array.from(sharedState.mockBuckets).map((name) => ({
      name,
      id: `bucket-${name}`,
    }))

    if (__DEV__) {
      logger.debug(`[MockStorage] Listed buckets`, { count: buckets.length })
    }

    return {
      data: buckets,
      error: null,
    }
  }

  async createBucket(
    name: string,
    options?: { public?: boolean },
  ): Promise<{ data: { name: string } | null; error: Error | null }> {
    await delay(200)

    if (sharedState.mockBuckets.has(name)) {
      return {
        data: null,
        error: new Error("Bucket already exists"),
      }
    }

    sharedState.mockBuckets.add(name)

    if (__DEV__) {
      logger.debug(`[MockStorage] Created bucket`, { name, public: options?.public ?? false })
    }

    return {
      data: { name },
      error: null,
    }
  }

  async deleteBucket(name: string): Promise<{ data: null; error: Error | null }> {
    await delay(200)

    if (!sharedState.mockBuckets.has(name)) {
      return {
        data: null,
        error: new Error("Bucket not found"),
      }
    }

    // Remove all files in bucket
    sharedState.mockFileStorage.forEach((_, key) => {
      if (key.startsWith(`${name}/`)) {
        sharedState.mockFileStorage.delete(key)
      }
    })

    sharedState.mockBuckets.delete(name)

    if (__DEV__) {
      logger.debug(`[MockStorage] Deleted bucket`, { name })
    }

    return {
      data: null,
      error: null,
    }
  }
}


