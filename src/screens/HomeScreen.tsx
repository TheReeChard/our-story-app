import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { EvidencePhoto } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { formatDate } from '../exif';

interface Props {
  photos: EvidencePhoto[];
  busy: boolean;
  onAddPhotos: () => void;
  onOpenPhoto: (id: string) => void;
  onCaptionNext: () => void;
  onDeleteAll: () => void;
  onOpenSettings: () => void;
}

const GAP = 8;
const COLS = 3;

export function HomeScreen({
  photos,
  busy,
  onAddPhotos,
  onOpenPhoto,
  onCaptionNext,
  onDeleteAll,
  onOpenSettings,
}: Props) {
  const { width } = useWindowDimensions();
  const size = (width - 32 - GAP * (COLS - 1)) / COLS;
  const todo = photos.filter((p) => !p.captioned).length;
  const both = photos.filter((p) => p.captioned && p.bothSpousesVisible).length;

  const confirmDeleteAll = () =>
    Alert.alert(
      'Delete everything?',
      'This removes every photo and caption stored in this app. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete all', style: 'destructive', onPress: onDeleteAll },
      ],
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Our Story</Text>
        <Text style={styles.subtitle}>
          Photos that show your relationship over time, each with a short caption in your own words.
        </Text>
        <Pressable onPress={onOpenSettings} hitSlop={8}>
          <Text style={styles.settingsLink}>⚙ AI settings</Text>
        </Pressable>
      </View>

      {photos.length > 0 && (
        <View style={styles.stats}>
          <Stat label="Photos" value={photos.length} />
          <Stat label="Need captions" value={todo} tone={todo ? 'warn' : 'good'} />
          <Stat label="Both of you" value={both} />
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnPrimary, busy && styles.disabled]}
          onPress={onAddPhotos}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>{busy ? 'Importing…' : '+ Add photos'}</Text>
        </Pressable>
        {todo > 0 && (
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCaptionNext}>
            <Text style={styles.btnSecondaryText}>Caption next ({todo})</Text>
          </Pressable>
        )}
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Start with a few favorites</Text>
          <Text style={styles.emptyBody}>
            Pick photos of the two of you from different times: when you met, dates, trips, the
            proposal, your wedding, everyday life together. Dates are read from each photo
            automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenPhoto(item.id)}
              style={{ width: size }}
              accessibilityLabel={item.captioned ? item.caption : 'Photo needs a caption'}
            >
              <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: 10 }} />
              <View style={[styles.badge, item.captioned ? styles.badgeDone : styles.badgeTodo]}>
                <Text style={styles.badgeText}>{item.captioned ? '✓' : '!'}</Text>
              </View>
              <Text style={styles.thumbDate} numberOfLines={1}>
                {formatDate(item.date)}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable onPress={confirmDeleteAll} style={styles.deleteAll}>
              <Text style={styles.deleteAllText}>Delete all my data</Text>
            </Pressable>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'good' }) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          tone === 'warn' && { color: colors.warn },
          tone === 'good' && { color: colors.good },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 21 },
  settingsLink: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 10 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent, flex: 1 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { backgroundColor: colors.accentSoft },
  btnSecondaryText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  empty: { padding: 24, marginHorizontal: 16, backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  emptyBody: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  grid: { paddingHorizontal: 16, paddingBottom: 40 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.good },
  badgeTodo: { backgroundColor: colors.warn },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  thumbDate: { fontSize: 11, color: colors.muted, marginTop: 3 },
  deleteAll: { alignItems: 'center', paddingVertical: 24 },
  deleteAllText: { color: colors.danger, fontSize: 14 },
});
