/**
 * Raw LLM transport layer. Detects which provider is configured and knows
 * how to shape a request to each one. Returns plain text (the caller parses
 * JSON) so this file has zero knowledge of prompts or business logic.
 */
'use strict';

const config = require('../config');

function activeProvider() {
  const forced = (config.aiProvider || '').toLowerCase();
  if (forced === 'gemini' || forced === 'openai' || forced === 'fallback') return forced;
  if (config.geminiApiKey) return 'gemini';
  if (config.openaiApiKey) return 'openai';
  return 'fallback';
}

function providerInfo() {
  const provider = activeProvider();
  const model = provider === 'gemini' ? config.geminiModel : provider === 'openai' ? config.openaiModel : 'offline-engine';
  // Human-readable label surfaced by /api/health and the client status pill.
  const labels = {
    gemini: `Google Gemini (${model})`,
    openai: `OpenAI-compatible (${model})`,
    fallback: 'Offline reasoning engine',
  };
  return { provider, model, aiEnabled: provider !== 'fallback', label: labels[provider] };
}

/** Redact anything that looks like it could be a key from an error message. */
function redact(text) {
  return String(text).replace(/[A-Za-z0-9_-]{20,}/g, '[redacted]');
}

async function callGemini({ system, user, json, maxTokens, temperature }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        // Gemini 3 reasoning models default to "dynamic" thinking, which can
        // spend the whole output budget on internal reasoning before emitting
        // the answer (causing empty/stalled JSON responses). Keep thinking LOW
        // so tokens go to the actual output; harmless on non-thinking models.
        thinkingConfig: { thinkingLevel: 'LOW' },
        // Headroom above `maxTokens` so any residual thinking never starves the answer.
        maxOutputTokens: maxTokens + 1024,
        responseMimeType: json ? 'application/json' : 'text/plain',
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini request failed (${res.status}): ${redact(body).slice(0, 400)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('');
}

async function callOpenAiCompatible({ system, user, json, maxTokens, temperature }) {
  const url = `${config.openaiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model: config.openaiModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`OpenAI-compatible request failed (${res.status}): ${redact(bodyText).slice(0, 400)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Call the currently active provider. Throws on any failure (network,
 * timeout, non-2xx) - aiService.js is responsible for retry/fallback.
 */
async function complete({ system, user, json = true, maxTokens = 2400, temperature = 0.8 }) {
  const provider = activeProvider();
  if (provider === 'gemini') return callGemini({ system, user, json, maxTokens, temperature });
  if (provider === 'openai') return callOpenAiCompatible({ system, user, json, maxTokens, temperature });
  throw new Error('No AI provider configured');
}

module.exports = { activeProvider, providerInfo, complete };
