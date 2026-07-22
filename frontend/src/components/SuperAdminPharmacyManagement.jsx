import { useState, useEffect, useCallback, memo } from 'react';
import { API_URL } from '../api';
import { useDebounce } from '../hooks/useDebounce';

function SuperAdminPharmacyManagement() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', ownerName: '', email: '', phone: '', country: '', password: '',
  });
  const [createResult, setCreateResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [renewMonths, setRenewMonths] = useState({});

  const debouncedSearch = useDebounce(search, 300);

  const fetchPharmacies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filter !== 'ALL') params.set('status', filter);
      const res = await fetch(`${API_URL}/super-admin/pharmacies?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPharmacies(data.pharmacies);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load pharmacies' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (filter !== 'ALL') params.set('status', filter);
        const res = await fetch(`${API_URL}/super-admin/pharmacies?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) setPharmacies(data.pharmacies);
      } catch {
        if (!cancelled) setMessage({ type: 'error', text: 'Failed to load pharmacies' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [debouncedSearch, filter]);

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setCreateResult(null);

    try {
      const res = await fetch(`${API_URL}/super-admin/pharmacies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCreateResult(data);
      setMessage({ type: 'success', text: 'Pharmacy created successfully!' });
      setCreateForm({ name: '', ownerName: '', email: '', phone: '', country: '', password: '' });
      fetchPharmacies();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [createForm, fetchPharmacies]);

  const handleSuspend = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL}/super-admin/pharmacies/${id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMessage({ type: 'success', text: 'Pharmacy suspended' });
      fetchPharmacies();
    } catch {
      setMessage({ type: 'error', text: 'Failed to suspend pharmacy' });
    }
  }, [fetchPharmacies]);

  const handleActivate = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL}/super-admin/pharmacies/${id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMessage({ type: 'success', text: 'Pharmacy activated' });
      fetchPharmacies();
    } catch {
      setMessage({ type: 'error', text: 'Failed to activate pharmacy' });
    }
  }, [fetchPharmacies]);

  const handleDelete = useCallback(async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/super-admin/pharmacies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMessage({ type: 'success', text: 'Pharmacy deleted' });
      fetchPharmacies();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete pharmacy' });
    }
  }, [fetchPharmacies]);

  const handleRenew = useCallback(async (id) => {
    const months = parseInt(renewMonths[id] || '1', 10);
    try {
      const res = await fetch(`${API_URL}/super-admin/pharmacies/${id}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}`,
        },
        body: JSON.stringify({ months }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessage({ type: 'success', text: data.message });
      fetchPharmacies();
    } catch {
      setMessage({ type: 'error', text: 'Failed to renew subscription' });
    }
  }, [renewMonths, fetchPharmacies]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
  }, []);

  const handleToggleCreate = useCallback(() => {
    setShowCreate((prev) => !prev);
  }, []);

  return (
    <>
      <div className="topbar">
        <h1>Pharmacies</h1>
        <div className="topbar-actions">
          <button className="primary-btn" onClick={handleToggleCreate}>
            {showCreate ? 'Cancel' : '+ Create Pharmacy'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`status-banner ${message.type === 'error' ? 'error-banner' : 'success-banner'}`} style={{ marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {showCreate && (
        <div className="medicine-form" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px', color: '#f8fafc' }}>Create New Pharmacy</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="auth-field">
                <label>Pharmacy Name *</label>
                <input
                  type="text"
                  placeholder="e.g. City Pharmacy"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="auth-field">
                <label>Owner Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  required
                />
              </div>
              <div className="auth-field">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="owner@pharmacy.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="auth-field">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="+254 700 000000"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="auth-field">
                <label>Country</label>
                <input
                  type="text"
                  placeholder="e.g. Kenya"
                  value={createForm.country}
                  onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                />
              </div>
              <div className="auth-field">
                <label>Temporary Password *</label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button className="primary-btn" type="submit">Create Pharmacy & Admin</button>
          </form>

          {createResult && (
            <div className="status-banner success-banner" style={{ marginTop: '12px' }}>
              <strong>Created!</strong> Admin email: {createResult.adminEmail} | Temp password: <code>{createResult.tempPassword}</code>
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div className="pos-filters">
            <input
              className="search-input"
              type="text"
              placeholder="Search pharmacies..."
              value={search}
              onChange={handleSearchChange}
            />
            <select value={filter} onChange={handleFilterChange}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="home-loading"><div className="spinner" /><span>Loading...</span></div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pharmacy</th>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Expiry</th>
                  <th>Users</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pharmacies.length === 0 ? (
                  <tr><td className="empty-table" colSpan="7">No pharmacies found</td></tr>
                ) : pharmacies.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.ownerName || '-'}</td>
                    <td>{p.email || '-'}</td>
                    <td>
                      <span className={`badge ${p.subscriptionStatus === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {p.subscriptionStatus}
                      </span>
                    </td>
                    <td>{p.subscriptionExpiryDate ? new Date(p.subscriptionExpiryDate).toLocaleDateString() : '-'}</td>
                    <td>{p._count?.users ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.subscriptionStatus !== 'ACTIVE' ? (
                          <button className="ghost-btn small-btn" onClick={() => handleActivate(p.id)}>Activate</button>
                        ) : (
                          <button className="ghost-btn small-btn" onClick={() => handleSuspend(p.id)}>Suspend</button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            className="search-input"
                            type="number"
                            min="1"
                            max="60"
                            value={renewMonths[p.id] || '1'}
                            onChange={(e) => setRenewMonths({ ...renewMonths, [p.id]: e.target.value })}
                            style={{ width: '60px', padding: '4px 6px', fontSize: '0.8rem' }}
                          />
                          <button className="ghost-btn small-btn" onClick={() => handleRenew(p.id)}>Renew</button>
                        </div>
                        <button className="ghost-btn small-btn danger-btn" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(SuperAdminPharmacyManagement);
