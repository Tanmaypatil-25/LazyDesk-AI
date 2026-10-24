import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import pdfParse from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createPdf(filename, title, paragraphs) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, compress: false, pdfVersion: '1.4' });
    const filePath = path.resolve(__dirname, filename);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    doc.fontSize(20).text(title, { underline: true });
    doc.moveDown(1.5);

    paragraphs.forEach((p) => {
      doc.fontSize(12).text(p);
      doc.moveDown(1);
    });

    doc.end();

    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

async function main() {
  console.log('Generating test PDF documents using pdfkit...');

  // PDF 1: Software Consulting Agreement
  const agreementPath = await createPdf(
    'software-consulting-agreement.pdf',
    'MASTER SOFTWARE CONSULTING AGREEMENT',
    [
      'This Software Consulting Agreement ("Agreement") is executed on October 20, 2026, by and between Apex Global Technologies Inc. ("Client") and Tanmay Sharma ("Contractor").',
      'RECITALS: Client desires to retain Contractor to architect and implement an open-source, privacy-first document organizer known as LazyDesk AI, leveraging on-device Gemma models and local Ollama inference.',
      'SCOPE OF SERVICES: Contractor shall deliver a fully functional MERN stack web application with document extraction, text sanitization, structured categorization, and review workflows for Hacktoberfest 2026 Week 3.',
      'COMPENSATION & TERMS: Total contract consideration is $12,500 USD, payable upon milestone completion. All work product shall be published under the open-source MIT License.',
      'CONFIDENTIALITY & DATA SECURITY: No document data, customer personal identifiable information (PII), or private keys shall be transmitted to external cloud AI providers. All inference must remain 100% on the local perimeter.'
    ]
  );

  // PDF 2: Medical Equipment Invoice & Spec
  const specPath = await createPdf(
    'quantum-sensor-hardware-spec.pdf',
    'HARDWARE SPECIFICATION & COMPLIANCE SHEET',
    [
      'Product Name: Quantum Precision Temperature Sensor (Model QS-2026)',
      'Manufacturer: NeoSensors Industrial Automation GmbH',
      'Date of Calibration: October 14, 2026',
      'Operating Voltage: 3.3V DC to 5.0V DC. Operating Temperature Range: -40°C to +125°C.',
      'Accuracy Rating: +/- 0.05°C with digital I2C bus interface.',
      'Compliance Certifications: CE Mark, RoHS Compliant, ISO 9001:2015 certified manufacturing standards.',
      'Maintenance Protocol: Annual recalibration recommended using certified liquid-nitrogen reference wells.'
    ]
  );

  // Verify extraction with pdf-parse
  const buffer1 = fs.readFileSync(agreementPath);
  const parsed1 = await pdfParse(buffer1);
  console.log('Verified Agreement PDF extraction:', parsed1.text.slice(0, 150) + '...');

  const buffer2 = fs.readFileSync(specPath);
  const parsed2 = await pdfParse(buffer2);
  console.log('Verified Spec PDF extraction:', parsed2.text.slice(0, 150) + '...');

  console.log('All sample PDFs generated successfully!');
}

main().catch(console.error);
