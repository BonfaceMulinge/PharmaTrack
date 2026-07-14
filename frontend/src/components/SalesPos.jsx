import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const getCurrentStock = (medicine) => Number(medicine.currentStock ?? medicine.quantity ?? 0);

function SalesPos({ onSaleComplete, onBackToDashboard }) {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadMedicines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/medicines`);
      if (!response.ok) throw new Error('Failed to load medicines');
      const data = await response.json();
      setMedicines(data.filter((medicine) => getCurrentStock(medicine) > 0));
    } catch (err) {
      console.error(err);
      setError('Unable to load medicines right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const categories = ['ALL', ...new Set(medicines.map((medicine) => medicine.category?.name || 'Uncategorized'))];

  const filteredMedicines = medicines.filter((medicine) => {
    const matchesSearch = [medicine.name, medicine.genericName, medicine.barcode]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || medicine.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const addToCart = (medicine) => {
    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.medicineId === medicine.id);
      const currentStock = getCurrentStock(medicine);
      if (existing) {
        if (existing.quantity >= currentStock) {
          setError(`Only ${currentStock} unit(s) available for ${medicine.name}.`);
          return current;
        }
        return current.map((item) =>
          item.medicineId === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { medicineId: medicine.id, name: medicine.name, unitPrice: Number(medicine.sellingPrice), quantity: 1, availableQuantity: currentStock }];
    });
  };

  const updateQuantity = (medicineId, delta) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.medicineId !== medicineId) return [item];
        const nextQuantity = item.quantity + delta;
        if (nextQuantity <= 0) return [];
        if (nextQuantity > item.availableQuantity) {
          setError(`Only ${item.availableQuantity} unit(s) available for ${item.name}.`);
          return [item];
        }
        return [{ ...item, quantity: nextQuantity }];
      })
    );
    setError('');
  };

  const removeFromCart = (medicineId) => {
    setCart((current) => current.filter((item) => item.medicineId !== medicineId));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!cart.length) {
      setError('Add at least one medicine to the cart before checkout.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      customerId: null,
      totalAmount: total,
      discount: 0,
      tax: 0,
      paymentMethod,
      receiptNumber: receiptNumber || `RCPT-${Date.now()}`,
      items: cart.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.quantity * item.unitPrice,
      })),
      payments: [{ amount: total, method: paymentMethod }],
    };

    try {
      const response = await fetch(`${API_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Sale failed');

      const finalReceipt = {
        receiptNumber: result.receiptNumber || payload.receiptNumber,
        cashierName: 'Demo Cashier',
        paymentMethod,
        date: new Date().toLocaleString('en-KE'),
        items: cart.map((item) => ({ ...item, subtotal: item.quantity * item.unitPrice })),
        total,
      };

      setReceipt(finalReceipt);
      setSuccess(result.message || 'Sale completed successfully');
      if (onSaleComplete) {
        onSaleComplete({ totalAmount: total, items: cart });
      }
      setCart([]);
      setReceiptNumber('');
      loadMedicines();
    } catch (err) {
      setError(err.message || 'Unable to complete the sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-shell">
      <div className="pos-toolbar">
        <div>
          <p className="eyebrow">Point of Sale</p>
          <h2>Pharmacy POS</h2>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={onBackToDashboard}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {error ? <div className="status-banner error-banner">{error}</div> : null}
      {success ? <div className="status-banner success-banner">{success}</div> : null}

      <div className="pos-layout">
        <section className="panel pos-products">
          <div className="panel-header">
            <h3>Available Medicines</h3>
            <span>{filteredMedicines.length} item(s)</span>
          </div>

          <div className="pos-filters">
            <input
              className="search-input"
              placeholder="Search by name, barcode, or generic name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="loading-state">Loading medicines…</div>
          ) : (
            <div className="medicine-grid">
              {filteredMedicines.map((medicine) => (
                <article key={medicine.id} className="medicine-card">
                  <div className="medicine-card-media">
                    {medicine.imageUrl ? (
                      <img src={medicine.imageUrl} alt={medicine.name} />
                    ) : (
                      <span>{medicine.name?.charAt(0) || 'M'}</span>
                    )}
                  </div>
                  <div className="medicine-card-body">
                    <div className="pill-row">
                      <span className="pill">{medicine.category?.name || 'Uncategorized'}</span>
                      <span className="pill">Stock {getCurrentStock(medicine)}</span>
                    </div>
                    <h4>{medicine.name}</h4>
                    <p>{medicine.genericName || 'Generic name unavailable'}</p>
                    <p className="muted">Batch: {medicine.batchNumber || '—'}</p>
                    <p className="muted">Expiry: {medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString('en-KE') : '—'}</p>
                    <div className="price-row">
                      <strong>{formatCurrency(Number(medicine.sellingPrice))}</strong>
                      <button className="primary-btn" type="button" onClick={() => addToCart(medicine)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel pos-cart">
          <div className="panel-header">
            <h3>Shopping Cart</h3>
            <span>{cart.length} item(s)</span>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">Select medicines from the inventory to begin checkout.</div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.medicineId} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <div className="qty-controls">
                    <button className="qty-btn" type="button" onClick={() => updateQuantity(item.medicineId, -1)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button className="qty-btn" type="button" onClick={() => updateQuantity(item.medicineId, 1)}>
                      +
                    </button>
                  </div>
                  <div className="cart-meta">
                    <strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
                    <button className="ghost-btn small-btn" type="button" onClick={() => removeFromCart(item.medicineId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-grid">
              <input
                placeholder="Receipt Number"
                value={receiptNumber}
                onChange={(event) => setReceiptNumber(event.target.value)}
              />
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>

            <div className="checkout-summary">
              <div className="summary-line">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <button className="primary-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Processing…' : 'Complete Sale'}
              </button>
            </div>
          </form>

          {receipt ? (
            <div className="receipt-card">
              <h4>Receipt Preview</h4>
              <p><strong>#{receipt.receiptNumber}</strong></p>
              <p>{receipt.date}</p>
              <p>Cashier: {receipt.cashierName}</p>
              <ul>
                {receipt.items.map((item) => (
                  <li key={item.medicineId}>
                    {item.name} × {item.quantity} — {formatCurrency(item.subtotal)}
                  </li>
                ))}
              </ul>
              <p><strong>Total: {formatCurrency(receipt.total)}</strong></p>
              <p>Payment: {receipt.paymentMethod}</p>
              <button className="ghost-btn" type="button" onClick={() => window.print()}>
                Print Receipt
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default SalesPos;
