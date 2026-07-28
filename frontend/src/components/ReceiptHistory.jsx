import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { subscribe, Events } from '../store';
import ReceiptModal from './ReceiptModal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

function ReceiptHistory() {
  const [receipts, setReceipts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);

  const debouncedSearch = useDebounce(search, 300);
  const pharmacyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const requests = [authFetch(`${API_URL}/receipts?${params}`)];
        if (!pharmacyRef.current) requests.push(authFetch(`${API_URL}/receipts/pharmacy-profile`));

        const results = await Promise.all(requests);
        if (cancelled) return;

        const [receiptsRes, profileRes] = results;
        if (receiptsRes.ok) {
          const data = await receiptsRes.json();
          setReceipts(data.receipts || []);
          setTotal(data.total || 0);
        }
        if (profileRes && profileRes.ok) {
          const pData = await profileRes.json();
          pharmacyRef.current = pData.pharmacy;
          setPharmacy(pData.pharmacy);
        }
      } catch (err) {
        console.error('[ReceiptHistory] Load error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    const unsub = subscribe(Events.SALE_COMPLETED, load);
    return () => { cancelled = true; unsub(); };
  }, [page, debouncedSearch, dateFrom, dateTo]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleDateFromChange = useCallback((e) => {
    setDateFrom(e.target.value);
    setPage(1);
  }, []);

  const handleDateToChange = useCallback((e) => {
    setDateTo(e.target.value);
    setPage(1);
  }, []);

  const handleViewReceipt = useCallback(async (receiptId) => {
    try {
      const res = await authFetch(`${API_URL}/receipts/${receiptId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReceipt(data.receipt);
      }
    } catch (err) {
      console.error('[ReceiptHistory] View error:', err);
    }
  }, []);

  const handleCloseReceipt = useCallback(() => {
    setSelectedReceipt(null);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="receipt-history-page">
      <div className="topbar">
        <div>
          <p className="eyebrow">Records</p>
          <h1>Receipt History</h1>
        </div>
      </div>

      <div className="receipt-filters">
        <input
          className="search-input"
          placeholder="Search by receipt # or cashier..."
          value={search}
          onChange={handleSearchChange}
        />
        <div className="date-filters">
          <label>
            From
            <input type="date" value={dateFrom} onChange={handleDateFromChange} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={handleDateToChange} />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Receipts ({total})</h3>
        </div>

        {isLoading ? (
          <div className="loading-state">Loading receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="empty-state-full">No receipts found</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.receiptNumber}</strong></td>
                    <td>{new Date(r.createdAt).toLocaleDateString('en-KE')}</td>
                    <td>{r.user?.fullName || 'N/A'}</td>
                    <td>{formatCurrency(r.totalAmount)}</td>
                    <td>{formatCurrency(r.amountPaid)}</td>
                    <td>{formatCurrency(r.balance)}</td>
                    <td><span className="pill">{(r.paymentMethod || '').replace('_', ' ')}</span></td>
                    <td>
                      <button className="ghost-btn small-btn" type="button" onClick={() => handleViewReceipt(r.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="ghost-btn small-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <button className="ghost-btn small-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} pharmacy={pharmacy} onClose={handleCloseReceipt} />
      )}
    </div>
  );
}

export default memo(ReceiptHistory);
