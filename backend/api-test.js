const http = require('http');

async function fetchApi(method, path, body = null, token = null) {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Auth Tests ---');
  
  // Test 1: Register missing fields
  let res = await fetchApi('POST', '/api/auth/register', {});
  console.log('POST /api/auth/register (empty body):', res.status);
  
  // Test 2: Register invalid email
  res = await fetchApi('POST', '/api/auth/register', { name: 'Test', email: 'invalid', password: 'password123' });
  console.log('POST /api/auth/register (invalid email):', res.status);

  // Test 3: Register valid user
  const email = `testuser${Date.now()}@test.com`;
  res = await fetchApi('POST', '/api/auth/register', { name: 'Test User', email, password: 'password123' });
  console.log('POST /api/auth/register (valid user):', res.status);
  
  // Test 4: Login valid user
  res = await fetchApi('POST', '/api/auth/login', { email, password: 'password123' });
  console.log('POST /api/auth/login (valid user):', res.status);
  const token = res.body?.accessToken;

  // Test 5: Login invalid password
  res = await fetchApi('POST', '/api/auth/login', { email, password: 'wrongpassword' });
  console.log('POST /api/auth/login (invalid password):', res.status);

  console.log('\n--- User Features ---');
  // Test 6: Create Blog
  res = await fetchApi('POST', '/api/blogs', { title: 'Test Blog', content: 'Test Content', excerpt: 'Test Excerpt', category: 'invalidid' }, token);
  console.log('POST /api/blogs (invalid category id):', res.status, res.body);
}

runTests();
