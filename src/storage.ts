import * as FileSystem from 'expo-file-system/legacy';
import type { EvidencePhoto } from './types';

const ROOT = (FileSystem.documentDirectory ?? '') + 'evidence/';
const PHOTO_DIR = ROOT + 'photos/';
const DB_FILE = ROOT + 'photos.json';

async function ensureDirs(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function loadPhotos(): Promise<EvidencePhoto[]> {
  try {
    await ensureDirs();
    const info = await FileSystem.getInfoAsync(DB_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(DB_FILE);
    return JSON.parse(raw) as EvidencePhoto[];
  } catch {
    return [];
  }
}

export async function savePhotos(photos: EvidencePhoto[]): Promise<void> {
  await ensureDirs();
  await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(photos));
}

/** Copy a picked photo into app storage so it survives the picker's temp cache being cleared. */
export async function importPhotoFile(sourceUri: string, id: string): Promise<string> {
  await ensureDirs();
  const ext = (sourceUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const dest = `${PHOTO_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deletePhotoFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/** Privacy: wipe every photo and caption stored by the app. */
export async function deleteEverything(): Promise<void> {
  await FileSystem.deleteAsync(ROOT, { idempotent: true });
}
