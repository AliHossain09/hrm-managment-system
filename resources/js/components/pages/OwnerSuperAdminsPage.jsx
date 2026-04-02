import axios from 'axios';
import React from 'react';
import AppShell from '../layout/AppShell.jsx';
import { confirmDelete } from '../../utils/sweetAlert.js';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

const initialForm = {
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    status: 'active',
    subscription_starts_at: '',
    subscription_ends_at: '',
    billing_cycle_days: 30,
};

function SuperAdminModal({ open, initial, busy, onClose, onSubmit }) {
    const [form, setForm] = React.useState(initialForm);

    React.useEffect(() => {
        if (!open) return;
        if (!initial) {
            setForm(initialForm);
            return;
        }

        setForm({
            name: initial.name || '',
            email: initial.email || '',
            password: '',
            phone: initial.phone || '',
            address: initial.address || '',
            status: initial.status || 'active',
            subscription_starts_at: (initial.subscription_starts_at || '').slice(0, 10),
            subscription_ends_at: (initial.subscription_ends_at || '').slice(0, 10),
            billing_cycle_days: initial.billing_cycle_days || 30,
        });
    }, [open, initial]);

    if (!open) return null;

    const submit = async (e) => {
        e.preventDefault();
        await onSubmit(form);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <h2>Edit Super Admin</h2>
                    <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form className="modal-grid" onSubmit={submit}>
                    <label>Name<input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
                    <label>Email<input className="form-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                    <label>Password (optional)<input className="form-input" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></label>
                    <label>Phone<input className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label>Address<input className="form-input" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></label>
                    <label>
                        Account Status
                        <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                        </select>
                    </label>
                    <label>Subscription Start<input className="form-input" type="date" value={form.subscription_starts_at} onChange={(e) => setForm((p) => ({ ...p, subscription_starts_at: e.target.value }))} /></label>
                    <label>Subscription End<input className="form-input" type="date" value={form.subscription_ends_at} onChange={(e) => setForm((p) => ({ ...p, subscription_ends_at: e.target.value }))} /></label>

                    <div className="modal-actions">
                        <button className="btn-primary small" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update'}</button>
                        <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function OwnerSuperAdminsPage({ user, onLogout, headers, showToast, mode = 'index' }) {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [selected, setSelected] = React.useState(null);

    const [form, setForm] = React.useState(initialForm);

    const load = React.useCallback(async () => {
        const { data } = await api.get('/owner/super-admins', { headers });
        setRows(data?.data?.super_admins || []);
    }, [headers]);

    React.useEffect(() => {
        const run = async () => {
            try {
                await load();
            } catch (error) {
                showToast('error', error?.response?.data?.message || 'Unable to load super admins.');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [load, showToast]);

    const create = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post('/owner/super-admins', form, { headers });
            showToast('success', 'Super admin created successfully.');
            setForm(initialForm);
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to create super admin.');
        } finally {
            setBusy(false);
        }
    };

    const submitEdit = async (payload) => {
        setBusy(true);
        try {
            await api.put(`/owner/super-admins/${selected.id}`, payload, { headers });
            showToast('success', 'Super admin updated successfully.');
            setModalOpen(false);
            setSelected(null);
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to update super admin.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = await confirmDelete(`Delete super admin ${row.email}?`);
        if (!ok) return;

        setBusy(true);
        try {
            await api.delete(`/owner/super-admins/${row.id}`, { headers });
            showToast('success', 'Super admin deleted successfully.');
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to delete super admin.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} owner>
            <h1 className="dashboard-title">Owner: Super Admin Management</h1>

            {mode === 'create' ? (
                <section className="panel">
                    <h3>Create Super Admin</h3>
                    <form className="modal-grid" onSubmit={create}>
                        <label>Name<input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>Email<input className="form-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                        <label>Password<input className="form-input" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                        <label>Phone Number<input className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                        <label>Address<input className="form-input" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></label>
                        <label>
                            Account Status
                            <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                            </select>
                        </label>
                        <label>Subscription Start<input className="form-input" type="date" value={form.subscription_starts_at} onChange={(e) => setForm((p) => ({ ...p, subscription_starts_at: e.target.value }))} /></label>
                        <label>Subscription End<input className="form-input" type="date" value={form.subscription_ends_at} onChange={(e) => setForm((p) => ({ ...p, subscription_ends_at: e.target.value }))} /></label>
                        <label>
                            Billing Cycle (Days)
                            <input className="form-input" type="number" min="1" max="3650" value={form.billing_cycle_days} onChange={(e) => setForm((p) => ({ ...p, billing_cycle_days: Number(e.target.value || 30) }))} />
                        </label>

                        <div className="modal-actions">
                            <button className="btn-primary small" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Super Admin'}</button>
                        </div>
                    </form>
                </section>
            ) : null}

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>Super Admin Index</h3>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table owner-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Password</th>
                                    <th>Phone Number</th>
                                    <th>Address</th>
                                    <th>Subscription Time</th>
                                    <th>Payment Status</th>
                                    <th>Account Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.id}</td>
                                        <td>{row.email}</td>
                                        <td>********</td>
                                        <td>{row.phone || '-'}</td>
                                        <td>{row.address || '-'}</td>
                                        <td>{row.subscription_starts_at || '-'} to {row.subscription_ends_at || '-'}</td>
                                        <td>{row.payment_status || 'unpaid'}</td>
                                        <td>{row.status}</td>
                                        <td>
                                            <div className="event-action-cell">
                                                <button className="btn-mini btn-mini-edit" type="button" onClick={() => { setSelected(row); setModalOpen(true); }}>Edit</button>
                                                <button className="btn-mini btn-mini-delete" type="button" onClick={() => remove(row)} disabled={busy}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <SuperAdminModal
                open={modalOpen}
                initial={selected}
                busy={busy}
                onClose={() => { setModalOpen(false); setSelected(null); }}
                onSubmit={submitEdit}
            />
        </AppShell>
    );
}

