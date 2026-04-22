const http = require('http');

fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({phoneNumber:'010-1234-5678', password:'5678'}),
  headers: { 'Content-Type': 'application/json' }
}).then(async r => {
  const cookie = r.headers.get('set-cookie');
  console.log('Cookie:', cookie);
  const adminPage = await fetch('http://localhost:3000/admin', {
    headers: { 'cookie': cookie.split(';')[0] }
  });
  console.log('Status:', adminPage.status);
  console.log('Headers:', adminPage.headers);
});
