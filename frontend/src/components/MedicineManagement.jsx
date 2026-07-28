import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { emit, Events } from '../store';
import { useDebounce } from '../hooks/useDebounce';
import {
  getMedicines,
  fetchMedicines,
  onMedicinesChange,
  applyOptimisticAdd,
  applyOptimisticUpdate,
  applyOptimisticDelete,
} from '../cache';
import formatCurrency from '../utils/formatCurrency';

const CATEGORIES = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'];

const initialForm = {
  name: '',
  initialStock: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

const initialEditForm = {
  name: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

function getStockStatus(quantity) {
  if (quantity <= 0) return { label: 'Out of Stock', className: 'status-out' };
  if (quantity <= 10) return { label: 'Low Stock', className: 'status-low' };
  return { label: 'In Stock', className: 'status-in' };
}

const SortIcon = memo(function SortIcon({ column, sortField, sortDir }) {
  if (sortField !== column) return <span className="sort-indicator sort-inactive">&#8597;</span>;
  return <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
});

function SkeletonTable() {
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Medicine Name</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Cost Price</th>
            <th>Selling Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              <td><div className="skeleton-line" style={{ width: '120px' }} /></td>
              <td><div className="skeleton-line skeleton-pill" /></td>
              <td><div className="skeleton-line" style={{ width: '40px' }} /></td>
              <td><div className="skeleton-line" style={{ width: '70px' }} /></td>
              <td><div className="skeleton-line" style={{ width: '70px' }} /></td>
              <td><div className="skeleton-line skeleton-pill" /></td>
              <td><div className="skeleton-line" style={{ width: '60px' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MedicineManagement() {
  const [medicines, setMedicines] = useState(() => getMedicines());
  const [isLoading, setIsLoading] = useState(!isCacheReady());
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(initialForm);
  const [isAdding, setIsAdding] = useState(false);
  const [addStatus, setAddStatus] = useState({ type: '', message: '' });

  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [editMedicine, setEditMedicine] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 150);

  useEffect(() => {
    let cancelled = false;
    fetchMedicines().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    const unsub = onMedicinesChange((list) => {
      if (!cancelled) setMedicines(list);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    let list = medicines;
    if (term) {
      list = medicines.filter((m) =>
        m.name.toLowerCase().includes(term) ||
        (m.category || '').toLowerCase().includes(term)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break;
        case 'quantity': cmp = (a.quantity ?? 0) - (b.quantity ?? 0); break;
        case 'costPrice': cmp = Number(a.costPrice) - Number(b.costPrice); break;
        case 'sellingPrice': cmp = Number(a.sellingPrice) - Number(b.sellingPrice); break;
        default: cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [medicines, debouncedSearch, sortField, sortDir]);

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const handleAddSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setAddStatus({ type: '', message: '' });
    try {
      const res = await authFetch(`${API_URL}/medicines`, {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name,
          initialStock: String(addForm.initialStock || 0),
          costPrice: String(addForm.costPrice),
          sellingPrice: String(addForm.sellingPrice),
          category: addForm.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      if (data.medicine) {
        applyOptimisticAdd(data.medicine);
      }
      setAddStatus({ type: 'success', message: data.message || 'Medicine added successfully.' });
      setAddForm(initialForm);
      setShowAddForm(false);
      emit(Events.MEDICINES_CHANGED);
    } catch (err) {
      setAddStatus({ type: 'error', message: err.message });
    } finally {
      setIsAdding(false);
    }
  }, [addForm]);

  const handleImportSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!importFile) { setImportMessage('Please choose an Excel file first.'); return; }
    setImportMessage('');
    setImportErrors([]);
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await authFetch(`${API_URL}/medicines/import`, { method: 'POST', body: formData });
      const data = await res.json();
      const s = data.summary || {};
      if (!res.ok && s.totalRows === undefined) throw new Error(data.message || 'Import failed');
      const parts = [];
      parts.push('Import completed.');
      parts.push(`Rows Processed: ${s.totalRows || 0}`);
      parts.push(`New Medicines: ${s.created || 0}`);
      parts.push(`Updated Medicines: ${s.updated || 0}`);
      parts.push(`Total Units Added: ${s.totalUnitsAdded || 0}`);
      parts.push(`Failed Rows: ${s.failedRows || 0}`);
      setImportMessage(parts.join('\n'));
      setImportErrors(s.errors || []);
      setImportFile(null);
      emit(Events.MEDICINES_CHANGED);
    } catch (err) {
      setImportMessage(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [importFile]);

  const handleDownloadSample = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/medicines/sample-excel`);
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PharmaTrack_Medicine_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  }, []);

  const openEdit = useCallback((medicine) => {
    setEditMedicine(medicine);
    setEditForm({
      name: medicine.name,
      costPrice: String(Number(medicine.costPrice)),
      sellingPrice: String(Number(medicine.sellingPrice)),
      category: medicine.category,
    });
    setEditStatus({ type: '', message: '' });
  }, []);

  const closeEdit = useCallback(() => {
    setEditMedicine(null);
    setEditForm(initialEditForm);
    setEditStatus({ type: '', message: '' });
  }, []);

  const handleEditSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!editMedicine) return;
    setIsEditing(true);
    setEditStatus({ type: '', message: '' });

    const optimisticData = {
      name: editForm.name,
      costPrice: Number(editForm.costPrice),
      sellingPrice: Number(editForm.sellingPrice),
      category: editForm.category,
    };
    applyOptimisticUpdate(editMedicine.id, optimisticData);

    try {
      const res = await authFetch(`${API_URL}/medicines/${editMedicine.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          costPrice: Number(editForm.costPrice),
          sellingPrice: Number(editForm.sellingPrice),
          category: editForm.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        applyOptimisticUpdate(editMedicine.id, {
          name: editMedicine.name,
          costPrice: Number(editMedicine.costPrice),
          sellingPrice: Number(editMedicine.sellingPrice),
          category: editMedicine.category,
        });
        throw new Error(data.message || 'Update failed');
      }
      if (data) applyOptimisticUpdate(editMedicine.id, data);
      emit(Events.MEDICINES_CHANGED);
      closeEdit();
    } catch (err) {
      setEditStatus({ type: 'error', message: err.message });
    } finally {
      setIsEditing(false);
    }
  }, [editMedicine, editForm, closeEdit]);

  const confirmDelete = useCallback((medicine) => {
    setDeleteTarget(medicine);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const targetId = deleteTarget.id;
    applyOptimisticDelete(targetId);

    try {
      const res = await authFetch(`${API_URL}/medicines/${targetId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Delete failed'); }
      setDeleteTarget(null);
      emit(Events.MEDICINES_CHANGED);
    } catch (err) {
      fetchMedicines(true);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Medicines</h1>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" type="button" onClick={() => setShowAddForm((p) => !p)}>
            {showAddForm ? 'Close' : '+ Add Medicine'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => setShowImport((p) => !p)}>
            Upload Excel
          </button>
          <button className="ghost-btn" type="button" onClick={handleDownloadSample}>
            Download Sample Excel
          </button>
        </div>
      </div>

      {addStatus.message && (
        <div className={`status-banner ${addStatus.type === 'error' ? 'error-banner' : 'success-banner'}`}>
          {addStatus.message}
        </div>
      )}

      {showAddForm && (
        <div className="panel">
          <div className="panel-header"><h3>Add New Medicine</h3></div>
          <form className="medicine-form" onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <input placeholder="Medicine Name *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
              <input placeholder="Initial Stock" type="number" min="0" value={addForm.initialStock} onChange={(e) => setAddForm({ ...addForm, initialStock: e.target.value })} />
              <input placeholder="Cost Price (KES) *" type="number" min="0" step="0.01" value={addForm.costPrice} onChange={(e) => setAddForm({ ...addForm, costPrice: e.target.value })} required />
              <input placeholder="Selling Price (KES) *" type="number" min="0" step="0.01" value={addForm.sellingPrice} onChange={(e) => setAddForm({ ...addForm, sellingPrice: e.target.value })} required />
              <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} required>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button className="primary-btn" type="submit" disabled={isAdding}>
              {isAdding ? 'Saving...' : 'Save Medicine'}
            </button>
          </form>
        </div>
      )}

      {showImport && (
        <div className="panel">
          <div className="panel-header"><h3>Excel Import</h3></div>
          <form className="medicine-form" onSubmit={handleImportSubmit}>
            <div className="form-grid">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>
            <button className="primary-btn" type="submit" disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Upload'}
            </button>
            {importMessage && <pre className="import-summary">{importMessage}</pre>}
            {importErrors.length > 0 && (
              <div className="import-errors">
                <strong>Errors:</strong>
                <ul>{importErrors.map((err, i) => <li key={i}>Row {err.row}: {err.message}</li>)}</ul>
              </div>
            )}
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <h3>All Medicines ({filtered.length})</h3>
          <input
            className="search-input"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : filtered.length === 0 ? (
          <div className="empty-state-full">
            {search ? 'No medicines match your search.' : 'No medicines found. Add one to get started.'}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('name')}>
                      Medicine Name <SortIcon column="name" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('category')}>
                      Category <SortIcon column="category" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('quantity')}>
                      Stock <SortIcon column="quantity" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('costPrice')}>
                      Cost Price <SortIcon column="costPrice" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('sellingPrice')}>
                      Selling Price <SortIcon column="sellingPrice" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const status = getStockStatus(m.quantity ?? 0);
                    return (
                      <tr key={m.id}>
                        <td data-label="Medicine" className="medicine-name-cell">{m.name}</td>
                        <td data-label="Category"><span className="pill">{m.category}</span></td>
                        <td data-label="Stock">{m.quantity ?? 0}</td>
                        <td data-label="Cost Price">{formatCurrency(Number(m.costPrice))}</td>
                        <td data-label="Selling Price">{formatCurrency(Number(m.sellingPrice))}</td>
                        <td data-label="Status"><span className={`stock-badge ${status.className}`}>{status.label}</span></td>
                        <td data-label="Actions" className="actions-cell">
                          <button className="icon-btn edit-btn" type="button" title="Edit" onClick={() => openEdit(m)}>
                            &#9998;
                          </button>
                          <button className="icon-btn delete-btn" type="button" title="Delete" onClick={() => confirmDelete(m)}>
                            &#128465;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="medicine-cards-mobile">
              {filtered.map((m) => {
                const status = getStockStatus(m.quantity ?? 0);
                return (
                  <div className="medicine-mobile-card" key={m.id}>
                    <div className="mobile-card-header">
                      <strong>{m.name}</strong>
                      <span className={`stock-badge ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row"><span>Category</span><span className="pill">{m.category}</span></div>
                      <div className="mobile-card-row"><span>Stock</span><span>{m.quantity ?? 0}</span></div>
                      <div className="mobile-card-row"><span>Cost Price</span><span>{formatCurrency(Number(m.costPrice))}</span></div>
                      <div className="mobile-card-row"><span>Selling Price</span><span>{formatCurrency(Number(m.sellingPrice))}</span></div>
                    </div>
                    <div className="mobile-card-actions">
                      <button className="ghost-btn small-btn" type="button" onClick={() => openEdit(m)}>&#9998; Edit</button>
                      <button className="ghost-btn small-btn danger-btn" type="button" onClick={() => confirmDelete(m)}>&#128465; Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {editMedicine && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Medicine</h3>
              <button className="ghost-btn small-btn" type="button" onClick={closeEdit}>&times;</button>
            </div>
            {editStatus.message && (
              <div className={`status-banner ${editStatus.type === 'error' ? 'error-banner' : 'success-banner'}`}>
                {editStatus.message}
              </div>
            )}
            <form className="modal-form" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Medicine Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Category</label>
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} required>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Cost Price (KES)</label>
                  <input type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Selling Price (KES)</label>
                  <input type="number" min="0" step="0.01" value={editForm.sellingPrice} onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button className="ghost-btn" type="button" onClick={closeEdit}>Cancel</button>
                <button className="primary-btn" type="submit" disabled={isEditing}>
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Medicine</h3>
            </div>
            <p className="modal-body-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="ghost-btn" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-btn danger-btn" type="button" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isCacheReady() {
  return getMedicines().length > 0;
}

export default memo(MedicineManagement);
