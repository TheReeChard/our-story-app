import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import {
  PROVIDERS,
  clearAiSettings,
  loadAiSettings,
  providerInfo,
  saveAiSettings,
  testConnection,
  type ProviderId,
} from '../ai/providers';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async (p?: ProviderId) => {
    const s = await loadAiSettings(p);
    setProvider(s.provider);
    setModel(s.model);
    setApiKey(s.apiKey);
    setStatus(null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pick = async (p: ProviderId) => {
    // Remember the current provider's edits, then show the new provider's stored values.
    await saveAiSettings({ provider, model, apiKey });
    const next = await loadAiSettings(p);
    await saveAiSettings(next); // makes p the active provider
    setProvider(next.provider);
    setModel(next.model);
    setApiKey(next.apiKey);
    setStatus(null);
  };

  const save = async () => {
    await saveAiSettings({ provider, model: model || providerInfo(provider).defaultModel, apiKey });
    onBack();
  };

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await testConnection({ provider, model: model || providerInfo(provider).defaultModel, apiKey });
      await saveAiSettings({ provider, model: model || providerInfo(provider).defaultModel, apiKey });
      setStatus({ ok: true, text: 'Connected. Your key works and is saved on this phone.' });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'Test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const wipe = () =>
    Alert.alert('Remove all AI keys?', 'Keys for every provider are deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearAiSettings();
          await load('anthropic');
        },
      },
    ]);

  if (loading) return null;
  const info = providerInfo(provider);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.link}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>AI settings</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>How this works</Text>
            <Text style={styles.noticeText}>
              The AI only runs when you tap "Suggest caption" on a photo. That one photo (shrunk) and
              your note are sent to the company you choose below, using your own account and key. Your
              key stays on this phone. Nothing is sent otherwise.
            </Text>
          </View>

          <Text style={styles.label}>AI provider</Text>
          <View style={styles.chips}>
            {PROVIDERS.map((p) => {
              const on = p.id === provider;
              return (
                <Pressable key={p.id} onPress={() => pick(p.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>API key</Text>
          <Text style={styles.hint}>{info.keyHelp}</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={info.keyPlaceholder}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <Pressable onPress={() => setShowKey((v) => !v)} hitSlop={8}>
            <Text style={[styles.link, { marginTop: 8, fontSize: 14 }]}>
              {showKey ? 'Hide key' : 'Show key'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Model</Text>
          <Text style={styles.hint}>
            Must be able to read images. Model names change over time. If you get a "model not found"
            error, check your provider's current list.
          </Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder={info.defaultModel}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <Pressable onPress={() => setModel(info.defaultModel)} hitSlop={8}>
            <Text style={[styles.link, { marginTop: 8, fontSize: 14 }]}>Use default</Text>
          </Pressable>

          {status && (
            <Text style={[styles.status, { color: status.ok ? colors.good : colors.danger }]}>
              {status.text}
            </Text>
          )}

          <Pressable onPress={wipe} style={styles.wipe}>
            <Text style={styles.wipeText}>Remove all saved keys</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.secondary, (!apiKey || testing) && styles.disabled]}
            onPress={test}
            disabled={!apiKey || testing}
          >
            {testing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.secondaryText}>Test</Text>
            )}
          </Pressable>
          <Pressable style={styles.save} onPress={save}>
            <Text style={styles.saveText}>Save</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  link: { color: colors.accent, fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  notice: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius,
    padding: 14,
  },
  noticeTitle: { fontWeight: '700', color: colors.ink, marginBottom: 4 },
  noticeText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 22 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
  status: { marginTop: 18, fontSize: 14, lineHeight: 20 },
  wipe: { alignItems: 'center', paddingVertical: 28 },
  wipeText: { color: colors.danger, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  secondary: {
    minWidth: 90,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  save: { flex: 1, paddingVertical: 14, borderRadius: radius, backgroundColor: colors.accent, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
