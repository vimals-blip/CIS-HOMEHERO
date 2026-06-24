import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const token = jwt.sign({ user_id: 'usr-admin123', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET || '2104ba7667e9ed45e68eefca8ae7812c1eb1007178e1f73fb793de7e875d093d');
  
  console.log(`Testing AI Report...`);
  
  const res = await fetch(`http://localhost:4000/api/v1/admin/reports/ai-pdf`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  console.log("STATUS:", res.status);
  if (res.status === 200) {
    const buffer = await res.arrayBuffer();
    console.log("PDF length:", buffer.byteLength);
  } else {
    console.log("BODY:", await res.text());
  }
}

test().catch(console.error);
