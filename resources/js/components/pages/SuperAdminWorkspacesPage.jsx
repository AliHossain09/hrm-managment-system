import axios from 'axios';
import React from 'react';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

const initialForm = {
    name: '',
    status: 'active',
    master_admin_email: '',
    master_admin_password: '',
    master_admin_phone: '',
    master_admin_address: '',
    workspace_logo: null,
};

function EditModal({ open, item, busy, onClose, onSubmit }) {
    const [form, setForm] = React.useState(initialForm);

    React.useEffect(() => {
        if (!open || !item) return;
        setForm({
            name: item.name || '',
            status: item.status || 'active',
            master_admin_email: item.email || '',
            master_admin_password: '',
            master_admin_phone: item.phone || '',
            master_admin_address: item.address || '',
            workspace_logo: null,
        });
    }, [open, item]);

    if (!open || !item) return null;

    const submit = async (e) => {
        e.preventDefault();

        const payload = new FormData();
        payload.append('name', form.name);
        payload.append('status', form.status);
        payload.append('master_admin_email', form.master_admin_email);
        if (form.master_admin_password) payload.append('master_admin_password', form.master_admin_password);
        payload.append('master_admin_phone', form.master_admin_phone || '');
        payload.append('master_admin_address', form.master_admin_address || '');
        if (form.workspace_logo) payload.append('workspace_logo', form.workspace_logo);

        await onSubmit(item.workspace_id, payload);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <h2>Edit Master Admin Dashboard</h2>
                    <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form className="modal-grid" onSubmit={submit}>
                    <label>Dashboard Name<input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
                    <label>Master Admin Email<input className="form-input" type="email" value={form.master_admin_email} onChange={(e) => setForm((p) => ({ ...p, master_admin_email: e.target.value }))} required /></label>
                    <label>Password (optional)<input className="form-input" type="password" value={form.master_admin_password} onChange={(e) => setForm((p) => ({ ...p, master_admin_password: e.target.value }))} /></label>
                    <label>Phone Number<input className="form-input" value={form.master_admin_phone} onChange={(e) => setForm((p) => ({ ...p, master_admin_phone: e.target.value }))} /></label>
                    <label>Address<input className="form-input" value={form.master_admin_address} onChange={(e) => setForm((p) => ({ ...p, master_admin_address: e.target.value }))} /></label>
                    <label>
                        Account Status
                        <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                        </select>
                    </label>
                    <label>
                        Dashboard Logo/Image
                        <input className="form-input" type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, workspace_logo: e.target.files?.[0] || null }))} />
                    </label>

                    <div className="modal-actions">
                        <button className="btn-primary small" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update'}</button>
                        <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SuperAdminWorkspacesPage({ user, onLogout, headers, showToast, mode = 'index' }) {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [form, setForm] = React.useState(initialForm);
    const [editing, setEditing] = React.useState(null);

    const load = React.useCallback(async () => {
        const { data } = await api.get('/super-admin/workspaces', { headers });
        setRows(data?.data?.workspaces || []);
    }, [headers]);

    React.useEffect(() => {
        const run = async () => {
            try {
                await load();
            } catch (error) {
                showToast('error', error?.response?.data?.message || 'Unable to load master admin dashboards.');
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
            const payload = new FormData();
            payload.append('name', form.name);
            payload.append('status', form.status);
            payload.append('master_admin_email', form.master_admin_email);
            payload.append('master_admin_password', form.master_admin_password);
            if (form.master_admin_phone) payload.append('master_admin_phone', form.master_admin_phone);
            if (form.master_admin_address) payload.append('master_admin_address', form.master_admin_address);
            if (form.workspace_logo) payload.append('workspace_logo', form.workspace_logo);

            await api.post('/super-admin/workspaces', payload, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data',
                },
            });

            showToast('success', 'Master admin dashboard created successfully.');
            setForm(initialForm);
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to create master admin dashboard.');
        } finally {
            setBusy(false);
        }
    };

    const update = async (workspaceId, payload) => {
        setBusy(true);
        try {
            payload.append('_method', 'PUT');
            await api.post(`/super-admin/workspaces/${workspaceId}`, payload, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data',
                },
            });
            showToast('success', 'Master admin dashboard updated successfully.');
            setEditing(null);
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to update dashboard.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row) => {
        const ok = window.confirm(`Delete dashboard ${row.name}?`);
        if (!ok) return;

        setBusy(true);
        try {
            await api.delete(`/super-admin/workspaces/${row.workspace_id}`, { headers });
            showToast('success', 'Dashboard deleted successfully.');
            await load();
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to delete dashboard.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Super Admin: Master Admin Dashboards</h1>

            {mode === 'create' ? (
                <section className="panel">
                    <h3>Create Master Admin Dashboard</h3>
                    <form className="modal-grid" onSubmit={create}>
                        <label>Dashboard Name<input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>Master Admin Email<input className="form-input" type="email" value={form.master_admin_email} onChange={(e) => setForm((p) => ({ ...p, master_admin_email: e.target.value }))} required /></label>
                        <label>Master Admin Password<input className="form-input" type="password" value={form.master_admin_password} onChange={(e) => setForm((p) => ({ ...p, master_admin_password: e.target.value }))} required /></label>
                        <label>Phone Number<input className="form-input" value={form.master_admin_phone} onChange={(e) => setForm((p) => ({ ...p, master_admin_phone: e.target.value }))} /></label>
                        <label>Address<input className="form-input" value={form.master_admin_address} onChange={(e) => setForm((p) => ({ ...p, master_admin_address: e.target.value }))} /></label>
                        <label>
                            Dashboard Logo/Image
                            <input className="form-input" type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, workspace_logo: e.target.files?.[0] || null }))} />
                        </label>
                        <label>
                            Account Status
                            <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                            </select>
                        </label>
                        <div className="modal-actions">
                            <button className="btn-primary small" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Master Admin Dashboard'}</button>
                        </div>
                    </form>
                </section>
            ) : null}

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>Index Master Admin Dashboard</h3>
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
                                    <th>Image</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.workspace_id}>
                                        <td>{row.id || '-'}</td>
                                        <td>{row.email || '-'}</td>
                                        <td>{row.password || '********'}</td>
                                        <td>{row.phone || '-'}</td>
                                        <td>{row.address || '-'}</td>
                                        <td>
                                            {row.image_url ? (
                                                <img src={row.image_url} alt="Dashboard logo" style={{ width: '42px', height: '42px', borderRadius: '999px', objectFit: 'cover' }} />
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div className="event-action-cell">
                                                <button className="btn-mini btn-mini-edit" type="button" onClick={() => setEditing(row)}>Edit</button>
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

            <EditModal
                open={Boolean(editing)}
                item={editing}
                busy={busy}
                onClose={() => setEditing(null)}
                onSubmit={update}
            />
        </AppShell>
    );
}
