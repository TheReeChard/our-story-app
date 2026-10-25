import * as SecureStore from 'expo-secure-store';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  defaultModel: string;
  keyHelp: string;
  keyPlaceholder: string;
}

// Model names change often. These are defaults only; the Settings screen lets you edit them.
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-haiku-5-5',
    keyHelp: 'Get a key at console.anthropic.com',
    keyPlaceholder: 'sk-ant-…',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-6-astra',
    keyHelp: 'Get a key at platform.openai.com',
    keyPlaceholder: 'sk-…',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-3.5-flash-lite',
    keyHelp: 'Get a key at aistudio.google.com',
    keyPlaceholder: 'AIza…',
  },
];

export const providerInfo = (id: ProviderId): ProviderInfo =>
  PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];

/* ---------------- settings (key kept in the phone's secure store) ---------------- */

export interface AiSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

const K_PROVIDER = 'ai_provider';
const kModel = (p: ProviderId) => `ai_model_${p}`;
const kKey = (p: ProviderId) => `ai_key_${p}`;

export async function loadAiSettings(forProvider?: ProviderId): Promise<AiSettings> {
  const stored = (await SecureStore.getItemAsync(K_PROVIDER)) as ProviderId | null;
  const provider = forProvider ?? (stored && PROVIDERS.some((p) => p.id === stored) ? stored : 'anthropic');
  const model = (await SecureStore.getItemAsync(kModel(provider))) || providerInfo(provider).defaultModel;
  const apiKey = (await SecureStore.getItemAsync(kKey(provider))) || '';
  return { provider, model, apiKey };
}

export async function saveAiSettings(s: AiSettings): Promise<void> {
  await SecureStore.setItemAsync(K_PROVIDER, s.provider);
  await SecureStore.setItemAsync(kModel(s.provider), s.model.trim());
  if (s.apiKey.trim()) await SecureStore.setItemAsync(kKey(s.provider), s.apiKey.trim());
  else await SecureStore.deleteItemAsync(kKey(s.provider));
}

export async function clearAiSettings(): Promise<void> {
  for (const p of PROVIDERS) {
    await SecureStore.deleteItemAsync(kKey(p.id));
    await SecureStore.deleteItemAsync(kModel(p.id));
  }
  await SecureStore.deleteItemAsync(K_PROVIDER);
}

/* ---------------- calling the model ---------------- */

interface ModelRequest {
  system: string;
  text: string;
  imageBase64?: string; // JPEG
  maxTokens: number;
}

export class AiError extends Error {}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new AiError(
      (e as Error).name === 'AbortError'
        ? 'The request timed out. Check your connection and try again.'
        : 'Could not reach the AI service. Check your internet connection.',
    );
  } finally {
    clearTimeout(timer);
  }
  const raw = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const detail: string =
      json?.error?.message ?? json?.error?.status ?? json?.message ?? raw.slice(0, 160);
    if (res.status === 401 || res.status === 403)
      throw new AiError('The provider rejected your API key. Check it in AI settings.');
    if (res.status === 404)
      throw new AiError(`Model not found. Check the model name in AI settings. (${detail})`);
    if (res.status === 429)
      throw new AiError('Rate limit or quota reached on your account. Try again shortly.');
    throw new AiError(`The AI service returned an error (${res.status}): ${detail}`);
  }
  return json;
}

async function callModel(s: AiSettings, req: ModelRequest): Promise<string> {
  if (!s.apiKey) throw new AiError('No API key set. Add one in AI settings.');
  let out: string | undefined;

  if (s.provider === 'anthropic') {
    const content: unknown[] = [];
    if (req.imageBase64)
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: req.imageBase64 },
      });
    content.push({ type: 'text', text: req.text });
    const j = await postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' },
      { model: s.model, max_tokens: req.maxTokens, system: req.system, messages: [{ role: 'user', content }] },
    );
    out = (j?.content ?? []).find((c: any) => c.type === 'text')?.text;
  } else if (s.provider === 'openai') {
    const content: unknown[] = [{ type: 'text', text: req.text }];
    if (req.imageBase64)
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${req.imageBase64}` },
      });
    const j = await postJson(
      'https://api.openai.com/v1/chat/completions',
      { authorization: `Bearer ${s.apiKey}` },
      {
        model: s.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content },
        ],
      },
    );
    out = j?.choices?.[0]?.message?.content;
  } else {
    const parts: unknown[] = [];
    if (req.imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: req.imageBase64 } });
    parts.push({ text: req.text });
    const j = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`,
      { 'x-goog-api-key': s.apiKey },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: req.maxTokens },
      },
    );
    out = j?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === 'string')?.text;
  }

  if (!out || !out.trim()) throw new AiError('The AI returned an empty answer. Try again.');
  return out.trim();
}

export async function testConnection(s: AiSettings): Promise<void> {
  await callModel(s, {
    system: 'You are a connection test.',
    text: 'Reply with the single word: ok',
    maxTokens: 20,
  });
}

/* ---------------- caption suggestion ---------------- */

const CAPTION_SYSTEM = `You help a married couple write short captions for photos they will submit as evidence of a genuine marriage.
Write ONE sentence in the first person plural (we, us, our) describing only what is plainly visible in the photo, plus anything the couple tells you.
Rules:
- Never invent names, places, occasions, dates, relationships or feelings that are not visible or provided.
- Do not identify anyone. Do not guess age, ethnicity, religion, health or immigration status.
- If something is unclear, stay general rather than guessing.
- Maximum 25 words. Plain, warm wording. No hashtags or emoji.
- Output only the caption sentence.`;

/** Downscale and re-encode so uploads stay small and cheap. */
async function prepareImage(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) throw new AiError('Could not prepare the photo for the AI.');
  return out.base64;
}

export async function suggestCaption(
  photoUri: string,
  ctx: { dateText?: string; note?: string; category?: string },
): Promise<string> {
  const s = await loadAiSettings();
  if (!s.apiKey) throw new AiError('No API key set. Add one in AI settings.');
  const imageBase64 = await prepareImage(photoUri);
  const lines: string[] = ['Write the caption for this photo.'];
  if (ctx.dateText) lines.push(`Photo date: ${ctx.dateText}.`);
  if (ctx.category) lines.push(`Stage of our relationship: ${ctx.category}.`);
  if (ctx.note) lines.push(`What we told you about it: "${ctx.note}". Use this, in our voice.`);
  const text = await callModel(s, {
    system: CAPTION_SYSTEM,
    text: lines.join('\n'),
    imageBase64,
    maxTokens: 120,
  });
  return text.replace(/^["“]|["”]$/g, '').trim();
}
