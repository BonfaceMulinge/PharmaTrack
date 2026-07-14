import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const initialForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  taxNumber: '',
  paymentTerms: '',
  balance: '0',
};

function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/suppliers`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Failed');
      setForm(initialForm);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Partners</p>
          <h2>Supplier Management</h2>
        </div>
        <button className="primary-btn">+ Add Supplier</button>
      </div>

      <form className="medicine-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <input placeholder="Supplier Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input placeholder="Tax Number" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
          <input placeholder="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
          <input placeholder="Opening Balance" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
        </div>
        <button className="primary-btn" type="submit">Save Supplier</button>
      </form>

      <div className="panel">
        <h3>Supplier Directory</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.contactPerson || '—'}</td>
                <td>{supplier.phone || '—'}</td>
                <td>{supplier.email || '—'}</td>
                <td>{supplier.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SupplierManagement;
