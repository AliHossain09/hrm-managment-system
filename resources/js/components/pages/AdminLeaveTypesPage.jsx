import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AppShell from '../layout/AppShell.jsx';
import { confirmDelete } from '../../utils/sweetAlert.js';

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

export default function AdminLeaveTypesPage({ user, onLogout, headers, showToast }) {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reviewingId, setReviewingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        leave_name: '',
        leave_days: '',
    });

    const loadLeaveTypes = async () => {
        const [{ data: leaveData }, { data: requestData }] = await Promise.all([
            api.get('/leaves', { headers }),
            api.get('/admin/leave-requests', { headers }),
        ]);

        setLeaveTypes(leaveData?.data?.leave_types || []);
        setLeaveRequests(requestData?.data?.recent_requests || []);
    };

    useEffect(() => {
        const run = async () => {
            try {
                await loadLeaveTypes();
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
        setForm({ leave_name: '', leave_days: '' });
    };

    const submitForm = async (event) => {
        event.preventDefault();

        setSaving(true);
        try {
            const payload = {
                leave_name: form.leave_name,
                leave_days: Number(form.leave_days),
            };

            if (editingId) {
                await api.put(`/leaves/${editingId}`, payload, { headers });
                showToast('success', 'Leave updated successfully.');
            } else {
                await api.post('/leaves', payload, { headers });
                showToast('success', 'Leave created successfully.');
            }

            await loadLeaveTypes();
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
            leave_name: item.leave_name || '',
            leave_days: String(item.leave_days || ''),
        });
    };

    const deleteItem = async (item) => {
        const ok = await confirmDelete(`Delete leave type "${item.leave_name}"?`);
        if (!ok) return;

        try {
            await api.delete(`/leaves/${item.id}`, { headers });
            await loadLeaveTypes();
            showToast('success', 'Leave deleted successfully.');

            if (editingId === item.id) {
                resetForm();
            }
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    const reviewRequest = async (item, status) => {
        setReviewingId(item.id);

        try {
            await api.put(`/admin/leave-requests/${item.id}`, { status }, { headers });
            await loadLeaveTypes();
            showToast('success', `Leave request ${status} successfully.`);
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setReviewingId(null);
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Leave Create & Index</h1>

            <section className="panel leave-form-panel">
                <h3>{editingId ? 'Edit Leave' : 'Create Leave'}</h3>
                <form className="leave-form-grid" onSubmit={submitForm}>
                    <label>
                        Leave Name
                        <input
                            className="form-input"
                            value={form.leave_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, leave_name: e.target.value }))}
                            placeholder="e.g. Sick Leave"
                            required
                        />
                    </label>

                    <label>
                        Leave Days
                        <input
                            className="form-input"
                            type="number"
                            min="1"
                            max="365"
                            value={form.leave_days}
                            onChange={(e) => setForm((prev) => ({ ...prev, leave_days: e.target.value }))}
                            placeholder="e.g. 14"
                            required
                        />
                    </label>

                    <div className="leave-form-actions">
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingId ? 'Update Leave' : 'Create Leave'}
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
                <h3>Leave Index</h3>
                {loading ? (
                    <p className="panel-muted">Loading leave list...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table hrm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Leave Name</th>
                                    <th>Leave Days</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-muted">No leave type found.</td>
                                    </tr>
                                ) : (
                                    leaveTypes.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.leave_name}</td>
                                            <td>{item.leave_days}</td>
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

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>Leave Request Approval</h3>
                {loading ? (
                    <p className="panel-muted">Loading leave requests...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table hrm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Employee</th>
                                    <th>Leave</th>
                                    <th>Date Range</th>
                                    <th>Days</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-muted">No leave request found.</td>
                                    </tr>
                                ) : (
                                    leaveRequests.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.employee_name || '-'}</td>
                                            <td>{item.leave_name || '-'}</td>
                                            <td>{item.from_date} to {item.to_date}</td>
                                            <td>{item.requested_days}</td>
                                            <td><span className={`leave-status-pill ${item.status}`}>{item.status}</span></td>
                                            <td>{item.reason || '-'}</td>
                                            <td className="event-action-cell">
                                                {item.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            className="btn-mini btn-mini-edit"
                                                            type="button"
                                                            disabled={reviewingId === item.id}
                                                            onClick={() => reviewRequest(item, 'approved')}
                                                        >
                                                            {reviewingId === item.id ? 'Working...' : 'Approve'}
                                                        </button>
                                                        <button
                                                            className="btn-mini btn-mini-delete"
                                                            type="button"
                                                            disabled={reviewingId === item.id}
                                                            onClick={() => reviewRequest(item, 'rejected')}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted">{item.approved_by_name || 'Processed'}</span>
                                                )}
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


