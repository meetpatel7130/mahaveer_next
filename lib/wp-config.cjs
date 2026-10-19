'use strict';

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode  = require('qrcode-terminal');
const logger  = require('./whatsapp-logger.cjs');
const fs      = require('fs');
const path    = require('path');

// ── Multi-session store ───────────────────────────────────────────────────
const sessions = {};

// ── Resolve the exact folder wwebjs creates for a user ───────────────────
// wwebjs LocalAuth with dataPath='./whatsapp-sessions' and clientId='user_X'
// creates: <dataPath>/.wwebjs_auth/session-user_X/
const getSessionDir = (userId) =>
  path.resolve(process.cwd(), 'whatsapp-sessions', '.wwebjs_auth', `session-user_${userId}`);

const getCacheDir = () =>
  path.resolve(process.cwd(), 'whatsapp-sessions', '.wwebjs_cache');

// ── Delete session + cache folders ───────────────────────────────────────
const clearSessionFolder = (userId) => {
  const sessionDir = getSessionDir(userId);
  const cacheDir   = getCacheDir();

  logger.info(`[WHATSAPP] Attempting to clear: ${sessionDir}`);

  for (const dir of [sessionDir, cacheDir]) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        fs.rmSync(/*turbopackIgnore: true*/ dir, { recursive: true, force: true });
        logger.info(`[WHATSAPP] Deleted: ${dir}`);
      } else {
        logger.info(`[WHATSAPP] Not found (already clean): ${dir}`);
      }
    } catch (err) {
      logger.warn(`[WHATSAPP] Could not delete ${dir}: ${err.message}`);
    }
  }
};

// ── Safely destroy a Puppeteer client ────────────────────────────────────
const safeDestroy = async (client) => {
  if (!client) return;
  try { await client.destroy(); } catch { /* ignore */ }
};

// ── Mark session as failed and clean up ──────────────────────────────────
const handleFailure = async (userId, client, errorMessage, shouldClearSession = true) => {
  const session = sessions[userId];
  if (session) {
    session.status = 'disconnected';
    session.qr     = null;
    session.error  = errorMessage;
    session.client = null;
  }
  await safeDestroy(client);
  if (shouldClearSession) clearSessionFolder(userId);
};

// ── Initialize WhatsApp client for a user ────────────────────────────────
const initClientForUser = (userId) => {
  if (!sessions[userId]) {
    sessions[userId] = { client: null, status: 'disconnected', qr: null, error: null };
  }

  const session = sessions[userId];

  // already running
  if (session.client && session.status !== 'disconnected') {
    logger.info(`[WHATSAPP] Already running for user=${userId} status=${session.status}`);
    return;
  }

  session.client = null;
  session.status = 'initializing';
  session.qr     = null;
  session.error  = null;

  logger.info(`[WHATSAPP] Initializing | user=${userId}`);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user_${userId}`,
      dataPath : path.resolve(process.cwd(), 'whatsapp-sessions'),
    }),
    puppeteer: {
      headless: true,
      handleSIGINT : false,   // let Node handle it, not Puppeteer
      handleSIGTERM: false,
      handleSIGHUP : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
      ],
    },
    // Increase timeouts — "execution context destroyed" is often a timeout
    webVersionCache: {
      type     : 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  });

  session.client = client;

  client.on('qr', (qr) => {
    session.status = 'qr_pending';
    session.qr     = qr;
    session.error  = null;
    logger.info(`[WHATSAPP] QR ready | user=${userId}`);
    try { qrcode.generate(qr, { small: true }); } catch { /* terminal optional */ }
  });

  client.on('authenticated', () => {
    session.status = 'authenticated';
    session.qr     = null;
    session.error  = null;
    logger.info(`[WHATSAPP] Authenticated | user=${userId}`);
  });

  client.on('ready', () => {
    session.status = 'ready';
    session.qr     = null;
    session.error  = null;
    logger.info(`[WHATSAPP] Ready | user=${userId}`);
  });

  client.on('auth_failure', async (msg) => {
    logger.error(`[WHATSAPP] Auth failure | user=${userId} | ${msg}`);
    await handleFailure(userId, client, `Auth failed: ${msg}`, true);
  });

  client.on('disconnected', async (reason) => {
    logger.warn(`[WHATSAPP] Disconnected | user=${userId} | ${reason}`);
    // Don't clear session on normal disconnect — only on errors
    await handleFailure(userId, client, null, false);
  });

  // ── initialize() — all errors caught here ────────────────────────────
  client.initialize().catch(async (err) => {
    logger.error(`[WHATSAPP] Initialize failed | user=${userId} | ${err.message}`);

    const isContextError = err.message.includes('Execution context was destroyed')
      || err.message.includes('context was destroyed');
    const isNetworkError = err.message.includes('net::')
      || err.message.includes('ERR_NAME_NOT_RESOLVED')
      || err.message.includes('ERR_INTERNET_DISCONNECTED')
      || err.message.includes('Navigation failed')
      || err.message.includes('ERR_CONNECTION_REFUSED');
    const isProtocolError = err.message.includes('Protocol error')
      || err.message.includes('Target closed')
      || err.message.includes('Session closed');

    // For context/protocol errors: retry ONCE without clearing session
    if (isContextError || isProtocolError) {
      logger.warn(`[WHATSAPP] Retrying once after context error | user=${userId}`);
      await safeDestroy(client);
      session.client = null;
      session.status = 'disconnected';
      session.error  = `Retrying… (${err.message.slice(0, 60)})`;
      // Short delay then re-init
      setTimeout(() => {
        session.status = 'disconnected'; // ensure re-init allowed
        session.error  = null;
        initClientForUser(userId);
      }, 3000);
      return;
    }

    // For network/stale session errors: clear and let user reconnect manually
    await handleFailure(
      userId,
      client,
      isNetworkError
        ? `Network error — session cleared. Click Connect to get a fresh QR.`
        : err.message,
      true  // clear session folder
    );
  });
};

// ── Get status ────────────────────────────────────────────────────────────
const getStatusForUser = (userId) => {
  const s = sessions[userId];
  if (!s) return { status: 'not_initialized', ready: false, qr: null, error: null };
  return { status: s.status, ready: s.status === 'ready', qr: s.qr, error: s.error };
};

// ── Send PDF ──────────────────────────────────────────────────────────────
const sendPDFAsUser = async (userId, toNumber, pdfBuffer, caption = '') => {
  const session = sessions[userId];
  if (!session || session.status !== 'ready') {
    throw new Error(`WhatsApp not ready for user ${userId}. Status: ${session?.status || 'not_initialized'}`);
  }

  const chatId       = toNumber.replace(/[^0-9]/g, '') + '@c.us';
  const isRegistered = await session.client.isRegisteredUser(chatId);
  if (!isRegistered) throw new Error(`Number ${toNumber} is not registered on WhatsApp.`);

  const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), 'Quotation.pdf');
  await session.client.sendMessage(chatId, media, { caption });
  logger.info(`[WHATSAPP] PDF sent | user=${userId} | to=${toNumber}`);
};

// ── Logout ────────────────────────────────────────────────────────────────
const logoutUser = async (userId) => {
  const session = sessions[userId];
  if (session?.client) {
    try { await session.client.logout(); } catch { /* ignore */ }
    await safeDestroy(session.client);
  }
  delete sessions[userId];
  clearSessionFolder(userId);
  logger.info(`[WHATSAPP] Session destroyed | user=${userId}`);
};

// ── Admin: all sessions ───────────────────────────────────────────────────
const getAllSessions = () =>
  Object.entries(sessions).map(([userId, s]) => ({
    userId,
    status: s.status,
    ready : s.status === 'ready',
    error : s.error,
  }));

// ── Global safety net ────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason);
  if (
    msg.includes('net::') ||
    msg.includes('Execution context') ||
    msg.includes('Protocol error') ||
    msg.includes('Target closed') ||
    msg.includes('Session closed') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    logger.error(`[WHATSAPP] Suppressed crash: ${msg}`);
    return;
  }
  logger.error(`[UNHANDLED REJECTION] ${msg}`);
});

module.exports = { initClientForUser, getStatusForUser, sendPDFAsUser, logoutUser, getAllSessions };