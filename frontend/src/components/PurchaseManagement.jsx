import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const initialForm = {
  supplierId: '',
  invoiceNumber: '',
  totalAmount: '',
  notes: '',
  items: [
    {
      medicineId: '',
      quantity: '',
      costPrice: '',
      sellingPrice: '',
      totalAmount: '',
      batchNumber: '',
      expiryDate: '',
    },
  ],
};

function PurchaseManagement() {
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setPurchases(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Failed');
      setForm(initialForm);
      fetchPurchases();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Procurement</p>
          <h2>Purchase Management</h2>
        </div>
      </div>

      <form className="medicine-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <input placeholder="Supplier ID" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required />
          <input placeholder="Invoice Number" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required />
          <input placeholder="Total Amount" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="panel">
          <h3>Purchase Items</h3>
          <div className="form-grid">
            <input placeholder="Medicine ID" value={form.items[0].medicineId} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], medicineId: e.target.value }] })} />
            <input placeholder="Quantity" type="number" value={form.items[0].quantity} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], quantity: e.target.value }] })} />
            <input placeholder="Cost Price" type="number" value={form.items[0].costPrice} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], costPrice: e.target.value }] })} />
            <input placeholder="Selling Price" type="number" value={form.items[0].sellingPrice} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], sellingPrice: e.target.value }] })} />
            <input placeholder="Batch Number" value={form.items[0].batchNumber} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], batchNumber: e.target.value }] })} />
            <input placeholder="Expiry Date" type="date" value={form.items[0].expiryDate} onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], expiryDate: e.target.value }] })} />
          </div>
        </div>
        <button className="primary-btn" type="submit">Save Purchase</button>
      </form>

      <div className="panel">
        <h3>Purchase History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.invoiceNumber}</td>
                <td>{purchase.supplier?.name || '—'}</td>
                <td>{purchase.totalAmount}</td>
                <td>{purchase.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseManagement;
