import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CATEGORIES, type Category, type EvidencePhoto } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { formatDate, isValidIsoDate } from '../exif';

interface Props {
  photo: EvidencePhoto;
  position: { index: number; total: number };
  onSave: (updated: EvidencePhoto, goNext: boolean) => void;
  onSkip: () => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

/** Light cleanup only: trim, capitalize the first letter, end with a period. Never adds facts. */
export function tidyCaption(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : cap + '.';
}

export function CaptionScreen({ photo, position, onSave, onSkip, onDelete, onBack }: Props) {
  const [note, setNote] = useState(photo.note);
  const [caption, setCaption] = useState(photo.caption);
  const [captionEdited, setCaptionEdited] = useState(photo.captioned);
  const [dateText, setDateText] = useState(photo.date ?? '');
  const [category, setCategory] = useState<Category | null>(photo.category);
  const [both, setBoth] = useState(photo.bothSpousesVisible);

  const onNoteChange = (t: string) => {
    setNote(t);
    if (!captionEdited) setCaption(tidyCaption(t));
  };

  const dateTrim = dateText.trim();
  const dateValid = dateTrim === '' || isValidIsoDate(dateTrim);
  const canSave = caption.trim().length > 0 && dateValid;

  const save = (goNext: boolean) => {
    if (!canSave) return;
    const hasExifDate = photo.dateSource === 'exif' && dateTrim === photo.date;
    onSave(
      {
        ...photo,
        note: note.trim(),
        caption: caption.trim(),
        category,
        bothSpousesVisible: both,
        date: dateTrim === '' ? null : dateTrim,
        dateSource: dateTrim === '' ? 'none' : hasExifDate ? 'exif' : 'couple',
        captioned: true,
      },
      goNext,
    );
  };

  const confirmDelete = () =>
    Alert.alert('Remove this photo?', 'It will be removed from your evidence set.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(photo.id) },
    ]);

  const isLast = position.index >= position.total - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.link}>‹ Back</Text>
          </Pressable>
          <Text style={styles.counter}>
            {position.index + 1} of {position.total}
          </Text>
          <Pressable onPress={confirmDelete} hitSlop={12}>
            <Text style={[styles.link, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Image
            source={{ uri: photo.uri }}
            style={[styles.photo, { aspectRatio: photo.width && photo.height ? Math.min(Math.max(photo.width / photo.height, 0.75), 1.5) : 1 }]}
            resizeMode="cover"
          />

          <Text style={styles.label}>When was this taken?</Text>
          {photo.dateSource === 'exif' && dateTrim === photo.date ? (
            <Text style={styles.hint}>
              {formatDate(photo.date)} · read from the photo. Edit below if it's wrong.
            </Text>
          ) : (
            <Text style={styles.hint}>
              {photo.dateSource === 'none'
                ? 'No date found in this photo. Add one if you know it.'
                : 'Date entered by you.'}
            </Text>
          )}
          <TextInput
            style={[styles.input, !dateValid && styles.inputError]}
            value={dateText}
            onChangeText={setDateText}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            maxLength={10}
          />
          {!dateValid && <Text style={styles.error}>Use the format YYYY-MM-DD, e.g. 2024-06-15.</Text>}

          <Text style={styles.label}>What was happening here?</Text>
          <Text style={styles.hint}>
            A sentence or two in your own words, e.g. "Our second date at the lake" or "The day I
            proposed."
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Where were you, what was the occasion?"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Caption for your exhibit</Text>
          <Text style={styles.hint}>
            Written by you. This is what appears next to the photo. Edit it freely.
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={caption}
            onChangeText={(t) => {
              setCaption(t);
              setCaptionEdited(true);
            }}
            placeholder="One short line"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Stage of your relationship</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(on ? null : c.key)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchTitle}>Both of us are in this photo</Text>
              <Text style={styles.hint}>Photos with both spouses are the strongest evidence.</Text>
            </View>
            <Switch
              value={both}
              onValueChange={setBoth}
              trackColor={{ true: colors.accent, false: colors.line }}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.skip} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable
            style={[styles.save, !canSave && styles.disabled]}
            onPress={() => save(!isLast)}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>{isLast ? 'Save' : 'Save & next'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  link: { color: colors.accent, fontSize: 16, fontWeight: '500' },
  counter: { color: colors.muted, fontSize: 14 },
  body: { padding: 16, paddingBottom: 32 },
  photo: { width: '100%', borderRadius: radius, backgroundColor: colors.line },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 20 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  input: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  multiline: { minHeight: 80 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  switchTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  skip: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: radius, backgroundColor: colors.accentSoft },
  skipText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  save: { flex: 1, paddingVertical: 14, borderRadius: radius, backgroundColor: colors.accent, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
