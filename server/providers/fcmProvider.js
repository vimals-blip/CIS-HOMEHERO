// Push notification provider (Firebase Cloud Messaging) behind an interface.
// Mock logs the push; real mode sends via firebase-admin when configured.
const isProd = process.env.NODE_ENV === 'production';
export const fcmEnabled = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID);

let messaging = null;
async function getMessaging() {
  if (!fcmEnabled) return null;
  if (messaging) return messaging;
  try {
    // Lazy import so firebase-admin is only needed when actually configured.
    const admin = (await import('firebase-admin')).default;
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;
      admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);
    }
    messaging = admin.messaging();
    return messaging;
  } catch (err) {
    console.error('FCM init failed:', err?.message);
    return null;
  }
}

export const fcmProvider = {
  async send(tokens, { title, body, data }) {
    if (!tokens?.length) return { sent: 0 };
    const m = await getMessaging();
    if (!m) {
      if (!isProd) console.log(`[FCM:mock] → ${tokens.length} device(s): ${title} — ${body}`);
      return { sent: 0, channel: 'mock' };
    }
    const res = await m.sendEachForMulticast({ tokens, notification: { title, body }, data: data ?? {} });
    return { sent: res.successCount, channel: 'fcm' };
  },
};
