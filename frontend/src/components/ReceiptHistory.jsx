import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { subscribe, Events } from '../store';
import ReceiptModal from './ReceiptModal';
import formatCurrency from '../utils/formatCurrency';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' },
];

function ReceiptHistory() {
  const [receipts, setReceipts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [summary, setSummary] = useState({ receiptsToday: 0, salesToday: 0, receiptsMonth: 0, salesMonth: 0 });
  const [exporting, setExporting] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const pharmacyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (datePreset && datePreset !== 'custom') params.set('datePreset', datePreset);
        if (datePreset === 'custom') {
          if (dateFrom) params.set('dateFrom', dateFrom);
          if (dateTo) params.set('dateTo', dateTo);
        }
        if (showArchived) params.set('archived', 'true');

        const requests = [
          authFetch(`${API_URL}/receipts?${params}`),
          authFetch(`${API_URL}/receipts/summary`),
        ];
        if (!pharmacyRef.current) requests.push(authFetch(`${API_URL}/receipts/pharmacy-profile`));

        const results = await Promise.all(requests);
        if (cancelled) return;

        const [receiptsRes, summaryRes, profileRes] = results;
        if (receiptsRes.ok) {
          const data = await receiptsRes.json();
          setReceipts(data.receipts || []);
          setTotal(data.total || 0);
        }
        if (summaryRes.ok) {
          const sData = await summaryRes.json();
          setSummary(sData);
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
  }, [page, debouncedSearch, datePreset, dateFrom, dateTo, showArchived]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handlePresetChange = useCallback((value) => {
    setDatePreset(value);
    setPage(1);
    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
    }
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

  const handleArchive = useCallback(async (id) => {
    try {
      const res = await authFetch(`${API_URL}/receipts/${id}/archive`, { method: 'PUT' });
      if (res.ok) {
        const data = await res.json();
        setReceipts((prev) => prev.map((r) => r.id === id ? { ...r, archived: data.receipt.archived } : r));
      }
    } catch (err) {
      console.error('[ReceiptHistory] Archive error:', err);
    }
  }, []);

  const handleExport = useCallback(async (format) => {
    if (format === 'pdf') {
      return;
    }
    setExporting(format);
    try {
      const params = new URLSearchParams({ format });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (datePreset && datePreset !== 'custom') params.set('datePreset', datePreset);
      if (datePreset === 'custom') {
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
      }
      if (showArchived) params.set('archived', 'true');

      const res = await authFetch(`${API_URL}/receipts/export?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReceiptHistory] Export error:', err);
    } finally {
      setExporting('');
    }
  }, [debouncedSearch, datePreset, dateFrom, dateTo, showArchived]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="receipt-history-page">
      <div className="topbar">
        <div>
          <p className="eyebrow">Records</p>
          <h1>Receipt History</h1>
        </div>
      </div>

      <div className="receipt-summary-cards">
        <div className="summary-card">
          <span className="summary-card-label">Receipts Today</span>
          <span className="summary-card-value">{summary.receiptsToday}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-label">Sales Today</span>
          <span className="summary-card-value">{formatCurrency(summary.salesToday)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-label">Receipts This Month</span>
          <span className="summary-card-value">{summary.receiptsMonth}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-label">Sales This Month</span>
          <span className="summary-card-value">{formatCurrency(summary.salesMonth)}</span>
        </div>
      </div>

      <div className="receipt-filters">
        <input
          className="search-input"
          placeholder="Search by receipt #, cashier, or medicine..."
          value={search}
          onChange={handleSearchChange}
        />
        <div className="preset-filters">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`preset-btn${datePreset === p.value ? ' active' : ''}`}
              onClick={() => handlePresetChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
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
        )}
        <label className="archive-toggle">
          <input type="checkbox" checked={showArchived} onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }} />
          Show archived
        </label>
      </div>

      <div className="receipt-actions-bar">
        <button className="ghost-btn small-btn" type="button" onClick={() => handleExport('csv')} disabled={!!exporting}>
          {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
        </button>
        <button className="ghost-btn small-btn" type="button" onClick={() => handleExport('xlsx')} disabled={!!exporting}>
          {exporting === 'xlsx' ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Receipts {showArchived ? '(Archived)' : ''} ({total})</h3>
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
                  <tr key={r.id} className={r.archived ? 'row-archived' : ''}>
                    <td><strong>{r.receiptNumber}</strong></td>
                    <td>{new Date(r.createdAt).toLocaleDateString('en-KE')}</td>
                    <td>{r.sale?.cashierName || r.user?.fullName || 'N/A'}</td>
                    <td>{formatCurrency(r.totalAmount)}</td>
                    <td>{formatCurrency(r.amountPaid)}</td>
                    <td>{formatCurrency(r.balance)}</td>
                    <td><span className="pill">{(r.paymentMethod || '').replace('_', ' ')}</span></td>
                    <td className="actions-cell">
                      <button className="ghost-btn small-btn" type="button" onClick={() => handleViewReceipt(r.id)}>
                        View
                      </button>
                      <button className="ghost-btn small-btn" type="button" onClick={() => handleArchive(r.id)}>
                        {r.archived ? 'Unarchive' : 'Archive'}
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
