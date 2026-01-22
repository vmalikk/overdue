import { storage } from './client';
import { ID } from 'appwrite';

// Use environment variable if available, otherwise default to the provided ID
// IMPORTANT: You must create this bucket in Appwrite Console
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || '69727327000215bf02a0';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadFile(file: File): Promise<{
    fileId: string;
    fileName: string;
}> {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds the limit of 10MB');
    }

    try {
        const response = await storage.createFile(
            STORAGE_BUCKET_ID,
            ID.unique(),
            file
        );
        return {
            fileId: response.$id,
            fileName: response.name
        };
    } catch (error) {
        console.error('Failed to upload file:', error);
        throw error;
    }
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
    try {
        const url = storage.getFileDownload(
            STORAGE_BUCKET_ID,
            fileId
        );
        return url;
    } catch (error) {
        console.error('Failed to get file URL:', error);
        throw error;
    }
}

export async function deleteFile(fileId: string): Promise<void> {
    try {
        await storage.deleteFile(
            STORAGE_BUCKET_ID,
            fileId
        );
    } catch (error) {
        console.error('Failed to delete file:', error);
        throw error;
    }
}
