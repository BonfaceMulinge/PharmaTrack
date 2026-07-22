import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { authFetch, API_URL, getUser } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { subscribe, Events } from '../store';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const getCurrentStock = (medicine) => Number(medicine.quantity ?? 0);

const MedicineCard = memo(function MedicineCard({ medicine, onAddToCart }) {
  return (
    <article className="medicine-card">
      <div className="medicine-card-media">
        <span>{medicine.name?.charAt(0) || 'M'}</span>
      </div>
      <div className="medicine-card-body">
        <div className="pill-row">
          <span className="pill">{medicine.category || 'Other'}</span>
          <span className="pill">Stock {getCurrentStock(medicine)}</span>
        </div>
        <h4>{medicine.name}</h4>
        <div className="price-row">
          <strong>{formatCurrency(Number(medicine.sellingPrice))}</strong>
          <button className="primary-btn" type="button" onClick={() => onAddToCart(medicine)}>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
});

const CartItem = memo(function CartItem({ item, onUpdateQuantity, onRemove }) {
  return (
    <div className="cart-item">
      <div>
        <strong>{item.name}</strong>
        <p>{formatCurrency(item.unitPrice)} each</p>
      </div>
      <div className="qty-controls">
        <button className="qty-btn" type="button" onClick={() => onUpdateQuantity(item.medicineId, -1)}>&minus;</button>
        <span>{item.quantity}</span>
        <button className="qty-btn" type="button" onClick={() => onUpdateQuantity(item.medicineId, 1)}>+</button>
      </div>
      <div className="cart-meta">
        <strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
        <button className="ghost-btn small-btn" type="button" onClick={() => onRemove(item.medicineId)}>Remove</button>
      </div>
    </div>
  );
});

const Receipt = memo(function Receipt({ receipt }) {
  return (
    <div className="receipt-card">
      <h4>Receipt</h4>
      <p><strong>#{receipt.receiptNumber}</strong></p>
      <p>{receipt.date}</p>
      <p>Cashier: {receipt.cashierName}</p>
      <ul>
        {receipt.items.map((item) => (
          <li key={item.medicineId}>
            {item.name} x {item.quantity} &mdash; {formatCurrency(item.subtotal)}
          </li>
        ))}
      </ul>
      <p><strong>Total: {formatCurrency(receipt.total)}</strong></p>
      <p>Payment: {receipt.paymentMethod}</p>
      <button className="ghost-btn" type="button" onClick={() => window.print()}>Print Receipt</button>
    </div>
  );
});

function SalesPos({ onSaleComplete, onBackToDashboard }) {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receipt, setReceipt] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 150);

  const loadMedicines = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/medicines`);
      if (!response.ok) throw new Error('Failed to load medicines');
      const data = await response.json();
      setMedicines(data.filter((medicine) => getCurrentStock(medicine) > 0));
    } catch (err) {
      console.error(err);
      setError('Unable to load medicines right now.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const response = await authFetch(`${API_URL}/medicines`);
        if (cancelled || !response.ok) return;
        const data = await response.json();
        setMedicines(data.filter((medicine) => getCurrentStock(medicine) > 0));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Unable to load medicines right now.');
      }
    };
    init();
    const unsub = subscribe(Events.MEDICINES_CHANGED, loadMedicines);
    return () => { cancelled = true; unsub(); };
  }, [loadMedicines]);

  const categories = useMemo(() =>
    ['ALL', ...new Set(medicines.map((medicine) => medicine.category || 'Other'))],
    [medicines]
  );

  const filteredMedicines = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return medicines.filter((medicine) => {
      const matchesSearch = medicine.name.toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'ALL' || medicine.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, debouncedSearch, selectedCategory]);

  const total = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cart]
  );

  const addToCart = useCallback((medicine) => {
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
  }, []);

  const updateQuantity = useCallback((medicineId, delta) => {
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
  }, []);

  const removeFromCart = useCallback((medicineId) => {
    setCart((current) => current.filter((item) => item.medicineId !== medicineId));
    setError('');
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e) => {
    setSelectedCategory(e.target.value);
  }, []);

  const handleReceiptNumberChange = useCallback((e) => {
    setReceiptNumber(e.target.value);
  }, []);

  const handlePaymentMethodChange = useCallback((e) => {
    setPaymentMethod(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!cart.length) {
      setError('Add at least one medicine to the cart before checkout.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const finalReceipt = receiptNumber || `RCPT-${crypto.randomUUID().slice(0, 8)}`;

    const snapshot = cart.map((item) => ({
      medicineId: item.medicineId,
      soldQuantity: item.quantity,
    }));

    setMedicines((prev) => prev.map((med) => {
      const sold = snapshot.find((s) => s.medicineId === med.id);
      if (!sold) return med;
      return { ...med, quantity: Math.max(0, (med.quantity || 0) - sold.soldQuantity) };
    }));

    const payload = {
      totalAmount: total,
      discount: 0,
      tax: 0,
      paymentMethod,
      receiptNumber: finalReceipt,
      items: cart.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.quantity * item.unitPrice,
      })),
      payments: [{ amount: total, method: paymentMethod }],
    };

    try {
      const response = await authFetch(`${API_URL}/sales`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Sale failed');

      const user = getUser();
      const receiptData = {
        receiptNumber: result.receiptNumber || finalReceipt,
        cashierName: user?.fullName || 'Cashier',
        paymentMethod,
        date: new Date().toLocaleString('en-KE'),
        items: cart.map((item) => ({ ...item, subtotal: item.quantity * item.unitPrice })),
        total,
      };

      setReceipt(receiptData);
      setSuccess(result.message || 'Sale completed successfully');
      if (onSaleComplete) onSaleComplete();
      setCart([]);
      setReceiptNumber('');
    } catch (err) {
      setMedicines((prev) => prev.map((med) => {
        const sold = snapshot.find((s) => s.medicineId === med.id);
        if (!sold) return med;
        return { ...med, quantity: (med.quantity || 0) + sold.soldQuantity };
      }));
      setError(err.message || 'Unable to complete the sale.');
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, total, paymentMethod, receiptNumber, onSaleComplete]);

  return (
    <div className="pos-shell">
      <div className="pos-toolbar">
        <div>
          <p className="eyebrow">Point of Sale</p>
          <h2>Pharmacy POS</h2>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={onBackToDashboard}>
            &larr; Back
          </button>
        </div>
      </div>

      {error && <div className="status-banner error-banner">{error}</div>}
      {success && <div className="status-banner success-banner">{success}</div>}

      <div className="pos-layout">
        <section className="panel pos-products">
          <div className="panel-header">
            <h3>Available Medicines</h3>
            <span>{filteredMedicines.length} item(s)</span>
          </div>

          <div className="pos-filters">
            <input className="search-input" placeholder="Search by medicine name" value={searchTerm} onChange={handleSearchChange} />
            <select value={selectedCategory} onChange={handleCategoryChange}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="loading-state">Loading medicines...</div>
          ) : (
            <div className="medicine-grid">
              {filteredMedicines.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} onAddToCart={addToCart} />
              ))}
              {filteredMedicines.length === 0 && (
                <div className="empty-state-full">No medicines available</div>
              )}
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
                <CartItem key={item.medicineId} item={item} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-grid">
              <input placeholder="Receipt Number" value={receiptNumber} onChange={handleReceiptNumberChange} />
              <select value={paymentMethod} onChange={handlePaymentMethodChange}>
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
                {isSubmitting ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </form>

          {receipt && <Receipt receipt={receipt} />}
        </aside>
      </div>
    </div>
  );
}

export default memo(SalesPos);
