import { createVerify } from 'node:crypto';

const FIREBASE_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const ALLOWED_MODELS = new Set([
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-tts',
]);
const ALLOWED_CONFIG_KEYS = new Set([
  'responseMimeType',
  'responseSchema',
  'responseModalities',
  'speechConfig',
  'systemInstruction',
  'temperature',
  'topP',
  'topK',
  'maxOutputTokens',
]);
const MAX_CONTENT_BYTES = 8 * 1024 * 1024;
const MAX_CONFIG_BYTES = 180 * 1024;
const MAX_OUTPUT_TOKENS = 8192;
const MINUTE_LIMIT = 20;
const DAILY_LIMIT = 150;

let certificateCache = { expiresAt: 0, certificates: null };
const usageMap = new Map();

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
};

const readJsonPart = (value) => JSON.parse(decodeBase64Url(value).toString('utf8'));

const getFirebaseCertificates = async () => {
  if (certificateCache.certificates && certificateCache.expiresAt > Date.now()) {
    return certificateCache.certificates;
  }

  const response = await fetch(FIREBASE_CERT_URL);
  if (!response.ok) throw new Error('Firebase signing certificates are unavailable');

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1]) || 3600;
  certificateCache = {
    certificates: await response.json(),
    expiresAt: Date.now() + Math.max(300, maxAge - 60) * 1000,
  };
  return certificateCache.certificates;
};

export const verifyFirebaseIdToken = async (token) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured');

  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Firebase token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = readJsonPart(encodedHeader);
  const payload = readJsonPart(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid Firebase token header');
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase token project mismatch');
  }
  if (!payload.sub || payload.sub.length > 128 || payload.exp <= now || payload.iat > now + 60 || payload.auth_time > now + 60) {
    throw new Error('Firebase token claims are invalid');
  }

  const certificates = await getFirebaseCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) throw new Error('Unknown Firebase signing key');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  if (!verifier.verify(certificate, decodeBase64Url(encodedSignature))) {
    throw new Error('Invalid Firebase token signature');
  }

  const allowedEmail = String(process.env.WYPS_ADMIN_EMAIL || '').trim().toLowerCase();
  if (allowedEmail && String(payload.email || '').toLowerCase() !== allowedEmail) {
    throw new Error('This account is not allowed');
  }

  return payload;
};

export const authorizeGeminiRequest = async (req, options = {}) => {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    try {
      return await verifyFirebaseIdToken(authHeader.slice(7));
    } catch (error) {
      if (/Invalid Firebase token|Firebase token project mismatch|Firebase token claims are invalid|Unknown Firebase signing key|Invalid Firebase token signature|This account is not allowed/i.test(error?.message || '')) {
        error.status = 401;
      }
      throw error;
    }
  }

  const legacyEnabled = process.env.ALLOW_LEGACY_WYPS_SECRET === 'true';
  const expectedSecret = process.env.WYPS_API_SECRET;
  if (legacyEnabled && expectedSecret && req.headers['x-wyps-secret'] === expectedSecret) {
    return { sub: 'legacy-owner' };
  }

  if (options.allowDevelopment && process.env.NODE_ENV !== 'production') {
    return { sub: 'local-development' };
  }

  const error = new Error('Authentication required');
  error.status = 401;
  throw error;
};

export const checkGeminiRateLimit = (identity, ip = 'unknown') => {
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const key = `${identity || 'unknown'}:${ip}`;
  const entry = usageMap.get(key) || { minuteStart: now, minuteCount: 0, dayKey, dayCount: 0 };

  if (now - entry.minuteStart >= 60_000) {
    entry.minuteStart = now;
    entry.minuteCount = 0;
  }
  if (entry.dayKey !== dayKey) {
    entry.dayKey = dayKey;
    entry.dayCount = 0;
  }

  entry.minuteCount += 1;
  entry.dayCount += 1;
  usageMap.set(key, entry);
  return entry.minuteCount > MINUTE_LIMIT || entry.dayCount > DAILY_LIMIT;
};

export const sanitizeGeminiRequest = (body = {}) => {
  const model = String(body.model || '');
  if (!ALLOWED_MODELS.has(model)) {
    const error = new Error('Requested Gemini model is not allowed');
    error.status = 400;
    throw error;
  }

  const contents = body.contents;
  const contentSize = Buffer.byteLength(JSON.stringify(contents || ''));
  if (!contents || contentSize > MAX_CONTENT_BYTES) {
    const error = new Error('Gemini request content is missing or too large');
    error.status = 413;
    throw error;
  }

  const rawConfig = body.config && typeof body.config === 'object' ? body.config : {};
  if (Buffer.byteLength(JSON.stringify(rawConfig)) > MAX_CONFIG_BYTES) {
    const error = new Error('Gemini request configuration is too large');
    error.status = 413;
    throw error;
  }

  const config = Object.fromEntries(
    Object.entries(rawConfig).filter(([key]) => ALLOWED_CONFIG_KEYS.has(key))
  );
  config.maxOutputTokens = Math.min(
    MAX_OUTPUT_TOKENS,
    Math.max(256, Number(config.maxOutputTokens) || MAX_OUTPUT_TOKENS)
  );

  return { model, contents, config };
};
