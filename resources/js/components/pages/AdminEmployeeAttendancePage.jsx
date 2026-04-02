import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AppShell from '../layout/AppShell.jsx';
import { confirmDelete } from '../../utils/sweetAlert.js';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
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

function initials(name) {
    if (!name) return 'U';

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase())
        .join('');
}

function escapeCsv(value) {
    const raw = value == null ? '' : String(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }

    return raw;
}

function formatDuration(minutes) {
    const safe = Number(minutes || 0);
    if (safe <= 0) return '-';

    const hours = Math.floor(safe / 60);
    const mins = safe % 60;

    return `${hours}h ${mins}m`;
}

export default function AdminEmployeeAttendancePage({ user, onLogout, headers, showToast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        user_id: 'all',
        status: 'all',
        date_from: '',
        date_to: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        user_id: 'all',
        status: 'all',
        date_from: '',
        date_to: '',
    });
    const [editingItem, setEditingItem] = useState(null);
    const [viewingItem, setViewingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        attendance_date: '',
        status: 'present',
        check_in: '',
        check_out: '',
        notes: '',
    });

    const loadItems = async () => {
        const { data } = await api.get('/staff/attendance', { headers });
        setItems(data?.data?.records || []);
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

    const employeeFilterOptions = useMemo(() => {
        const optionMap = new Map();

        items.forEach((item) => {
            const userId = Number(item.user_id || 0);
            if (userId > 0 && !optionMap.has(userId)) {
                optionMap.set(userId, item.user_name || `Employee #${userId}`);
            }
        });

        return Array.from(optionMap.entries()).map(([id, name]) => ({ id, name }));
    }, [items]);

    const filteredItems = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const fromTime = filters.date_from ? new Date(filters.date_from).getTime() : null;
        const toTime = filters.date_to ? new Date(filters.date_to).getTime() : null;

        return items.filter((item) => {
            const textPass = keyword.length === 0 || [
                String(item.id || ''),
                String(item.user_name || ''),
                String(item.user_email || ''),
                String(item.status || ''),
                String(item.attendance_date || ''),
            ].join(' ').toLowerCase().includes(keyword);

            if (!textPass) return false;

            if (filters.user_id !== 'all' && Number(item.user_id) !== Number(filters.user_id)) {
                return false;
            }

            if (filters.status !== 'all' && item.status !== filters.status) {
                return false;
            }

            if (!fromTime && !toTime) return true;

            if (!item.attendance_date) return false;

            const currentDateTime = new Date(item.attendance_date).getTime();
            if (Number.isNaN(currentDateTime)) return false;

            if (fromTime && currentDateTime < fromTime) return false;
            if (toTime && currentDateTime > toTime) return false;

            return true;
        });
    }, [items, searchText, filters]);

    const allSelected = useMemo(
        () => filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(Number(item.id))),
        [filteredItems, selectedIds],
    );

    const toggleAll = () => {
        if (allSelected) {
            const visibleIds = filteredItems.map((item) => Number(item.id));
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev);
            filteredItems.forEach((item) => next.add(Number(item.id)));
            return Array.from(next);
        });
    };

    const toggleOne = (id) => {
        const numId = Number(id);
        setSelectedIds((prev) => (prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]));
    };

    const exportSelected = () => {
        const selected = items.filter((item) => selectedIds.includes(Number(item.id)));
        if (selected.length === 0) {
            showToast('error', 'Select at least one row to export.');
            return;
        }

        const header = ['ID', 'Image + Name', 'Email', 'Attendance', 'Date', 'Clock In', 'Clock Out', 'Over Time', 'Notes'];
        const rows = selected.map((item) => ([
            item.id,
            item.user_name || '-',
            item.user_email || '-',
            item.status || '-',
            item.attendance_date || '-',
            item.check_in || '-',
            item.check_out || '-',
            item.overtime_label ? formatDuration(item.overtime_minutes) : '-',
            item.status === 'leave' ? (item.notes || '-') : '-',
        ].map(escapeCsv).join(',')));

        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.setAttribute('download', `employee_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const applyFilters = () => {
        setFilters({ ...draftFilters });
    };

    const resetFilters = () => {
        const empty = {
            user_id: 'all',
            status: 'all',
            date_from: '',
            date_to: '',
        };
        setFilters(empty);
        setDraftFilters(empty);
    };

    const startEdit = (item) => {
        setEditingItem(item);
        setForm({
            attendance_date: item.attendance_date || '',
            status: item.status || 'present',
            check_in: item.check_in || '',
            check_out: item.check_out || '',
            notes: item.notes || '',
        });
    };

    const resetEdit = () => {
        setEditingItem(null);
        setForm({
            attendance_date: '',
            status: 'present',
            check_in: '',
            check_out: '',
            notes: '',
        });
    };

    const submitEdit = async (event) => {
        event.preventDefault();
        if (!editingItem) return;

        setSaving(true);
        try {
            await api.put(`/staff/attendance/${editingItem.id}`, {
                attendance_date: form.attendance_date,
                status: form.status,
                check_in: form.status === 'present' ? (form.check_in || null) : null,
                check_out: form.status === 'present' ? (form.check_out || null) : null,
                notes: form.status === 'leave' ? (form.notes || null) : null,
            }, { headers });

            showToast('success', 'Attendance updated successfully.');
            await loadItems();
            resetEdit();
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (item) => {
        const ok = await confirmDelete(`Delete attendance record #${item.id}?`);
        if (!ok) return;

        try {
            await api.delete(`/staff/attendance/${item.id}`, { headers });
            showToast('success', 'Attendance deleted successfully.');
            await loadItems();
            if (editingItem && Number(editingItem.id) === Number(item.id)) {
                resetEdit();
            }
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Attendance Records</h1>

            {editingItem ? (
                <section className="panel leave-form-panel" style={{ marginBottom: '1rem' }}>
                    <h3>Edit Attendance: {editingItem.user_name || '-'}</h3>
                    <form className="leave-form-grid" onSubmit={submitEdit}>
                        <label>
                            Date
                            <input className="form-input" type="date" value={form.attendance_date} onChange={(e) => setForm((prev) => ({ ...prev, attendance_date: e.target.value }))} required />
                        </label>
                        <label>
                            Attendance
                            <select className="form-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                                <option value="present">Present</option>
                                <option value="leave">Leave</option>
                                <option value="absent">Absent</option>
                            </select>
                        </label>
                        <label>
                            Clock In
                            <input className="form-input" type="time" value={form.check_in} onChange={(e) => setForm((prev) => ({ ...prev, check_in: e.target.value }))} disabled={form.status !== 'present'} />
                        </label>
                        <label>
                            Clock Out
                            <input className="form-input" type="time" value={form.check_out} onChange={(e) => setForm((prev) => ({ ...prev, check_out: e.target.value }))} disabled={form.status !== 'present'} />
                        </label>
                        <label>
                            Notes
                            <input className="form-input" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} disabled={form.status !== 'leave'} placeholder="Leave notes" />
                        </label>

                        <div className="leave-form-actions">
                            <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
                            <button className="btn-ghost" type="button" onClick={resetEdit}>Cancel</button>
                        </div>
                    </form>
                </section>
            ) : null}

            <section className="panel">
                <div className="attendance-head">
                    <div className="attendance-head-actions">
                        <input
                            type="text"
                            className="form-input attendance-search-input"
                            placeholder="Search..."
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                        />
                        <button type="button" className="btn-ghost attendance-filter-btn" onClick={() => setShowFilters((prev) => !prev)}>
                            {showFilters ? 'Hide Filters' : 'Filters'}
                        </button>
                    </div>
                    <button type="button" className="btn-mini btn-mini-delete" onClick={exportSelected}>Export Selected</button>
                </div>

                {showFilters ? (
                    <div className="attendance-filter-box">
                        <label>
                            Employee
                            <select
                                className="form-input"
                                value={draftFilters.user_id}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, user_id: event.target.value }))}
                            >
                                <option value="all">All Employees</option>
                                {employeeFilterOptions.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Status
                            <select
                                className="form-input"
                                value={draftFilters.status}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}
                            >
                                <option value="all">All Statuses</option>
                                <option value="present">Present</option>
                                <option value="leave">Leave</option>
                                <option value="absent">Absent</option>
                            </select>
                        </label>
                        <label>
                            Date From
                            <input
                                className="form-input"
                                type="date"
                                value={draftFilters.date_from}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value }))}
                            />
                        </label>
                        <label>
                            Date To
                            <input
                                className="form-input"
                                type="date"
                                value={draftFilters.date_to}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value }))}
                            />
                        </label>
                        <div className="attendance-filter-actions">
                            <button type="button" className="btn-primary" onClick={applyFilters}>Apply Filters</button>
                            <button type="button" className="btn-ghost" onClick={resetFilters}>Reset Filters</button>
                        </div>
                    </div>
                ) : null}

                {loading ? (
                    <p className="panel-muted">Loading attendance...</p>
                ) : (
                    <div className="event-table-wrap">
                        <table className="event-table employee-attendance-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                                    <th>ID</th>
                                    <th>Image + Name</th>
                                    <th>Email</th>
                                    <th>Attendance</th>
                                    <th>Date</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Over Time</th>
                                    <th>Notes</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="text-muted">No attendance records found.</td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id}>
                                            <td><input type="checkbox" checked={selectedIds.includes(Number(item.id))} onChange={() => toggleOne(item.id)} /></td>
                                            <td>{item.id}</td>
                                            <td>
                                                <div className="attendance-employee-cell">
                                                    {item.user_avatar_url ? (
                                                        <img src={item.user_avatar_url} alt={item.user_name || 'Employee'} className="attendance-employee-avatar" />
                                                    ) : (
                                                        <div className="attendance-employee-avatar fallback">{initials(item.user_name)}</div>
                                                    )}
                                                    <span>{item.user_name || '-'}</span>
                                                </div>
                                            </td>
                                            <td>{item.user_email || '-'}</td>
                                            <td><span className={`attendance-status-pill ${item.status}`}>{item.status}</span></td>
                                            <td>{item.attendance_date || '-'}</td>
                                            <td>{item.check_in || '-'}</td>
                                            <td>{item.check_out || '-'}</td>
                                            <td>{item.overtime_label ? formatDuration(item.overtime_minutes) : '-'}</td>
                                            <td>{item.status === 'leave' ? (item.notes || '-') : '-'}</td>
                                            <td>
                                                <div className="employee-actions">
                                                    <button className="btn-mini btn-mini-edit" type="button" onClick={() => setViewingItem(item)}>View</button>
                                                    <button className="btn-mini btn-mini-purple" type="button" onClick={() => startEdit(item)}>Edit</button>
                                                    <button className="btn-mini btn-mini-delete" type="button" onClick={() => deleteItem(item)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewingItem ? (
                    <div className="attendance-view-card">
                        <strong>Attendance Details:</strong>
                        <span>ID #{viewingItem.id}</span>
                        <span>Name: {viewingItem.user_name || '-'}</span>
                        <span>Status: {viewingItem.status || '-'}</span>
                        <span>Date: {viewingItem.attendance_date || '-'}</span>
                        <span>Clock In: {viewingItem.check_in || '-'}</span>
                        <span>Clock Out: {viewingItem.check_out || '-'}</span>
                        <span>Over Time: {viewingItem.overtime_label ? formatDuration(viewingItem.overtime_minutes) : '-'}</span>
                        <span>Notes: {viewingItem.notes || '-'}</span>
                    </div>
                ) : null}
            </section>
        </AppShell>
    );
}
