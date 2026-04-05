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

export default function EmployeeLeavesPage({ user, onLogout, headers, showToast }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [portal, setPortal] = useState({
        leave_types: [],
        leave_requests: [],
        notifications: [],
        unread_notifications_count: 0,
        year: new Date().getFullYear(),
    });
    const [form, setForm] = useState({
        leave_type_id: '',
        from_date: '',
        to_date: '',
        reason: '',
    });

    const loadPortal = async () => {
        const { data } = await api.get('/employee/leaves', { headers });
        const nextPortal = data?.data || {};
        setPortal({
            leave_types: nextPortal.leave_types || [],
            leave_requests: nextPortal.leave_requests || [],
            notifications: nextPortal.notifications || [],
            unread_notifications_count: nextPortal.unread_notifications_count || 0,
            year: nextPortal.year || new Date().getFullYear(),
        });

        setForm((prev) => ({
            ...prev,
            leave_type_id: prev.leave_type_id || String(nextPortal.leave_types?.[0]?.leave_type_id || ''),
        }));
    };

    useEffect(() => {
        const run = async () => {
            try {
                await loadPortal();
            } catch (error) {
                showToast('error', extractMessage(error));
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const submitForm = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            const { data } = await api.post('/employee/leaves', form, { headers });
            setPortal((prev) => ({
                ...prev,
                ...(data?.data?.portal || {}),
            }));
            setForm((prev) => ({
                ...prev,
                from_date: '',
                to_date: '',
                reason: '',
            }));
            showToast('success', data?.message || 'Leave request submitted successfully.');
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all', {}, { headers });
            await loadPortal();
            showToast('success', 'All notifications marked as read.');
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    const markOneRead = async (notificationId) => {
        try {
            await api.post(`/notifications/${notificationId}/read`, {}, { headers });
            await loadPortal();
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell
            user={user}
            onLogout={onLogout}
            notifications={portal.notifications}
            unreadNotificationsCount={portal.unread_notifications_count}
            onMarkAllNotificationsRead={markAllRead}
            onMarkNotificationRead={markOneRead}
        >
            <h1 className="dashboard-title">Leave Apply & Status</h1>

            <section className="notice-row leave-notice-row">
                <div className="badge-orange">Notify</div>
                <div className="notice-text">
                    {portal.notifications[0]?.message || `You have ${portal.unread_notifications_count} unread notification(s).`}
                </div>
                <button className="btn-primary small" type="button" onClick={markAllRead}>
                    Mark All Read
                </button>
            </section>

            <section className="leave-balance-grid">
                {portal.leave_types.map((item) => (
                    <article key={item.leave_type_id} className="panel leave-balance-card">
                        <h3>{item.leave_name}</h3>
                        <p className="panel-muted">Year {item.year}</p>
                        <strong>{item.remaining_days}</strong>
                        <p className="text-muted">Remaining</p>
                        <p className="text-muted">Used: {item.used_days} | Pending: {item.pending_days}</p>
                    </article>
                ))}
            </section>

            <section className="panel leave-form-panel" style={{ marginTop: '1rem' }}>
                <h3>Apply For Leave</h3>
                <form className="leave-form-grid" onSubmit={submitForm}>
                    <label>
                        Leave Type
                        <select
                            className="form-input"
                            value={form.leave_type_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, leave_type_id: e.target.value }))}
                            required
                        >
                            <option value="">Select leave type</option>
                            {portal.leave_types.map((item) => (
                                <option key={item.leave_type_id} value={item.leave_type_id}>
                                    {item.leave_name} ({item.available_to_request} available)
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        From Date
                        <input
                            className="form-input"
                            type="date"
                            value={form.from_date}
                            onChange={(e) => setForm((prev) => ({ ...prev, from_date: e.target.value }))}
                            required
                        />
                    </label>

                    <label>
                        To Date
                        <input
                            className="form-input"
                            type="date"
                            value={form.to_date}
                            onChange={(e) => setForm((prev) => ({ ...prev, to_date: e.target.value }))}
                            required
                        />
                    </label>

                    <label>
                        Reason
                        <textarea
                            className="form-input"
                            value={form.reason}
                            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                            placeholder="Reason for leave"
                            rows="3"
                        />
                    </label>

                    <div className="leave-form-actions">
                        <button className="btn-primary" type="submit" disabled={saving || !form.leave_type_id}>
                            {saving ? 'Submitting...' : 'Submit Leave Request'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="panel" style={{ marginTop: '1rem' }}>
                <h3>My Leave Requests</h3>
                {loading ? (
                    <p className="panel-muted">Loading leave requests...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Leave</th>
                                    <th>Date Range</th>
                                    <th>Days</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Admin Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portal.leave_requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-muted">No leave request found.</td>
                                    </tr>
                                ) : (
                                    portal.leave_requests.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.id}</td>
                                            <td>{item.leave_name}</td>
                                            <td>{item.from_date} to {item.to_date}</td>
                                            <td>{item.requested_days}</td>
                                            <td><span className={`leave-status-pill ${item.status}`}>{item.status}</span></td>
                                            <td>{item.reason || '-'}</td>
                                            <td>{item.review_note || '-'}</td>
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
