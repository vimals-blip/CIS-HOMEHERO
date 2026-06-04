// SMS provider abstraction. Mock implementation logs the OTP; swap the body
// for a real gateway (MSG91 / Twilio) when SMS_PROVIDER credentials are set.
const isProd = process.env.NODE_ENV === 'production';

export const smsProvider = {
  async sendOtp(phone, otp) {
    // TODO(slice-real-sms): call MSG91/Twilio when creds present.
    if (!isProd) console.log(`[SMS:mock] OTP for ${phone} is ${otp}`);
    return { sent: true, channel: 'mock' };
  },
};

// In non-production we surface the OTP in the API response so the flow is
// testable without a real SMS gateway. Never leak it in production.
export function devOtp(otp) {
  return isProd ? undefined : otp;
}
