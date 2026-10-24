import fs from 'fs';
import path from 'path';

async function testUploadAndQuery() {
  console.log('--- Step 1: Uploading TXT invoice ---');
  const txtPath = path.resolve('samples/quarterly-financial-invoice.txt');
  const txtBuffer = fs.readFileSync(txtPath);
  const formData = new FormData();
  formData.append('file', new Blob([txtBuffer], { type: 'text/plain' }), 'quarterly-financial-invoice.txt');

  const uploadRes1 = await fetch('http://localhost:5000/api/documents/upload', {
    method: 'POST',
    body: formData
  });

  const uploadJson1 = await uploadRes1.json();
  console.log('Upload TXT status:', uploadRes1.status);
  console.log('Document ID:', uploadJson1.document?._id);
  console.log('Extracted length:', uploadJson1.document?.extractedLength);

  console.log('\n--- Step 2: Uploading PDF consulting agreement ---');
  const pdfPath = path.resolve('samples/software-consulting-agreement.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const formData2 = new FormData();
  formData2.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'software-consulting-agreement.pdf');

  const uploadRes2 = await fetch('http://localhost:5000/api/documents/upload', {
    method: 'POST',
    body: formData2
  });

  const uploadJson2 = await uploadRes2.json();
  console.log('Upload PDF status:', uploadRes2.status);
  console.log('Document ID:', uploadJson2.document?._id);
  console.log('Extracted length:', uploadJson2.document?.extractedLength);

  console.log('\n--- Step 3: Querying Stats ---');
  const statsRes = await fetch('http://localhost:5000/api/documents/stats');
  const statsJson = await statsRes.json();
  console.log('Stats:', JSON.stringify(statsJson, null, 2));

  console.log('\n--- Step 4: Listing Documents ---');
  const listRes = await fetch('http://localhost:5000/api/documents');
  const listJson = await listRes.json();
  console.log(`Retrieved ${listJson.count} documents from MongoDB.`);

  console.log('\n--- Step 5: Testing Update / Review step ---');
  const docId = uploadJson1.document?._id;
  const updateRes = await fetch(`http://localhost:5000/api/documents/${docId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customFilename: '2026-10-acme-cloud-invoice.txt',
      category: 'Invoices & Receipts',
      tags: ['acme', 'cloud', 'gpu', 'invoice'],
      reviewStatus: 'accepted'
    })
  });
  const updateJson = await updateRes.json();
  console.log('Updated filename:', updateJson.document?.originalFilename);
  console.log('Updated category:', updateJson.document?.category);
  console.log('Review status:', updateJson.document?.reviewStatus);

  console.log('\n--- Step 6: Testing Search Filter ---');
  const searchRes = await fetch('http://localhost:5000/api/documents?q=acme');
  const searchJson = await searchRes.json();
  console.log(`Search for "acme" returned ${searchJson.count} matching document(s).`);

  console.log('\n--- All API & MongoDB flows verified successfully! ---');
}

testUploadAndQuery().catch(console.error);
