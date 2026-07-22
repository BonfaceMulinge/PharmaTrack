import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { subscribe, emit, Events } from '../store';

const CATEGORIES = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'];

const initialForm = {
  name: '',
  initialStock: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value ?? 0);

const MedicineRow = memo(function MedicineRow({ medicine, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <div>{medicine.name}</div>
        {medicine.quantity > 0 && medicine.quantity <= 10 && <span className="badge low-stock">Low Stock</span>}
        {medicine.quantity === 0 && <span className="badge out-stock">Out of Stock</span>}
      </td>
      <td>{medicine.quantity}</td>
      <td>{formatCurrency(medicine.costPrice)}</td>
      <td>{formatCurrency(medicine.sellingPrice)}</td>
      <td>{medicine.category || 'Other'}</td>
      <td>
        <button className="ghost-btn small-btn" type="button" onClick={() => onEdit(medicine)}>Edit</button>
        <button className="ghost-btn small-btn danger-btn" type="button" onClick={() => onDelete(medicine)}>Delete</button>
      </td>
    </tr>
  );
});

const StockMovementRow = memo(function StockMovementRow({ movement }) {
  return (
    <tr>
      <td>{movement.medicineName}</td>
      <td>{new Date(movement.createdAt).toLocaleString()}</td>
      <td>{movement.referenceType || movement.type}</td>
      <td>{movement.type === 'SALE' ? '-' : '+'}{movement.quantity}</td>
      <td>{movement.previousStock}</td>
      <td>{movement.balanceAfter}</td>
      <td>{movement.userName || 'System'}</td>
    </tr>
  );
});

function MedicineManagement() {
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [stockMovements, setStockMovements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editFormState, setEditFormState] = useState({ name: '', costPrice: '', sellingPrice: '', category: 'Tablets' });
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 200);

  const fetchMedicines = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/medicines`);
      if (response.ok) {
        const data = await response.json();
        setMedicines(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [medsRes] = await Promise.all([
          authFetch(`${API_URL}/medicines`),
        ]);
        if (cancelled) return;
        if (medsRes.ok) setMedicines(await medsRes.json());
      } catch (error) {
        console.error(error);
      }
    };
    load();

    const unsub = subscribe(Events.MEDICINES_CHANGED, load);
    return () => { cancelled = true; unsub(); };
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && !movementsLoaded) {
      let cancelled = false;
      (async () => {
        try {
          const response = await authFetch(`${API_URL}/medicines/stock-movements`);
          if (!cancelled && response.ok) {
            const data = await response.json();
            setStockMovements(data);
            setMovementsLoaded(true);
          }
        } catch (error) {
          console.error(error);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [activeTab, movementsLoaded]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    const tempId = `temp-${Date.now()}`;
    const optimisticMedicine = {
      id: tempId,
      name: form.name,
      quantity: Number(form.initialStock || 0),
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      category: form.category,
      inventoryValue: Number(form.initialStock || 0) * Number(form.costPrice),
    };

    setMedicines((prev) => [...prev, optimisticMedicine]);
    setForm(initialForm);
    setShowForm(false);

    try {
      const response = await authFetch(`${API_URL}/medicines`, {
        method: 'POST',
        body: JSON.stringify({
          name: optimisticMedicine.name,
          initialStock: String(optimisticMedicine.quantity),
          costPrice: String(optimisticMedicine.costPrice),
          sellingPrice: String(optimisticMedicine.sellingPrice),
          category: optimisticMedicine.category,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setMedicines((prev) => prev.map((m) => m.id === tempId ? { ...m, ...payload } : m));
      setStatus({ type: 'success', message: payload.message || 'Medicine saved successfully.' });
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      setMedicines((prev) => prev.filter((m) => m.id !== tempId));
      setStatus({ type: 'error', message: error.message || 'Failed to save medicine.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  const handleEdit = useCallback((medicine) => {
    setEditingMedicine(medicine);
    setEditFormState({
      name: medicine.name,
      costPrice: medicine.costPrice,
      sellingPrice: medicine.sellingPrice,
      category: medicine.category || 'Tablets',
    });
  }, []);

  const handleEditSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    const original = medicines.find((m) => m.id === editingMedicine.id);
    const optimisticValues = {
      name: editFormState.name,
      costPrice: Number(editFormState.costPrice),
      sellingPrice: Number(editFormState.sellingPrice),
      category: editFormState.category,
    };

    setMedicines((prev) => prev.map((m) =>
      m.id === editingMedicine.id ? { ...m, ...optimisticValues } : m
    ));
    setEditingMedicine(null);

    try {
      const response = await authFetch(`${API_URL}/medicines/${editingMedicine.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormState),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setMedicines((prev) => prev.map((m) =>
        m.id === editingMedicine.id ? { ...m, ...payload } : m
      ));
      setStatus({ type: 'success', message: 'Medicine updated successfully.' });
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      if (original) {
        setMedicines((prev) => prev.map((m) =>
          m.id === original.id ? original : m
        ));
      }
      setStatus({ type: 'error', message: error.message || 'Failed to update medicine.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingMedicine, editFormState, medicines]);

  const handleDelete = useCallback(async (medicine) => {
    if (!window.confirm(`Are you sure you want to delete "${medicine.name}"?`)) return;

    setMedicines((prev) => prev.filter((m) => m.id !== medicine.id));

    try {
      const response = await authFetch(`${API_URL}/medicines/${medicine.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      setStatus({ type: 'success', message: 'Medicine deleted successfully.' });
      setMovementsLoaded(false);
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      setMedicines((prev) => [...prev, medicine].sort((a, b) => a.name.localeCompare(b.name)));
      setStatus({ type: 'error', message: error.message || 'Failed to delete medicine.' });
    }
  }, []);

  const handleImport = useCallback(async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportMessage('Please choose an Excel file first.');
      return;
    }

    setImportMessage('');
    setImportErrors([]);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await authFetch(`${API_URL}/medicines/import`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      const summary = payload.summary || {};

      if (!response.ok && summary.totalRows === undefined) {
        throw new Error(payload.message || 'Import failed');
      }

      const parts = [];
      parts.push(`Import completed.`);
      parts.push(`Rows Processed: ${summary.totalRows || 0}`);
      parts.push(`New Medicines: ${summary.created || 0}`);
      parts.push(`Updated Medicines: ${summary.updated || 0}`);
      parts.push(`Total Units Added: ${summary.totalUnitsAdded || 0}`);
      parts.push(`Failed Rows: ${summary.failedRows || 0}`);

      setImportMessage(parts.join('\n'));
      setImportErrors(summary.errors || []);
      setImportFile(null);
      fetchMedicines();
      setMovementsLoaded(false);
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      setImportMessage(error.message || 'Import failed');
      setImportErrors([]);
    }
  }, [importFile, fetchMedicines]);

  const handleDownloadSample = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/medicines/sample-excel`);
      if (!response.ok) throw new Error('Failed to download sample');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PharmaTrack_Medicine_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download sample error:', error);
    }
  }, []);

  const filteredMedicines = useMemo(() =>
    medicines.filter((medicine) => {
      const term = debouncedSearch.toLowerCase();
      return medicine.name.toLowerCase().includes(term) ||
        (medicine.category || '').toLowerCase().includes(term);
    }),
    [medicines, debouncedSearch]
  );

  const inventorySummary = useMemo(() => {
    const totalCount = medicines.length;
    const totalUnits = medicines.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = medicines.reduce((sum, m) => sum + (m.inventoryValue || 0), 0);
    const lowStock = medicines.filter((item) => item.quantity > 0 && item.quantity <= 10).length;
    return { totalCount, totalUnits, totalValue, lowStock };
  }, [medicines]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleToggleForm = useCallback(() => {
    setShowForm((prev) => !prev);
    setEditingMedicine(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMedicine(null);
  }, []);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Medicine Management</h2>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" type="button" onClick={handleToggleForm}>
            {showForm ? 'Close Form' : '+ Add Medicine'}
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`status-banner ${status.type === 'error' ? 'error-banner' : 'success-banner'}`}>
          {status.message}
        </div>
      )}

      {showForm && !editingMedicine && (
        <form className="medicine-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <input placeholder="Medicine Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Initial Stock" type="number" min="0" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
            <input placeholder="Cost Price (KES) *" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
            <input placeholder="Selling Price (KES) *" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Medicine'}
          </button>
        </form>
      )}

      {editingMedicine && (
        <div className="panel">
          <div className="panel-header">
            <h3>Edit: {editingMedicine.name}</h3>
            <button className="ghost-btn" type="button" onClick={handleCancelEdit}>Cancel</button>
          </div>
          <form className="medicine-form" onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <input placeholder="Medicine Name *" value={editFormState.name} onChange={(e) => setEditFormState({ ...editFormState, name: e.target.value })} required />
              <input placeholder="Cost Price (KES) *" type="number" min="0" step="0.01" value={editFormState.costPrice} onChange={(e) => setEditFormState({ ...editFormState, costPrice: e.target.value })} required />
              <input placeholder="Selling Price (KES) *" type="number" min="0" step="0.01" value={editFormState.sellingPrice} onChange={(e) => setEditFormState({ ...editFormState, sellingPrice: e.target.value })} required />
              <select value={editFormState.category} onChange={(e) => setEditFormState({ ...editFormState, category: e.target.value })} required>
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Medicine'}
            </button>
          </form>
        </div>
      )}

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('inventory')}>
          Inventory
        </button>
        <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('import')}>
          Excel Import
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('history')}>
          Stock History
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="panel">
          <div className="panel-header">
            <h3>Medicine Inventory</h3>
            <input className="search-input" placeholder="Search by name or category..." value={searchTerm} onChange={handleSearchChange} />
          </div>
          <div className="inventory-summary">
            <div><strong>{inventorySummary.totalCount}</strong><span>Total Medicines</span></div>
            <div><strong>{inventorySummary.totalUnits}</strong><span>Total Units</span></div>
            <div><strong>{formatCurrency(inventorySummary.totalValue)}</strong><span>Inventory Value</span></div>
            <div><strong>{inventorySummary.lowStock}</strong><span>Low Stock</span></div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Available Stock</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((medicine) => (
                  <MedicineRow key={medicine.id} medicine={medicine} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
                {filteredMedicines.length === 0 && (
                  <tr><td colSpan="6" className="empty-table">No medicines found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="panel">
          <div className="panel-header">
            <h3>Excel Import</h3>
          </div>
          <form className="medicine-form" onSubmit={handleImport}>
            <div className="form-grid">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>
            <div className="topbar-actions">
              <button className="primary-btn" type="submit">Upload Excel</button>
              <button className="ghost-btn" type="button" onClick={handleDownloadSample}>Download Sample Excel</button>
            </div>
            {importMessage && <pre className="import-summary">{importMessage}</pre>}
            {importErrors.length > 0 && (
              <div className="import-errors">
                <strong>Errors:</strong>
                <ul>
                  {importErrors.map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="panel">
          <div className="panel-header">
            <h3>Stock History</h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Previous Stock</th>
                  <th>Balance After</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {stockMovements.map((movement) => (
                  <StockMovementRow key={movement.id} movement={movement} />
                ))}
                {stockMovements.length === 0 && (
                  <tr><td colSpan="7" className="empty-table">No stock movements recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MedicineManagement);
