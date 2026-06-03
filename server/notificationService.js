export async function sendSms(phone, message) {
  console.log(`[SMS] To: ${phone} | Message: ${message}`);
  return { status: 'sent' };
}

export async function sendPush(userId, title, body) {
  console.log(`[PUSH] To: ${userId} | ${title}: ${body}`);
  return { status: 'sent' };
}
