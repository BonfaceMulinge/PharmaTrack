const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE = 'http://localhost:5000/api';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {},
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body && typeof body === 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (body && typeof body === 'string') req.write(body);
    req.end();
  });
}

function uploadFile(urlPath, filePath, token) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const fileName = path.basename(filePath);
    const parts = [];
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
    ));
    parts.push(fileData);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const url = new URL(BASE + urlPath);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition, detail) {
    if (condition) { console.log(`  PASS: ${label}`); passed++; }
    else { console.error(`  FAIL: ${label} — ${detail || ''}`); failed++; }
  }

  console.log('=== 1. Create Pharmacy (as Super Admin) ===');
  const saLogin = await request('POST', '/auth/login', JSON.stringify({
    email: 'bonnymulonzi1@gmail.com',
    password: 'Bonny100%',
  }));
  assert('Super Admin login', saLogin.status === 200, JSON.stringify(saLogin.data));
  const saToken = saLogin.data.token;
  assert('SA token received', !!saToken);

  const pharmacy = await request('POST', '/super-admin/pharmacies', JSON.stringify({
    name: 'Test Pharmacy',
    ownerName: 'Test Owner',
    email: 'testpharmacy@example.com',
    phone: '0700000000',
    password: 'TestPass123',
  }), saToken);
  assert('Pharmacy created', pharmacy.status === 201, JSON.stringify(pharmacy.data));

  console.log('\n=== 2. Login as Pharmacy Admin ===');
  const adminLogin = await request('POST', '/auth/login', JSON.stringify({
    email: 'testpharmacy@example.com',
    password: 'TestPass123',
  }));
  assert('Admin login', adminLogin.status === 200, JSON.stringify(adminLogin.data));
  const adminToken = adminLogin.data.token;
  const adminUser = adminLogin.data.user;
  assert('Admin token received', !!adminToken);
  assert('Admin has pharmacyId', !!adminUser?.pharmacyId, JSON.stringify(adminUser));
  assert('Must change password', adminUser?.mustChangePassword === true, JSON.stringify(adminUser));

  const changePw = await request('POST', '/auth/change-password', JSON.stringify({
    currentPassword: 'TestPass123',
    newPassword: 'NewPass123',
  }), adminToken);
  assert('Password changed', changePw.status === 200, JSON.stringify(changePw.data));

  const loginAfterPw = await request('POST', '/auth/login', JSON.stringify({
    email: 'testpharmacy@example.com',
    password: 'NewPass123',
  }));
  assert('Login after password change', loginAfterPw.status === 200);
  const finalToken = loginAfterPw.data.token;
  assert('Final token received', !!finalToken);

  console.log('\n=== 3. Upload Excel ===');
  const wb = XLSX.utils.book_new();
  const data = [
    ['Medicine Name', 'Available Stock', 'Cost Price', 'Selling Price', 'Category'],
    ['Paracetamol 500mg', 100, 5, 10, 'Tablets'],
    ['Amoxicillin 250mg', 50, 12, 20, 'Capsules'],
    ['Ibuprofen 400mg', 75, 8, 15, 'Tablets'],
    ['paracetamol 500mg', 25, 5, 10, 'Tablets'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const tmpFile = path.join(__dirname, 'prisma', '_test_import.xlsx');
  fs.writeFileSync(tmpFile, buf);

  const importResult = await uploadFile('/medicines/import', tmpFile, finalToken);
  assert('Import returns 200', importResult.status === 200, JSON.stringify(importResult.data));
  assert('Summary present', !!importResult.data.summary, JSON.stringify(importResult.data));
  const s = importResult.data.summary || {};
  assert('Total rows = 4', s.totalRows === 4, `got ${s.totalRows}`);
  assert('Created >= 3', s.created >= 3, `got created=${s.created}`);
  assert('Updated >= 1 (dup paracetamol)', s.updated >= 1, `got updated=${s.updated}`);
  assert('No failed rows', s.failedRows === 0, `got failedRows=${s.failedRows}`);

  fs.unlinkSync(tmpFile);

  console.log('\n=== 4. Verify Medicines ===');
  const meds = await request('GET', '/medicines', null, finalToken);
  assert('Medicines returned', meds.status === 200);
  const medList = Array.isArray(meds.data) ? meds.data : [];
  assert('3 unique medicines', medList.length === 3, `got ${medList.length}`);
  const paracetamol = medList.find((m) => m.name.toLowerCase() === 'paracetamol 500mg');
  assert('Paracetamol stock = 125 (100+25)', paracetamol?.quantity === 125, `got ${paracetamol?.quantity}`);

  console.log('\n=== 5. Dashboard Analytics ===');
  const analytics = await request('GET', '/reports/analytics', null, finalToken);
  assert('Analytics returned', analytics.status === 200);
  const a = analytics.data;
  assert('Total Medicines = 3', a.medicines === 3, `got ${a.medicines}`);
  assert('Inventory Value > 0', a.inventoryValue > 0, `got ${a.inventoryValue}`);
  assert('Today Transactions = 0', a.todayTransactions === 0, `got ${a.todayTransactions}`);
  assert('Low Stock calculated', typeof a.lowStock === 'number', `got ${a.lowStock}`);

  console.log('\n=== 6. Case-Insensitive Upload ===');
  const wb2 = XLSX.utils.book_new();
  const data2 = [
    ['MEDICINE NAME', 'AVAILABLE STOCK', 'COST PRICE', 'SELLING PRICE', 'CATEGORY'],
    ['Paracetamol 500mg', 50, 5, 10, 'Tablets'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(data2);
  XLSX.utils.book_append_sheet(wb2, ws2, 'Medicines');
  const buf2 = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });
  const tmpFile2 = path.join(__dirname, 'prisma', '_test_import2.xlsx');
  fs.writeFileSync(tmpFile2, buf2);

  const importResult2 = await uploadFile('/medicines/import', tmpFile2, finalToken);
  assert('Case-insensitive import 200', importResult2.status === 200, JSON.stringify(importResult2.data));
  const s2 = importResult2.data.summary || {};
  assert('Updated (existing paracetamol)', s2.updated >= 1, `got updated=${s2.updated}`);
  fs.unlinkSync(tmpFile2);

  const meds2 = await request('GET', '/medicines', null, finalToken);
  const paracetamol2 = (meds2.data || []).find((m) => m.name.toLowerCase() === 'paracetamol 500mg');
  assert('Paracetamol stock now 175 (125+50)', paracetamol2?.quantity === 175, `got ${paracetamol2?.quantity}`);

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
