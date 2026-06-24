import jwt from 'jsonwebtoken';
import fs from 'fs';
const token = jwt.sign({ user_id: 'usr-12345', role: 'ADMIN' }, process.env.JWT_SECRET || 'dev-secret');
fetch('http://localhost:4000/api/v1/bookings/bk-d794d7e2-3764-4a6d-94d6-8cad81ba1324/invoice/pdf', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(async res => {
  console.log("STATUS:", res.status);
  console.log("BODY:", await res.text());
})
.catch(err => console.error(err));
