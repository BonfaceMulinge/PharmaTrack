import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const CATEGORIES = [
  'Tablets',
  'Capsules',
  'Syrup',
  'Injection',
  'Cream',
  'Drops',
  'Ointment',
  'Eye Drops',
  'Ear Drops',
  'Other',
];

const initialForm = {
  name: '',
  initialStock: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

const editForm = {
  name: '',
  costPrice: '',
  sellingPrice: '',
  category: 'Tablets',
};

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
  const [editFormState, setEditFormState] = useState(editForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMedicines();
    fetchStockMovements();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await fetch(`${API_URL}/medicines`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setMedicines(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const response = await fetch(`${API_URL}/medicines/stock-movements`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setStockMovements(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_URL}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          initialStock: form.initialStock || '0',
          costPrice: form.costPrice,
          sellingPrice: form.sellingPrice,
          category: form.category,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setForm(initialForm);
      setShowForm(false);
      setStatus({ type: 'success', message: payload.message || 'Medicine saved successfully.' });
      fetchMedicines();
      fetchStockMovements();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save medicine.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    setEditFormState({
      name: medicine.name,
      costPrice: medicine.costPrice,
      sellingPrice: medicine.sellingPrice,
      category: medicine.category || 'Tablets',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_URL}/medicines/${editingMedicine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormState),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setEditingMedicine(null);
      setStatus({ type: 'success', message: 'Medicine updated successfully.' });
      fetchMedicines();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to update medicine.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (medicine) => {
    if (!window.confirm(`Are you sure you want to delete "${medicine.name}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/medicines/${medicine.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed');
      setStatus({ type: 'success', message: 'Medicine deleted successfully.' });
      fetchMedicines();
      fetchStockMovements();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to delete medicine.' });
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportMessage('Please choose an Excel file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(`${API_URL}/medicines/import`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok && !payload.summary) throw new Error(payload.message || 'Import failed');

      const summary = payload.summary || {};
      setImportMessage(
        `Total Rows: ${summary.totalRows || 0}\nCreated: ${summary.created || 0}\nUpdated: ${summary.updated || 0}\nTotal Units Added: ${summary.totalUnitsAdded || 0}\nFailed Rows: ${summary.failedRows || 0}`
      );
      setImportErrors(summary.errors || []);
      setImportFile(null);
      fetchMedicines();
      fetchStockMovements();
    } catch (error) {
      setImportMessage(error.message || 'Import failed');
      setImportErrors([]);
    }
  };

  const handleDownloadSample = () => {
    window.open(`${API_URL}/medicines/sample-excel`, '_blank');
  };

  const filteredMedicines = medicines.filter((medicine) =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (medicine.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value ?? 0);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Medicine Management</h2>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" type="button" onClick={() => { setShowForm(!showForm); setEditingMedicine(null); }}>
            {showForm ? 'Close Form' : '+ Add Medicine'}
          </button>
          <button className="ghost-btn" type="button" onClick={handleDownloadSample}>
            Download Sample Excel
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`status-banner ${status.type === 'error' ? 'error-banner' : 'success-banner'}`}>
          {status.message}
        </div>
      ) : null}

      {showForm && !editingMedicine ? (
        <form className="medicine-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <input
              placeholder="Medicine Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Initial Stock"
              type="number"
              min="0"
              value={form.initialStock}
              onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
            />
            <input
              placeholder="Cost Price (KES) *"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              required
            />
            <input
              placeholder="Selling Price (KES) *"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              required
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Medicine'}
          </button>
        </form>
      ) : null}

      {editingMedicine ? (
        <div className="panel">
          <div className="panel-header">
            <h3>Edit: {editingMedicine.name}</h3>
            <button className="ghost-btn" type="button" onClick={() => setEditingMedicine(null)}>Cancel</button>
          </div>
          <form className="medicine-form" onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <input
                placeholder="Medicine Name *"
                value={editFormState.name}
                onChange={(e) => setEditFormState({ ...editFormState, name: e.target.value })}
                required
              />
              <input
                placeholder="Cost Price (KES) *"
                type="number"
                min="0"
                step="0.01"
                value={editFormState.costPrice}
                onChange={(e) => setEditFormState({ ...editFormState, costPrice: e.target.value })}
                required
              />
              <input
                placeholder="Selling Price (KES) *"
                type="number"
                min="0"
                step="0.01"
                value={editFormState.sellingPrice}
                onChange={(e) => setEditFormState({ ...editFormState, sellingPrice: e.target.value })}
                required
              />
              <select
                value={editFormState.category}
                onChange={(e) => setEditFormState({ ...editFormState, category: e.target.value })}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Medicine'}
            </button>
          </form>
        </div>
      ) : null}

      <form className="medicine-form" onSubmit={handleImport}>
        <div className="form-grid">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" type="submit">Upload Excel</button>
          <button className="ghost-btn" type="button" onClick={handleDownloadSample}>Download Sample Excel</button>
        </div>
        {importMessage ? <pre className="import-summary">{importMessage}</pre> : null}
        {importErrors.length > 0 ? (
          <div className="import-errors">
            <strong>Errors:</strong>
            <ul>
              {importErrors.map((err, idx) => (
                <li key={idx}>Row {err.row}: {err.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>

      <div className="panel">
        <div className="panel-header">
          <h3>Medicine Inventory</h3>
          <input
            className="search-input"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="inventory-summary">
          <div><strong>{medicines.length}</strong><span>Total Medicines</span></div>
          <div><strong>{medicines.reduce((sum, item) => sum + (item.quantity || 0), 0)}</strong><span>Total Units in Stock</span></div>
          <div><strong>{medicines.filter((item) => item.quantity > 0 && item.quantity <= 10).length}</strong><span>Low Stock</span></div>
          <div><strong>{medicines.filter((item) => item.quantity === 0).length}</strong><span>Out of Stock</span></div>
        </div>
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
              <tr key={medicine.id}>
                <td>
                  <div>{medicine.name}</div>
                  {medicine.quantity > 0 && medicine.quantity <= 10 ? <span className="badge low-stock">Low Stock</span> : null}
                  {medicine.quantity === 0 ? <span className="badge out-stock">Out of Stock</span> : null}
                </td>
                <td>{medicine.quantity}</td>
                <td>{formatCurrency(medicine.costPrice)}</td>
                <td>{formatCurrency(medicine.sellingPrice)}</td>
                <td>{medicine.category || 'Other'}</td>
                <td>
                  <button className="ghost-btn small-btn" type="button" onClick={() => handleEdit(medicine)}>Edit</button>
                  <button className="ghost-btn small-btn" type="button" onClick={() => handleDelete(medicine)}>Delete</button>
                </td>
              </tr>
            ))}
            {filteredMedicines.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No medicines found</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Stock History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Date & Time</th>
              <th>Transaction Type</th>
              <th>Quantity</th>
              <th>Previous Stock</th>
              <th>Balance After</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {stockMovements.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.medicineName}</td>
                <td>{new Date(movement.createdAt).toLocaleString()}</td>
                <td>{movement.referenceType || movement.type}</td>
                <td>{movement.type === 'SALE' ? '-' : '+'}{movement.quantity}</td>
                <td>{movement.previousStock}</td>
                <td>{movement.balanceAfter}</td>
                <td>{movement.userName || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MedicineManagement;
