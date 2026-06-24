import dotenv from 'dotenv';
dotenv.config();

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;

const phone = '+919999999999'; // dummy just to see if it authenticates
const body = new URLSearchParams({
  To: phone,
  From: from,
  Body: `Test message`,
});

fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
  },
  body,
}).then(r => r.json()).then(console.log).catch(console.error);
