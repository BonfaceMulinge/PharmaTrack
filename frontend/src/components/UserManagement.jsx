import { useEffect, useState } from 'react';
import { authFetch, API_URL } from '../api';

const ROLES = ['ADMIN', 'PHARMACIST', 'CASHIER'];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    role: 'CASHIER',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'CASHIER',
  });

  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('[Users] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await authFetch(`${API_URL}/users`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('[Users] Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await authFetch(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');

      setForm({ fullName: '', email: '', username: '', password: '', phone: '', role: 'CASHIER' });
      setShowForm(false);
      setStatus({ type: 'success', message: data.message || 'User created successfully' });
      fetchUsers();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await authFetch(`${API_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');

      setEditingUser(null);
      setStatus({ type: 'success', message: data.message || 'User updated successfully' });
      fetchUsers();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await authFetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        fetchUsers();
        setStatus({ type: 'success', message: `User ${user.isActive ? 'disabled' : 'enabled'} successfully` });
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to update user status' });
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.fullName}"?`)) return;

    try {
      const res = await authFetch(`${API_URL}/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');

      setStatus({ type: 'success', message: data.message || 'User deleted successfully' });
      fetchUsers();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    try {
      const res = await authFetch(`${API_URL}/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');

      setResetPasswordUser(null);
      setNewPassword('');
      setStatus({ type: 'success', message: data.message || 'Password reset successfully' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>User Management</h2>
        </div>
        <button className="primary-btn" type="button" onClick={() => { setShowForm(!showForm); setEditingUser(null); }}>
          {showForm ? 'Close Form' : '+ Add User'}
        </button>
      </div>

      {status.message && (
        <div className={`status-banner ${status.type === 'error' ? 'error-banner' : 'success-banner'}`}>
          {status.message}
        </div>
      )}

      {showForm && !editingUser && (
        <form className="medicine-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <input placeholder="Full Name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <input placeholder="Email Address *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Username (auto-generated if empty)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input placeholder="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      {editingUser && (
        <div className="panel">
          <div className="panel-header">
            <h3>Edit: {editingUser.fullName}</h3>
            <button className="ghost-btn" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
          </div>
          <form className="medicine-form" onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <input placeholder="Full Name *" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
              <input placeholder="Email Address *" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
              <input placeholder="Phone Number" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update User'}
            </button>
          </form>
        </div>
      )}

      {resetPasswordUser && (
        <div className="panel">
          <div className="panel-header">
            <h3>Reset Password: {resetPasswordUser.fullName}</h3>
            <button className="ghost-btn" type="button" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}>Cancel</button>
          </div>
          <form className="medicine-form" onSubmit={handleResetPassword}>
            <div className="form-grid">
              <input placeholder="New Password (min 6 chars)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <button className="primary-btn" type="submit">Reset Password</button>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <h3>Users ({users.length})</h3>
        </div>
        {loading ? (
          <div className="loading-state">Loading users...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div>{user.fullName}</div>
                    <small className="muted">{user.username}</small>
                  </td>
                  <td>{user.email}</td>
                  <td><span className="pill">{user.role}</span></td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <button className="ghost-btn small-btn" type="button" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="ghost-btn small-btn" type="button" onClick={() => handleToggleActive(user)}>
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button className="ghost-btn small-btn" type="button" onClick={() => { setResetPasswordUser(user); setNewPassword(''); }}>
                      Reset Password
                    </button>
                    <button className="ghost-btn small-btn danger-btn" type="button" onClick={() => handleDelete(user)}>Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
