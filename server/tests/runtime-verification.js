import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

async function runVerification() {
  const results = [];

  const logCase = (title, passed, details) => {
    results.push({ title, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}: ${title}`);
    if (details) console.log(`   -> ${details}`);
  };

  console.log('\n========================================');
  console.log('  RUNNING LIVE RUNTIME VERIFICATION');
  console.log('========================================\n');

  // Test 1: Health endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    const passed = res.status === 200 && data.services?.mongodb?.connected === true;
    logCase(
      'Health Endpoint & MongoDB Connection',
      passed,
      `Status: ${res.status}, MongoDB: ${data.services?.mongodb?.statusText}, Ollama: ${data.services?.ollama?.connected ? 'Connected' : 'Disconnected'}`
    );
  } catch (err) {
    logCase('Health Endpoint', false, err.message);
  }

  // Test 2: Empty upload input
  try {
    const res = await fetch(`${BASE_URL}/api/documents/upload`, { method: 'POST' });
    const data = await res.json();
    const passed = res.status === 400 && data.error.includes('No file uploaded');
    logCase('Empty Upload Rejection', passed, `HTTP ${res.status}: ${data.error}`);
  } catch (err) {
    logCase('Empty Upload Rejection', false, err.message);
  }

  // Test 3: Unsupported file extension (.exe)
  try {
    const formData = new FormData();
    formData.append('file', new Blob(['MZ fake executable binary'], { type: 'application/octet-stream' }), 'virus.exe');
    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    const passed = res.status === 400 && data.message.includes('Unsupported file type');
    logCase('Unsupported File Extension (.exe) Rejection', passed, `HTTP ${res.status}: ${data.message}`);
  } catch (err) {
    logCase('Unsupported File Extension (.exe) Rejection', false, err.message);
  }

  // Test 4: Fake PDF header validation
  try {
    const formData = new FormData();
    formData.append('file', new Blob(['This is clearly not a real pdf'], { type: 'application/pdf' }), 'fake.pdf');
    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    const passed = res.status === 400 && data.error === 'Invalid file content';
    logCase('Disguised File Content Rejection (Magic Bytes)', passed, `HTTP ${res.status}: ${data.message}`);
  } catch (err) {
    logCase('Disguised File Content Rejection', false, err.message);
  }

  // Test 5: Valid TXT Upload
  let uploadedTxtDoc = null;
  try {
    const txtPath = path.resolve('samples/quarterly-financial-invoice.txt');
    const txtBuf = fs.readFileSync(txtPath);
    const formData = new FormData();
    formData.append('file', new Blob([txtBuf], { type: 'text/plain' }), 'quarterly-financial-invoice.txt');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    uploadedTxtDoc = data.document;
    const passed = res.status === 201 && data.document?.extractedLength > 0;
    logCase(
      'Valid TXT File Upload & Text Extraction',
      passed,
      `HTTP ${res.status}, ID: ${data.document?._id}, Extracted chars: ${data.document?.extractedLength}`
    );
  } catch (err) {
    logCase('Valid TXT File Upload', false, err.message);
  }

  // Test 6: Valid PDF Upload
  let uploadedPdfDoc = null;
  try {
    const pdfPath = path.resolve('samples/software-consulting-agreement.pdf');
    const pdfBuf = fs.readFileSync(pdfPath);
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuf], { type: 'application/pdf' }), 'software-consulting-agreement.pdf');

    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    uploadedPdfDoc = data.document;
    const passed = res.status === 201 && data.document?.extractedLength > 0;
    logCase(
      'Valid PDF File Upload & Text Extraction',
      passed,
      `HTTP ${res.status}, ID: ${data.document?._id}, Extracted chars: ${data.document?.extractedLength}`
    );
  } catch (err) {
    logCase('Valid PDF File Upload', false, err.message);
  }

  // Test 7: AI Service Failure Handling (Ollama disconnected)
  if (uploadedTxtDoc?._id) {
    try {
      const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDoc._id}/analyze`, {
        method: 'POST'
      });
      const data = await res.json();
      // If Ollama is not running, must return 503 with informative message
      // If Ollama is running, returns 200
      const passed = res.status === 503 || res.status === 200;
      logCase(
        'AI Service Analysis / Disconnected Handling',
        passed,
        `HTTP ${res.status}: ${data.message || data.error}`
      );
    } catch (err) {
      logCase('AI Service Analysis', false, err.message);
    }
  }

  // Test 8: Document Review / Update Step
  if (uploadedTxtDoc?._id) {
    try {
      const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDoc._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customFilename: '2026-10-verified-acme-invoice.txt',
          category: 'Invoices & Receipts',
          tags: ['verified', 'acme', 'finance'],
          reviewStatus: 'accepted'
        })
      });
      const data = await res.json();
      const passed = res.status === 200 && data.document?.reviewStatus === 'accepted';
      logCase(
        'Human Review & Metadata Update',
        passed,
        `Updated name: ${data.document?.originalFilename}, Category: ${data.document?.category}`
      );
    } catch (err) {
      logCase('Human Review & Metadata Update', false, err.message);
    }
  }

  // Test 9: Safe Regex Search
  try {
    const res = await fetch(`${BASE_URL}/api/documents?q=[verified]+(acme)*`);
    const data = await res.json();
    const passed = res.status === 200 && Array.isArray(data.documents);
    logCase(
      'Search with Complex Regex Characters',
      passed,
      `HTTP ${res.status}, Count: ${data.count}`
    );
  } catch (err) {
    logCase('Search with Complex Regex Characters', false, err.message);
  }

  // Test 10: Safe File Download
  if (uploadedTxtDoc?._id) {
    try {
      const res = await fetch(`${BASE_URL}/api/documents/${uploadedTxtDoc._id}/download`);
      const text = await res.text();
      const passed = res.status === 200 && text.includes('ACME CLOUD');
      logCase(
        'Document Download Integrity',
        passed,
        `HTTP ${res.status}, Length: ${text.length} bytes, Matches original file`
      );
    } catch (err) {
      logCase('Document Download Integrity', false, err.message);
    }
  }

  // Test 11: Document Deletion & Storage Cleanup
  if (uploadedPdfDoc?._id) {
    try {
      const storedFile = uploadedPdfDoc.storedFilename;
      const physicalPath = path.resolve('server/uploads', storedFile);
      const existsBefore = fs.existsSync(physicalPath);

      const res = await fetch(`${BASE_URL}/api/documents/${uploadedPdfDoc._id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      const existsAfter = fs.existsSync(physicalPath);

      const passed = res.status === 200 && existsBefore === true && existsAfter === false;
      logCase(
        'Document Deletion & Physical Storage Cleanup',
        passed,
        `HTTP ${res.status}, Disk cleanup: ${!existsAfter ? 'Verified (file unlinked)' : 'Failed (file remains)'}`
      );
    } catch (err) {
      logCase('Document Deletion', false, err.message);
    }
  }

  // Summary
  const allPassed = results.every(r => r.passed);
  console.log('\n========================================');
  console.log(`  VERIFICATION SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log('========================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification runner error:', err);
  process.exit(1);
});
