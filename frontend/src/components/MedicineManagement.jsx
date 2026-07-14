import { useEffect, useState } from 'react';

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

function MedicineManagement() {
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [importMessage, setImportMessage] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/medicines');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setMedicines(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:5000/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          initialStock: form.initialStock,
          quantity: form.initialStock,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed');
      setForm(initialForm);
      setStatus({ type: 'success', message: payload.message || 'Stock updated successfully.' });
      fetchMedicines();
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
      const response = await fetch('http://localhost:5000/api/medicines/import', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Import failed');
      setImportMessage(`New Medicines: ${payload.summary.newMedicines}\nUpdated Medicines: ${payload.summary.updatedMedicines}\nTotal Units Added: ${payload.summary.totalUnitsAdded}\nErrors: ${payload.summary.errors}`);
      setImportFile(null);
      fetchMedicines();
    } catch (error) {
      setImportMessage(error.message || 'Import failed');
    }
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Medicine Management</h2>
        </div>
        <button className="primary-btn">+ Add Medicine</button>
      </div>

      <form className="medicine-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <input placeholder="Medicine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Initial Stock" type="number" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
          <input placeholder="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <input placeholder="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          <input placeholder="Reorder Level" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
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
          <div><strong>{medicines.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</strong><span>Total Units in Stock</span></div>
          <div><strong>{medicines.filter((item) => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) < 10).length}</strong><span>Low Stock</span></div>
          <div><strong>{medicines.filter((item) => Number(item.quantity || 0) === 0).length}</strong><span>Out of Stock</span></div>
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
                  {Number(medicine.quantity || 0) < 10 ? <span className="badge low-stock">Low Stock</span> : null}
                  {Number(medicine.quantity || 0) === 0 ? <span className="badge out-stock">Out of Stock</span> : null}
                </td>
                <td>{medicine.quantity}</td>
                <td>{medicine.costPrice}</td>
                <td>{medicine.sellingPrice}</td>
                <td><button className="ghost-btn small-btn" type="button">Restock</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MedicineManagement;
