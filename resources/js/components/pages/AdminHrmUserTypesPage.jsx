import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        Accept: 'application/json',
    },
});

function extractMessage(error) {
    const errors = error?.response?.data?.errors;
    if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        if (firstKey && Array.isArray(errors[firstKey])) {
            return errors[firstKey][0];
        }
    }

    return error?.response?.data?.message || error?.message || 'Something went wrong.';
}

export default function AdminHrmUserTypesPage({ user, onLogout, headers, showToast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', is_part_time: false });

    const loadItems = async () => {
        const { data } = await api.get('/hrm/user-types', { headers });
        setItems(data?.data?.user_types || []);
    };

    useEffect(() => {
        const run = async () => {
            try {
                await loadItems();
            } catch (error) {
                showToast('error', extractMessage(error));
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setForm({ name: '', is_part_time: false });
    };

    const submitForm = async (event) => {
        event.preventDefault();

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                is_part_time: form.is_part_time,
            };

            if (editingId) {
                await api.put(`/hrm/user-types/${editingId}`, payload, { headers });
                showToast('success', 'User type updated successfully.');
            } else {
                await api.post('/hrm/user-types', payload, { headers });
                showToast('success', 'User type created successfully.');
            }

            await loadItems();
            resetForm();
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setForm({
            name: item.name || '',
            is_part_time: Boolean(item.is_part_time),
        });
    };

    const deleteItem = async (item) => {
        const ok = window.confirm(`Delete user type "${item.name}"?`);
        if (!ok) return;

        try {
            await api.delete(`/hrm/user-types/${item.id}`, { headers });
            await loadItems();
            showToast('success', 'User type deleted successfully.');

            if (editingId === item.id) {
                resetForm();
            }
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">User Type Create & Index</h1>

            <section className="panel leave-form-panel">
                <h3>{editingId ? 'Edit User Type' : 'Create User Type'}</h3>
                <form className="leave-form-grid" onSubmit={submitForm}>
                    <label>
                        User Type
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Permanent"
                            required
                        />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
                        <input
                            type="checkbox"
                            checked={form.is_part_time}
                            onChange={(e) => setForm((prev) => ({ ...prev, is_part_time: e.target.checked }))}
                        />
                        Part Time Type
                    </label>

                    <div className="leave-form-actions">
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingId ? 'Update User Type' : 'Create User Type'}
                        </button>
                        {editingId ? (
                            <button className="btn-ghost" type="button" onClick={resetForm}>
                                Cancel Edit
                            </button>
                        ) : null}
                    </div>
                </form>
            </section>

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>User Type Index</h3>
                {loading ? (
                    <p className="panel-muted">Loading user type list...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table hrm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User Type</th>
                                    <th>Part Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-muted">No user type found.</td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.name}</td>
                                            <td>{item.is_part_time ? 'Yes' : 'No'}</td>
                                            <td className="event-action-cell">
                                                <button className="btn-mini btn-mini-edit" type="button" onClick={() => startEdit(item)}>
                                                    Edit
                                                </button>
                                                <button className="btn-mini btn-mini-delete" type="button" onClick={() => deleteItem(item)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AppShell>
    );
}

