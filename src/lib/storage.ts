/**
 * File uploads to Supabase Storage. Paths are namespaced by user id to match
 * the storage RLS policies (migration 0007). Public portfolio buckets return
 * a public URL; the private progress bucket returns its storage path.
 */
import { supabase, isBackendConfigured } from './supabase';

export async function uploadFile(
  bucket: 'avatars' | 'videos' | 'progress',
  userId: string,
  localUri: string,
  ext: string,
): Promise<string> {
  if (!isBackendConfigured) return localUri; // demo mode: keep the local uri

  const res = await fetch(localUri);
  const blob = await res.blob();
  const expected = bucket === 'videos' ? 'video/' : 'image/';
  const maxBytes = bucket === 'videos' ? 50 * 1024 * 1024 : bucket === 'progress' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (blob.type && !blob.type.startsWith(expected)) {
    throw new Error(bucket === 'videos' ? 'Choose a video file.' : 'Choose an image file.');
  }
  if (blob.size > maxBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || undefined,
    upsert: true,
  });
  if (error) {
    throw new Error(
      error.message.includes('Bucket not found') || error.message.includes('bucket')
        ? 'Storage not set up yet — run supabase/migrations/0007 in the Supabase SQL editor.'
        : error.message,
    );
  }
  if (bucket === 'progress') return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** File extension for a picked asset (falls back per media type). */
export function extFor(uri: string, kind: 'image' | 'video'): string {
  const m = uri.match(/\.(\w{2,4})(\?|$)/);
  if (m) return m[1].toLowerCase();
  return kind === 'video' ? 'mp4' : 'jpg';
}
