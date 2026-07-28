import { useCallback, useRef, memo } from 'react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const ReceiptModal = memo(function ReceiptModal({ receipt, pharmacy, onClose }) {
  const receiptRef = useRef(null);

  const handlePrint = useCallback(() => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt?.receiptNumber || ''}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 72mm;
            padding: 4mm;
          }
          .receipt-header { text-align: center; margin-bottom: 8px; }
          .receipt-header .pharmacy-name { font-size: 14px; font-weight: 700; }
          .receipt-header .pharmacy-info { font-size: 10px; color: #333; }
          .receipt-divider { border-top: 1px dashed #000; margin: 6px 0; }
          .receipt-row { display: flex; justify-content: space-between; margin: 2px 0; }
          .receipt-label { color: #333; }
          .receipt-value { font-weight: 600; }
          .receipt-items { margin: 6px 0; }
          .receipt-item { margin: 4px 0; }
          .receipt-item-name { font-weight: 600; }
          .receipt-item-detail { font-size: 10px; color: #333; }
          .receipt-totals { margin-top: 6px; }
          .receipt-total-line { display: flex; justify-content: space-between; margin: 2px 0; }
          .receipt-total-grand { font-size: 14px; font-weight: 700; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
          .receipt-footer { text-align: center; margin-top: 8px; font-size: 10px; color: #333; }
          .receipt-footer .powered { margin-top: 6px; font-size: 9px; color: #666; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, [receipt]);

  const handleDownloadPDF = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${receipt?.receiptNumber || 'unknown'}.pdf`);
    } catch (err) {
      console.error('[Receipt] PDF download error:', err);
    }
  }, [receipt]);

  if (!receipt) return null;

  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const pharmacyData = pharmacy || receipt.pharmacy || {};

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-modal-header">
          <h3>Receipt</h3>
          <button className="ghost-btn small-btn" type="button" onClick={onClose}>
            &times; Close
          </button>
        </div>

        <div className="receipt-modal-body">
          <div className="receipt-paper" ref={receiptRef}>
            <div className="receipt-header">
              {pharmacyData.logo ? (
                <img src={pharmacyData.logo} alt="Pharmacy Logo" className="receipt-logo" />
              ) : (
                <div className="receipt-logo-placeholder">
                  <span>{(pharmacyData.name || 'PT').charAt(0)}</span>
                </div>
              )}
              <div className="pharmacy-name">{pharmacyData.name || 'Pharmacy'}</div>
              {pharmacyData.address && <div className="pharmacy-info">{pharmacyData.address}</div>}
              {pharmacyData.phone && <div className="pharmacy-info">Tel: {pharmacyData.phone}</div>}
              {pharmacyData.email && <div className="pharmacy-info">{pharmacyData.email}</div>}
              {pharmacyData.licenseNumber && <div className="pharmacy-info">License: {pharmacyData.licenseNumber}</div>}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-details">
              <div className="receipt-row">
                <span className="receipt-label">Receipt No:</span>
                <span className="receipt-value">{receipt.receiptNumber}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Date:</span>
                <span className="receipt-value">{new Date(receipt.createdAt).toLocaleString('en-KE')}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Cashier:</span>
                <span className="receipt-value">{receipt.user?.fullName || 'N/A'}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Payment:</span>
                <span className="receipt-value">{receipt.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
              </div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-items-section">
              <div className="receipt-items-header">
                <span>Item</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Subtotal</span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="receipt-item-row">
                  <span className="receipt-item-name">{item.name}</span>
                  <span>{item.quantity}</span>
                  <span>{formatCurrency(item.unitPrice)}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-totals">
              <div className="receipt-total-line">
                <span>Subtotal</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              <div className="receipt-total-line">
                <span>Discount</span>
                <span>{formatCurrency(receipt.discount)}</span>
              </div>
              <div className="receipt-total-line">
                <span>Tax/VAT</span>
                <span>{formatCurrency(receipt.tax)}</span>
              </div>
              <div className="receipt-total-line receipt-total-grand">
                <span>TOTAL</span>
                <span>{formatCurrency(receipt.totalAmount)}</span>
              </div>
              <div className="receipt-total-line">
                <span>Paid</span>
                <span>{formatCurrency(receipt.amountPaid)}</span>
              </div>
              <div className="receipt-total-line">
                <span>Balance</span>
                <span>{formatCurrency(receipt.balance)}</span>
              </div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-footer">
              <p>Thank you for choosing {pharmacyData.name || 'Pharmacy'}.</p>
              <p>Please keep this receipt.</p>
              <p>Medicines sold cannot be returned once opened.</p>
              <p className="powered">Powered by PharmaTrack</p>
            </div>
          </div>
        </div>

        <div className="receipt-modal-actions">
          <button className="primary-btn" type="button" onClick={handlePrint}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Receipt
          </button>
          <button className="primary-btn" type="button" onClick={handleDownloadPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download PDF
          </button>
          <button className="ghost-btn" type="button" disabled title="Coming soon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Email Receipt
          </button>
        </div>
      </div>
    </div>
  );
});

export default ReceiptModal;
