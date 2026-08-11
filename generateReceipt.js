const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generatePdfReceipt(paymentData) {
  return new Promise((resolve, reject) => {
    try {
      const receiptsDir = path.join(__dirname, 'receipts');

      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filePath = path.join(receiptsDir, `receipt_${paymentData.mpesaReceiptNumber}.pdf`);
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fillColor('#1F2937')
        .fontSize(22)
        .text('RENT PAYMENT RECEIPT', { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(12)
        .fillColor('#10B981')
        .text('STATUS: CONFIRMED / PAID', { align: 'center' })
        .moveDown(1.5);

      // Details
      doc.fontSize(11).fillColor('#374151');
      const details = [
        ['Receipt No:', paymentData.mpesaReceiptNumber || 'N/A'],
        ['Date & Time:', new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })],
        ['Tenant Name:', paymentData.tenantName || 'Unregistered Tenant'],
        ['House Unit:', paymentData.houseNumber || 'N/A'],
        ['Phone Number:', paymentData.phoneNumber || 'N/A'],
        ['Amount Paid:', `KES ${Number(paymentData.amountPaid).toLocaleString()}`],
        ['Remaining Debt:', `KES ${Number(paymentData.remainingDebt || 0).toLocaleString()}`],
      ];

      details.forEach(([label, value]) => {
        doc.text(label, 50, doc.y, { width: 150, continued: true });
        doc.text(value, { align: 'right' });
        doc.moveDown(0.6);
      });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generatePdfReceipt;