import { useState, useCallback, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { emit, Events } from '../store';

const CATEGORIES = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'];

const initialForm = {
  name: '',
  initialStock: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

function MedicineManagement() {
  const [form, setForm] = useState(initialForm);
  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await authFetch(`${API_URL}/medicines`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          initialStock: String(form.initialStock || 0),
          costPrice: String(form.costPrice),
          sellingPrice: String(form.sellingPrice),
          category: form.category,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setStatus({ type: 'success', message: payload.message || 'Medicine saved successfully.' });
      setForm(initialForm);
      setShowForm(false);
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save medicine.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

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
      parts.push('Import completed.');
      parts.push(`Rows Processed: ${summary.totalRows || 0}`);
      parts.push(`New Medicines: ${summary.created || 0}`);
      parts.push(`Updated Medicines: ${summary.updated || 0}`);
      parts.push(`Total Units Added: ${summary.totalUnitsAdded || 0}`);
      parts.push(`Failed Rows: ${summary.failedRows || 0}`);

      setImportMessage(parts.join('\n'));
      setImportErrors(summary.errors || []);
      setImportFile(null);
      emit(Events.MEDICINES_CHANGED);
    } catch (error) {
      setImportMessage(error.message || 'Import failed');
      setImportErrors([]);
    }
  }, [importFile]);

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

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Medicine Management</h2>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Close Form' : '+ Add Medicine'}
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`status-banner ${status.type === 'error' ? 'error-banner' : 'success-banner'}`}>
          {status.message}
        </div>
      )}

      {showForm && (
        <div className="panel">
          <div className="panel-header">
            <h3>Add New Medicine</h3>
          </div>
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
        </div>
      )}

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
    </div>
  );
}

export default memo(MedicineManagement);
