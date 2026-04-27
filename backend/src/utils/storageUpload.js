import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_BUCKET = 'missing-diary';       // existing bucket for images
const VIDEO_BUCKET = 'missing-diary-videos'; // new dedicated bucket for videos

/**
 * Upload an image buffer to Supabase Storage (missing-diary bucket).
 */
export async function uploadImageToStorage(buffer, mimetype, folder = 'missing-persons') {
  const ext = mimetype.split('/')[1].replace('jpeg', 'jpg');
  const path = `${folder}/${uuidv4()}.${ext}`;

  console.log(`[Storage:image] bucket="${IMAGE_BUCKET}" path="${path}" size=${buffer.length}`);

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, buffer, { contentType: mimetype, upsert: false });

  if (error) {
    console.error(`[Storage:image] Upload failed:`, error);
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Upload a video buffer to Supabase Storage (missing-diary-videos bucket).
 */
export async function uploadVideoToStorage(buffer, mimetype, folder = 'missing-persons') {
  const ext = mimetype.split('/')[1]
    .replace('quicktime', 'mov')
    .replace('x-matroska', 'mkv');
  const path = `${folder}/${uuidv4()}.${ext}`;

  console.log(`[Storage:video] bucket="${VIDEO_BUCKET}" path="${path}" size=${buffer.length}`);

  const { error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(path, buffer, { contentType: mimetype, upsert: false });

  if (error) {
    console.error(`[Storage:video] Upload failed:`, error);
    throw new Error(`Video upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Keep generic export for sightings (images only)
export async function uploadBufferToStorage(buffer, mimetype, folder = 'missing-persons') {
  return uploadImageToStorage(buffer, mimetype, folder);
}
