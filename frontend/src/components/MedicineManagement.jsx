import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const initialForm = {
  name: '',
  genericName: '',
  brandName: '',
  barcode: '',
  batchNumber: '',
  manufacturer: '',
  costPrice: '',
  sellingPrice: '',
  initialStock: '',
  reorderLevel: '',
  expiryDate: '',
  prescriptionRequired: false,
  categoryId: '',
};

const getCurrentStock = (medicine) => Number(medicine.currentStock ?? medicine.quantity ?? 0);
const getLowStockThreshold = (medicine) => Number(medicine.reorderLevel || 10);

function MedicineManagement() {
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [importMessage, setImportMessage] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [stockMovements, setStockMovements] = useState([]);

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
          ...form,
          initialStock: form.initialStock,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setForm(initialForm);
      setStatus({ type: 'success', message: payload.message || 'Stock updated successfully.' });
      fetchMedicines();
      fetchStockMovements();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save medicine.' });
    } finally {
      setIsSubmitting(false);
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
      if (!response.ok) throw new Error(payload.message || 'Import failed');
      setImportMessage(`New Medicines: ${payload.summary.newMedicines}\nUpdated Medicines: ${payload.summary.updatedMedicines}\nTotal Units Added: ${payload.summary.totalUnitsAdded}\nErrors: ${payload.summary.errors}`);
      setImportFile(null);
      fetchMedicines();
      fetchStockMovements();
    } catch (error) {
      setImportMessage(error.message || 'Import failed');
    }
  };

  const restockMedicine = (medicine) => {
    setForm({
      ...initialForm,
      name: medicine.name,
      costPrice: medicine.costPrice,
      sellingPrice: medicine.sellingPrice,
      reorderLevel: medicine.reorderLevel || 10,
    });
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Medicine Management</h2>
        </div>
        <button className="primary-btn" type="button">+ Add Medicine</button>
      </div>

      <form className="medicine-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <input placeholder="Medicine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Initial Stock" type="number" min="0" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
          <input placeholder="Cost Price" type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <input placeholder="Selling Price" type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          <input placeholder="Reorder Level" type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          <input placeholder="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.prescriptionRequired} onChange={(e) => setForm({ ...form, prescriptionRequired: e.target.checked })} />
            Prescription Required
          </label>
        </div>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Medicine'}</button>
        {status.message ? <p className={status.type === 'error' ? 'status-error' : 'status-success'}>{status.message}</p> : null}
      </form>

      <form className="medicine-form" onSubmit={handleImport}>
        <div className="form-grid">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
        </div>
        <button className="ghost-btn" type="submit">Import Excel</button>
        {importMessage ? <pre className="import-summary">{importMessage}</pre> : null}
      </form>

      <div className="panel">
        <h3>Medicine Inventory</h3>
        <div className="inventory-summary">
          <div><strong>{medicines.length}</strong><span>Total Medicines</span></div>
          <div><strong>{medicines.reduce((sum, item) => sum + getCurrentStock(item), 0)}</strong><span>Total Units in Stock</span></div>
          <div><strong>{medicines.filter((item) => getCurrentStock(item) > 0 && getCurrentStock(item) <= getLowStockThreshold(item)).length}</strong><span>Low Stock</span></div>
          <div><strong>{medicines.filter((item) => getCurrentStock(item) === 0).length}</strong><span>Out of Stock</span></div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Current Stock</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((medicine) => (
              <tr key={medicine.id}>
                <td>
                  <div>{medicine.name}</div>
                  {getCurrentStock(medicine) > 0 && getCurrentStock(medicine) <= getLowStockThreshold(medicine) ? <span className="badge low-stock">Low Stock</span> : null}
                  {getCurrentStock(medicine) === 0 ? <span className="badge out-stock">Out of Stock</span> : null}
                </td>
                <td>{getCurrentStock(medicine)}</td>
                <td>{medicine.costPrice}</td>
                <td>{medicine.sellingPrice}</td>
                <td><button className="ghost-btn small-btn" type="button" onClick={() => restockMedicine(medicine)}>Restock</button></td>
              </tr>
            ))}
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
              <th>New Current Stock</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {stockMovements.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.medicine?.name || movement.medicineName}</td>
                <td>{new Date(movement.createdAt).toLocaleString()}</td>
                <td>{movement.transactionType || movement.referenceType || movement.type}</td>
                <td>{movement.type === 'SALE' ? '-' : '+'}{movement.quantity}</td>
                <td>{movement.previousStock}</td>
                <td>{movement.newCurrentStock ?? movement.balanceAfter}</td>
                <td>{movement.userName || movement.user?.fullName || movement.user?.username || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MedicineManagement;
