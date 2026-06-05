// SMS provider abstraction for OTP delivery. Picks a real gateway when its
// credentials are present, otherwise logs the OTP (dev) so the flow stays
// testable without an account. Env (read at call time, import-order safe):
//   MSG91:  MSG91_AUTH_KEY, MSG91_SENDER_ID (6 chars), MSG91_OTP_TEMPLATE_ID
//   Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
const isProd = () => process.env.NODE_ENV === 'production';

function activeProvider() {
  if (process.env.MSG91_AUTH_KEY) return 'MSG91';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) return 'TWILIO';
  return 'MOCK';
}

// MSG91 expects an Indian mobile in 91XXXXXXXXXX form.
function toIndianMsisdn(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

async function sendViaMsg91(phone, otp) {
  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: process.env.MSG91_AUTH_KEY },
    body: JSON.stringify({
      mobile: toIndianMsisdn(phone),
      otp,
      sender: process.env.MSG91_SENDER_ID,
      template_id: process.env.MSG91_OTP_TEMPLATE_ID,
    }),
  });
  if (!res.ok) throw new Error(`MSG91 send failed (${res.status})`);
  return { sent: true, channel: 'msg91' };
}

async function sendViaTwilio(phone, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const to = String(phone).startsWith('+') ? phone : `+91${String(phone).replace(/\D/g, '').slice(-10)}`;
  const body = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_FROM,
    Body: `Your HomeHero verification code is ${otp}. It expires in 5 minutes.`,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
    },
    body,
  });
  if (!res.ok) throw new Error(`Twilio send failed (${res.status})`);
  return { sent: true, channel: 'twilio' };
}

export const smsProvider = {
  async sendOtp(phone, otp) {
    const provider = activeProvider();
    try {
      if (provider === 'MSG91') return await sendViaMsg91(phone, otp);
      if (provider === 'TWILIO') return await sendViaTwilio(phone, otp);
    } catch (err) {
      // Never block login on an SMS gateway hiccup; in dev fall through to log.
      console.error(`[SMS:${provider}] send failed:`, err?.message);
      if (isProd()) throw err;
    }
    if (!isProd()) console.log(`[SMS:mock] OTP for ${phone} is ${otp}`);
    return { sent: provider !== 'MOCK', channel: 'mock' };
  },
};

// In non-production we surface the OTP in the API response so the flow is
// testable without a real SMS gateway. Never leak it in production.
export function devOtp(otp) {
  return isProd() ? undefined : otp;
}
