import { supabase } from '../lib/supabase';

type Bucket = 'expense-attachments' | 'site-photos' | 'issue-photos' | 'challan-docs';

/**
 * Upload a file to a Supabase Storage bucket.
 * Returns the storage path (saved in DB) and a signed URL (for immediate display).
 */
export async function uploadFile(
  bucket: Bucket,
  file: File,
  folder: string,
): Promise<{ path: string; signedUrl: string }> {
  const ext      = file.name.split('.').pop() ?? 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 3600); // 1-hour signed URL

  if (signErr) throw signErr;

  return { path: data.path, signedUrl: signed.signedUrl };
}

/**
 * Get a fresh signed URL for a stored file (1-hour validity by default).
 */
export async function getSignedUrl(bucket: Bucket, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(bucket: Bucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
