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

export default function AdminHrmPartTimeHoursPage({ user, onLogout, headers, showToast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [hours, setHours] = useState('');

    const loadItems = async () => {
        const { data } = await api.get('/hrm/part-time-hours', { headers });
        setItems(data?.data?.part_time_hours || []);
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
        setHours('');
    };

    const submitForm = async (event) => {
        event.preventDefault();

        setSaving(true);
        try {
            const payload = {
                hours: Number(hours),
            };

            if (editingId) {
                await api.put(`/hrm/part-time-hours/${editingId}`, payload, { headers });
                showToast('success', 'Part time hours updated successfully.');
            } else {
                await api.post('/hrm/part-time-hours', payload, { headers });
                showToast('success', 'Part time hours created successfully.');
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
        setHours(String(item.hours || ''));
    };

    const deleteItem = async (item) => {
        const ok = window.confirm(`Delete part time hour "${item.hours}"?`);
        if (!ok) return;

        try {
            await api.delete(`/hrm/part-time-hours/${item.id}`, { headers });
            await loadItems();
            showToast('success', 'Part time hours deleted successfully.');

            if (editingId === item.id) {
                resetForm();
            }
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Part Time Hours Create & Index</h1>

            <section className="panel leave-form-panel">
                <h3>{editingId ? 'Edit Part Time Hours' : 'Create Part Time Hours'}</h3>
                <form className="leave-form-grid" onSubmit={submitForm}>
                    <label>
                        Hours
                        <input
                            className="form-input"
                            type="number"
                            min="1"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            placeholder="e.g. 6"
                            required
                        />
                    </label>

                    <div className="leave-form-actions">
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingId ? 'Update Part Time Hours' : 'Create Part Time Hours'}
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
                <h3>Part Time Hours Index</h3>
                {loading ? (
                    <p className="panel-muted">Loading part time hour list...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table hrm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Hours</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-muted">No part time hours found.</td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.hours}</td>
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




