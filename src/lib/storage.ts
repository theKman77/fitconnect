/**
 * File uploads to Supabase Storage. Paths are namespaced by user id to match
 * the storage RLS policies (migration 0007). Returns a public URL.
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
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** File extension for a picked asset (falls back per media type). */
export function extFor(uri: string, kind: 'image' | 'video'): string {
  const m = uri.match(/\.(\w{2,4})(\?|$)/);
  if (m) return m[1].toLowerCase();
  return kind === 'video' ? 'mp4' : 'jpg';
}
