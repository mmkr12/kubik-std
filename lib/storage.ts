import { createClient } from '@/lib/supabase/client';

export async function uploadImage(bucket: 'sketches' | 'finished-photos', file: File) {
  const supabase = createClient();
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
