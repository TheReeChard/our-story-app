import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { HomeScreen } from './src/screens/HomeScreen';
import { CaptionScreen } from './src/screens/CaptionScreen';
import {
  deleteEverything,
  deletePhotoFile,
  importPhotoFile,
  loadPhotos,
  savePhotos,
} from './src/storage';
import { exifDateToIso } from './src/exif';
import type { EvidencePhoto } from './src/types';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos().then((p) => {
      setPhotos(p);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: EvidencePhoto[]) => {
    setPhotos(next);
    try {
      await savePhotos(next);
    } catch {
      Alert.alert('Could not save', 'Your latest change may not have been stored. Please try again.');
    }
  }, []);

  const addPhotos = useCallback(async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        exif: true,
        quality: 1,
      });
      if (result.canceled || result.assets.length === 0) return;

      const added: EvidencePhoto[] = [];
      for (const a of result.assets) {
        const id = newId();
        const uri = await importPhotoFile(a.uri, id);
        const date = exifDateToIso(a.exif ?? null);
        added.push({
          id,
          uri,
          width: a.width,
          height: a.height,
          date,
          dateSource: date ? 'exif' : 'none',
          note: '',
          caption: '',
          category: null,
          bothSpousesVisible: false,
          captioned: false,
          addedAt: new Date().toISOString(),
        });
      }
      // Oldest first so captioning walks through the relationship in order.
      const merged = [...photos, ...added].sort((x, y) =>
        (x.date ?? '9999').localeCompare(y.date ?? '9999'),
      );
      await persist(merged);
      if (added.length) setOpenId(added[0].id);
    } catch (e) {
      Alert.alert('Could not import photos', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [photos, persist]);

  const handleSave = useCallback(
    async (updated: EvidencePhoto, goNext: boolean) => {
      const next = photos
        .map((p) => (p.id === updated.id ? updated : p))
        .sort((x, y) => (x.date ?? '9999').localeCompare(y.date ?? '9999'));
      await persist(next);
      if (!goNext) {
        setOpenId(null);
        return;
      }
      const after = next.find((p) => !p.captioned && p.id !== updated.id);
      setOpenId(after ? after.id : null);
    },
    [photos, persist],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const target = photos.find((p) => p.id === id);
      if (target) await deletePhotoFile(target.uri);
      await persist(photos.filter((p) => p.id !== id));
      setOpenId(null);
    },
    [photos, persist],
  );

  const handleSkip = useCallback(() => {
    const idx = photos.findIndex((p) => p.id === openId);
    const next = photos.slice(idx + 1).find((p) => !p.captioned);
    setOpenId(next ? next.id : null);
  }, [photos, openId]);

  const handleDeleteAll = useCallback(async () => {
    await deleteEverything();
    setPhotos([]);
    setOpenId(null);
  }, []);

  if (!loaded) return null;

  const current = openId ? photos.find((p) => p.id === openId) : undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {current ? (
        <CaptionScreen
          key={current.id}
          photo={current}
          position={{ index: photos.findIndex((p) => p.id === current.id), total: photos.length }}
          onSave={handleSave}
          onSkip={handleSkip}
          onDelete={handleDelete}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <HomeScreen
          photos={photos}
          busy={busy}
          onAddPhotos={addPhotos}
          onOpenPhoto={setOpenId}
          onCaptionNext={() => {
            const next = photos.find((p) => !p.captioned);
            if (next) setOpenId(next.id);
          }}
          onDeleteAll={handleDeleteAll}
        />
      )}
    </SafeAreaProvider>
  );
}
