// FILE: lib/media.ts
import { supabase } from './supabase';

export const getSignedImageUrl = async (path: string) => {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('family-media')
    .createSignedUrl(path, 60 * 60); // URL valid for 1 hour

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  return data.signedUrl;
};