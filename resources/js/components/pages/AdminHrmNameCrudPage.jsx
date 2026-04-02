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

export default function AdminHrmNameCrudPage({
    user,
    onLogout,
    headers,
    showToast,
    title,
    createLabel,
    endpoint,
    responseKey,
    nameLabel,
    confirmDeleteLabel,
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');

    const loadItems = async () => {
        const { data } = await api.get(endpoint, { headers });
        setItems(data?.data?.[responseKey] || []);
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
        setName('');
    };

    const submitForm = async (event) => {
        event.preventDefault();

        setSaving(true);
        try {
            const payload = { name };

            if (editingId) {
                await api.put(`${endpoint}/${editingId}`, payload, { headers });
                showToast('success', `${nameLabel} updated successfully.`);
            } else {
                await api.post(endpoint, payload, { headers });
                showToast('success', `${nameLabel} created successfully.`);
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
        setName(item.name || '');
    };

    const deleteItem = async (item) => {
        const ok = window.confirm(`Delete ${confirmDeleteLabel} "${item.name}"?`);
        if (!ok) return;

        try {
            await api.delete(`${endpoint}/${item.id}`, { headers });
            await loadItems();
            showToast('success', `${nameLabel} deleted successfully.`);

            if (editingId === item.id) {
                resetForm();
            }
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">{title}</h1>

            <section className="panel leave-form-panel">
                <h3>{editingId ? `Edit ${nameLabel}` : createLabel}</h3>
                <form className="leave-form-grid" onSubmit={submitForm}>
                    <label>
                        {nameLabel}
                        <input
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`Enter ${nameLabel}`}
                            required
                        />
                    </label>

                    <div className="leave-form-actions">
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingId ? `Update ${nameLabel}` : createLabel}
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
                <h3>{title} Index</h3>
                {loading ? (
                    <p className="panel-muted">Loading list...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table hrm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{nameLabel}</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-muted">No data found.</td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.name}</td>
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

