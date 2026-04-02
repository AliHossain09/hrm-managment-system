import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
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

function initials(name) {
    if (!name) return 'U';

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase())
        .join('');
}

function atWorkLabel(dateOfJoining) {
    if (!dateOfJoining) return '-';

    const join = new Date(dateOfJoining);
    if (Number.isNaN(join.getTime())) return '-';

    const now = new Date();
    let years = now.getFullYear() - join.getFullYear();
    let months = now.getMonth() - join.getMonth();
    let days = now.getDate() - join.getDate();

    if (days < 0) {
        months -= 1;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        days += previousMonth;
    }

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);

    return parts.length ? parts.join(' ') : '0d';
}

function normalizeNameCatalog(list, fallbackNames) {
    const items = Array.isArray(list) ? list : [];
    const base = items
        .filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '')
        .map((item, index) => ({
            id: item.id ?? `row-${index}`,
            name: item.name,
        }));

    const existing = new Set(base.map((item) => String(item.name).trim().toLowerCase()));
    const fallback = (fallbackNames || [])
        .map((name) => String(name || '').trim())
        .filter((name) => name !== '' && !existing.has(name.toLowerCase()))
        .map((name, index) => ({
            id: `fallback-${index}-${name}`,
            name,
        }));

    return [...base, ...fallback];
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

function EmployeeDetailsModal({ open, employee, busy, mode, onClose, onSave, departments, designations, headers, showToast }) {
    const readOnly = mode === 'view';
    const [activeViewTab, setActiveViewTab] = useState('personal');
    const [attendanceItems, setAttendanceItems] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceSaving, setAttendanceSaving] = useState(false);
    const [attendanceSelectedIds, setAttendanceSelectedIds] = useState([]);
    const [attendanceEditingId, setAttendanceEditingId] = useState(null);
    const [attendanceViewing, setAttendanceViewing] = useState(null);
    const [attendanceYearFilter, setAttendanceYearFilter] = useState('');
    const [attendanceMonthFilter, setAttendanceMonthFilter] = useState('');
    const [attendanceDayFilter, setAttendanceDayFilter] = useState('');
    const [attendanceForm, setAttendanceForm] = useState({
        attendance_date: '',
        status: 'present',
        check_in: '',
        check_out: '',
        notes: '',
    });
    const [form, setForm] = useState({
        date_of_birth: '',
        date_of_joining: '',
        basic_salary: '',
        branch_name: '',
        department_name: '',
        designation_name: '',
        bank_name: '',
        bank_branch_location: '',
        bank_account_number: '',
        address: '',
        phone: '',
        national_id_card_number: '',
        sex: '',
        blood_group: '',
        father_name: '',
        mother_name: '',
        father_phone: '',
    });

    useEffect(() => {
        if (!open || !employee) {
            return;
        }

        setActiveViewTab('personal');
        setAttendanceSelectedIds([]);
        setAttendanceEditingId(null);
        setAttendanceViewing(null);
        setAttendanceYearFilter('');
        setAttendanceMonthFilter('');
        setAttendanceDayFilter('');
        setAttendanceForm({
            attendance_date: new Date().toISOString().slice(0, 10),
            status: 'present',
            check_in: '',
            check_out: '',
            notes: '',
        });

        setForm({
            date_of_birth: employee.date_of_birth || '',
            date_of_joining: employee.date_of_joining || '',
            basic_salary: employee.basic_salary != null ? String(employee.basic_salary) : '',
            branch_name: employee.branch_name || '',
            department_name: employee.department_name || '',
            designation_name: employee.designation_name || '',
            bank_name: employee.bank_name || '',
            bank_branch_location: employee.bank_branch_location || '',
            bank_account_number: employee.bank_account_number || '',
            address: employee.address || '',
            phone: employee.phone || '',
            national_id_card_number: employee.national_id_card_number || '',
            sex: employee.sex || '',
            blood_group: employee.blood_group || '',
            father_name: employee.father_name || '',
            mother_name: employee.mother_name || '',
            father_phone: employee.father_phone || '',
        });
    }, [open, employee]);

    const loadAttendance = async () => {
        if (!employee?.id) return;
        setAttendanceLoading(true);
        try {
            const { data } = await api.get('/staff/attendance', {
                headers,
                params: { user_id: employee.id },
            });
            setAttendanceItems(data?.data?.records || []);
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setAttendanceLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !employee?.id || !readOnly || activeViewTab !== 'attendance') return;
        loadAttendance();
    }, [open, employee?.id, activeViewTab, readOnly]);

    const departmentOptions = useMemo(() => {
        const list = departments || [];
        const exists = list.some((item) => String(item?.name || '') === String(form.department_name || ''));

        if (!exists && form.department_name) {
            return [{ id: 'current-dept', name: form.department_name }, ...list];
        }

        return list;
    }, [departments, form.department_name]);

    const designationOptions = useMemo(() => {
        const list = designations || [];
        const exists = list.some((item) => String(item?.name || '') === String(form.designation_name || ''));

        if (!exists && form.designation_name) {
            return [{ id: 'current-desig', name: form.designation_name }, ...list];
        }

        return list;
    }, [designations, form.designation_name]);

    if (!open || !employee) return null;

    const overviewItems = [
        { label: 'Department', value: form.department_name || '-' },
        { label: 'Designation', value: form.designation_name || '-' },
        { label: 'Branch', value: form.branch_name || '-' },
        { label: 'Basic Salary', value: form.basic_salary ? `${form.basic_salary}` : '-' },
        { label: 'At Work', value: atWorkLabel(form.date_of_joining) },
        { label: 'User Type', value: employee.user_type || '-' },
    ];
    const salary = Number(form.basic_salary || 0);
    const additions = salary > 0 ? Math.round(salary * 0.25) : 0;
    const deductions = salary > 0 ? Math.round(salary * 0.12) : 0;
    const netPayable = salary > 0 ? salary + additions - deductions : 0;
    const userTypeLabel = (employee.user_type || 'permanent').replace('_', ' ');

    if (readOnly) {
        const renderViewTabContent = () => {
            if (activeViewTab === 'personal') {
                return (
                    <section className="employee-view-grid">
                        <article className="employee-view-panel">
                            <h4>Employee Details</h4>
                            <ul>
                                <li><strong>Date of Birth:</strong> {form.date_of_birth || '-'}</li>
                                <li><strong>Sex:</strong> {form.sex || '-'}</li>
                                <li><strong>Blood Group:</strong> {form.blood_group || '-'}</li>
                                <li><strong>National ID:</strong> {form.national_id_card_number || '-'}</li>
                            </ul>
                        </article>

                        <article className="employee-view-panel">
                            <h4>Family</h4>
                            <ul>
                                <li><strong>Father Name:</strong> {form.father_name || '-'}</li>
                                <li><strong>Mother Name:</strong> {form.mother_name || '-'}</li>
                                <li><strong>Father Phone:</strong> {form.father_phone || '-'}</li>
                            </ul>
                        </article>

                        <article className="employee-view-panel">
                            <h4>Address</h4>
                            <p className="employee-view-address">{form.address || '-'}</p>
                        </article>
                    </section>
                );
            }

            if (activeViewTab === 'payroll') {
                return (
                    <>
                        <section className="employee-view-grid">
                            <article className="employee-view-panel">
                                <h4>Payroll &amp; Finance</h4>
                                <ul>
                                    <li><strong>Bank Name:</strong> {form.bank_name || '-'}</li>
                                    <li><strong>Branch Location:</strong> {form.bank_branch_location || '-'}</li>
                                    <li><strong>Account Number:</strong> {form.bank_account_number || '-'}</li>
                                    <li><strong>Basic Salary:</strong> {form.basic_salary || '-'}</li>
                                </ul>
                            </article>
                        </section>

                        <section className="employee-portal-block">
                            <div className="employee-portal-head">
                                <h4>Employee self service portal</h4>
                                <div className="employee-portal-controls">
                                    <div className="employee-period-switch">
                                        <button type="button" className="active">Monthly</button>
                                        <button type="button">Quarterly</button>
                                        <button type="button">Annually</button>
                                    </div>
                                    <span className="employee-date-chip">1 Jan 2023 - 30 Dec 2023</span>
                                </div>
                            </div>

                            <div className="employee-portal-grid">
                                <article className="employee-portal-card">
                                    <h5>Salary</h5>
                                    <div className="employee-salary-ring" />
                                    <p>Net Payable: {netPayable || 0}</p>
                                </article>
                                <article className="employee-portal-card">
                                    <h5>Additions</h5>
                                    <p>Overtime + Bonuses</p>
                                    <strong>{additions || 0}</strong>
                                </article>
                                <article className="employee-portal-card">
                                    <h5>Deductions</h5>
                                    <p>Tax + PF</p>
                                    <strong>{deductions || 0}</strong>
                                </article>
                                <article className="employee-portal-card">
                                    <h5>View Payslip</h5>
                                    <p>Month of November</p>
                                    <strong>{netPayable || 0}</strong>
                                </article>
                            </div>
                        </section>

                        <section className="employee-salary-setup">
                            <div className="employee-salary-setup-head">
                                <h4>Salary Profile Setup</h4>
                                <span className="employee-type-pill">{userTypeLabel}</span>
                                <button type="button" className="btn-ghost">Edit</button>
                            </div>
                            <div className="event-table-wrap">
                                <table className="event-table employee-salary-table">
                                    <thead>
                                        <tr>
                                            <th>Country</th>
                                            <th>Earnings</th>
                                            <th>Additions</th>
                                            <th>Deductions</th>
                                            <th>Benefit</th>
                                            <th>Payable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Bangladesh</td>
                                            <td>Gross salary {salary || 0}</td>
                                            <td>Overtime {Math.round(additions * 0.6)}</td>
                                            <td>Tax @ 10% {Math.round(deductions * 0.6)}</td>
                                            <td>Company 8%</td>
                                            <td>{netPayable || 0}</td>
                                        </tr>
                                        <tr>
                                            <td>-</td>
                                            <td>Basic salary {salary || 0}</td>
                                            <td>Bonuses {Math.round(additions * 0.4)}</td>
                                            <td>PF @ 8% {Math.round(deductions * 0.4)}</td>
                                            <td>Employee 10%</td>
                                            <td>{netPayable || 0}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                );
            }

            if (activeViewTab === 'organization') {
                return (
                    <section className="employee-view-grid">
                        <article className="employee-view-panel">
                            <h4>Organization</h4>
                            <ul>
                                <li><strong>Department:</strong> {form.department_name || '-'}</li>
                                <li><strong>Designation:</strong> {form.designation_name || '-'}</li>
                                <li><strong>Branch:</strong> {form.branch_name || '-'}</li>
                                <li><strong>Date of Joining:</strong> {form.date_of_joining || '-'}</li>
                            </ul>
                        </article>
                    </section>
                );
            }

            if (activeViewTab === 'attendance') {
                const attendanceYearOptions = Array.from(
                    new Set(
                        attendanceItems
                            .map((item) => String(item.attendance_date || '').split('-')[0])
                            .filter((year) => year),
                    ),
                ).sort((a, b) => Number(b) - Number(a));

                const filteredAttendanceItems = attendanceItems.filter((item) => {
                    const date = String(item.attendance_date || '');
                    const parts = date.split('-');
                    const year = parts.length === 3 ? parts[0] : '';
                    const month = parts.length === 3 ? parts[1] : '';
                    const day = parts.length === 3 ? String(Number(parts[2])) : '';

                    if (attendanceYearFilter && year !== attendanceYearFilter) {
                        return false;
                    }

                    if (attendanceMonthFilter && month !== attendanceMonthFilter) {
                        return false;
                    }

                    if (attendanceDayFilter && day !== attendanceDayFilter) {
                        return false;
                    }

                    return true;
                });

                const visibleIds = filteredAttendanceItems.map((item) => Number(item.id));
                const allSelected = visibleIds.length > 0 && visibleIds.every((id) => attendanceSelectedIds.includes(id));

                const toggleAll = () => {
                    if (allSelected) {
                        setAttendanceSelectedIds([]);
                        return;
                    }
                    setAttendanceSelectedIds(visibleIds);
                };

                const toggleOne = (id) => {
                    const numId = Number(id);
                    setAttendanceSelectedIds((prev) => (
                        prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]
                    ));
                };

                const startEdit = (item) => {
                    setAttendanceEditingId(item.id);
                    setAttendanceForm({
                        attendance_date: item.attendance_date || '',
                        status: item.status || 'present',
                        check_in: item.check_in || '',
                        check_out: item.check_out || '',
                        notes: item.notes || '',
                    });
                };

                const resetAttendanceForm = () => {
                    setAttendanceEditingId(null);
                    setAttendanceViewing(null);
                    setAttendanceForm({
                        attendance_date: new Date().toISOString().slice(0, 10),
                        status: 'present',
                        check_in: '',
                        check_out: '',
                        notes: '',
                    });
                };

                const submitAttendance = async (event) => {
                    event.preventDefault();
                    setAttendanceSaving(true);
                    try {
                        const payload = {
                            user_id: employee.id,
                            attendance_date: attendanceForm.attendance_date,
                            status: attendanceForm.status,
                            check_in: attendanceForm.status === 'present' ? (attendanceForm.check_in || null) : null,
                            check_out: attendanceForm.status === 'present' ? (attendanceForm.check_out || null) : null,
                            notes: attendanceForm.status === 'leave' ? (attendanceForm.notes || null) : null,
                        };

                        if (attendanceEditingId) {
                            await api.put(`/staff/attendance/${attendanceEditingId}`, payload, { headers });
                            showToast('success', 'Attendance updated successfully.');
                        } else {
                            await api.post('/staff/attendance', payload, { headers });
                            showToast('success', 'Attendance created successfully.');
                        }

                        await loadAttendance();
                        resetAttendanceForm();
                    } catch (error) {
                        showToast('error', extractMessage(error));
                    } finally {
                        setAttendanceSaving(false);
                    }
                };

                const deleteAttendance = async (item) => {
                    const ok = await confirmDelete(`Delete attendance for ${item.attendance_date}?`);
                    if (!ok) return;

                    try {
                        await api.delete(`/staff/attendance/${item.id}`, { headers });
                        await loadAttendance();
                        showToast('success', 'Attendance deleted successfully.');
                        if (attendanceEditingId === item.id) {
                            resetAttendanceForm();
                        }
                    } catch (error) {
                        showToast('error', extractMessage(error));
                    }
                };

                const exportSelectedAttendance = () => {
                    const selected = attendanceItems.filter((item) => attendanceSelectedIds.includes(Number(item.id)));
                    if (selected.length === 0) {
                        showToast('error', 'Select at least one attendance row to export.');
                        return;
                    }

                    const header = ['ID', 'Name', 'Email', 'Attendance', 'Date', 'Clock In', 'Clock Out', 'Over Time', 'Notes'];
                    const rows = selected.map((item) => ([
                        item.id,
                        employee.name || '',
                        employee.email || '',
                        item.status || '',
                        item.attendance_date || '',
                        item.check_in || '-',
                        item.check_out || '-',
                        item.overtime_label || '-',
                        item.status === 'leave' ? (item.notes || '-') : '-',
                    ].map(escapeCsv).join(',')));

                    const csv = [header.join(','), ...rows].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `attendance_${employee.id}_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                };

                return (
                    <section className="employee-view-grid">
                        <article className="employee-view-panel attendance-panel-full">
                            <div className="attendance-head">
                                <h4>Attendance &amp; Leave Index</h4>
                                <div className="attendance-head-actions">
                                    <label className="attendance-filter-label">
                                        Year
                                        <select className="form-input compact" value={attendanceYearFilter} onChange={(e) => setAttendanceYearFilter(e.target.value)}>
                                            <option value="">All</option>
                                            {attendanceYearOptions.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="attendance-filter-label">
                                        Month
                                        <select className="form-input compact" value={attendanceMonthFilter} onChange={(e) => setAttendanceMonthFilter(e.target.value)}>
                                            <option value="">All</option>
                                            <option value="01">Jan</option>
                                            <option value="02">Feb</option>
                                            <option value="03">Mar</option>
                                            <option value="04">Apr</option>
                                            <option value="05">May</option>
                                            <option value="06">Jun</option>
                                            <option value="07">Jul</option>
                                            <option value="08">Aug</option>
                                            <option value="09">Sep</option>
                                            <option value="10">Oct</option>
                                            <option value="11">Nov</option>
                                            <option value="12">Dec</option>
                                        </select>
                                    </label>
                                    <label className="attendance-filter-label">
                                        Day
                                        <select className="form-input compact" value={attendanceDayFilter} onChange={(e) => setAttendanceDayFilter(e.target.value)}>
                                            <option value="">All</option>
                                            {Array.from({ length: 31 }, (_, index) => {
                                                const value = String(index + 1);
                                                return (
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </label>
                                    <button type="button" className="btn-mini btn-mini-delete" onClick={exportSelectedAttendance}>Export Selected</button>
                                </div>
                            </div>

                            <form className="attendance-form-grid" onSubmit={submitAttendance}>
                                <label>
                                    Date
                                    <input
                                        className="form-input compact"
                                        type="date"
                                        value={attendanceForm.attendance_date}
                                        onChange={(e) => setAttendanceForm((prev) => ({ ...prev, attendance_date: e.target.value }))}
                                        required
                                    />
                                </label>
                                <label>
                                    Attendance
                                    <select
                                        className="form-input compact"
                                        value={attendanceForm.status}
                                        onChange={(e) => setAttendanceForm((prev) => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="present">Present</option>
                                        <option value="leave">Leave</option>
                                        <option value="absent">Absent</option>
                                    </select>
                                </label>
                                <label>
                                    Clock In
                                    <input
                                        className="form-input compact"
                                        type="time"
                                        value={attendanceForm.check_in}
                                        onChange={(e) => setAttendanceForm((prev) => ({ ...prev, check_in: e.target.value }))}
                                        disabled={attendanceForm.status !== 'present'}
                                    />
                                </label>
                                <label>
                                    Clock Out
                                    <input
                                        className="form-input compact"
                                        type="time"
                                        value={attendanceForm.check_out}
                                        onChange={(e) => setAttendanceForm((prev) => ({ ...prev, check_out: e.target.value }))}
                                        disabled={attendanceForm.status !== 'present'}
                                    />
                                </label>
                                <label className="attendance-notes-field">
                                    Notes (for leave)
                                    <input
                                        className="form-input compact"
                                        value={attendanceForm.notes}
                                        onChange={(e) => setAttendanceForm((prev) => ({ ...prev, notes: e.target.value }))}
                                        disabled={attendanceForm.status !== 'leave'}
                                        placeholder="Leave note..."
                                    />
                                </label>
                                <div className="attendance-form-actions">
                                    <button type="submit" className="btn-mini btn-mini-edit" disabled={attendanceSaving}>
                                        {attendanceSaving ? 'Saving...' : attendanceEditingId ? 'Update' : 'Add'}
                                    </button>
                                    <button type="button" className="btn-mini btn-mini-muted" onClick={resetAttendanceForm}>Reset</button>
                                </div>
                            </form>

                            {attendanceLoading ? (
                                <p className="panel-muted">Loading attendance records...</p>
                            ) : (
                                <div className="event-table-wrap">
                                    <table className="event-table employee-attendance-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                                                </th>
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
                                            {filteredAttendanceItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="11" className="text-muted">No attendance record found.</td>
                                                </tr>
                                            ) : (
                                                filteredAttendanceItems.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <input type="checkbox" checked={attendanceSelectedIds.includes(Number(item.id))} onChange={() => toggleOne(item.id)} />
                                                        </td>
                                                        <td>{item.id}</td>
                                                        <td>
                                                            <div className="attendance-employee-cell">
                                                                {employee.avatar_url ? (
                                                                    <img src={employee.avatar_url} alt={employee.name} className="attendance-employee-avatar" />
                                                                ) : (
                                                                    <div className="attendance-employee-avatar fallback">{initials(employee.name)}</div>
                                                                )}
                                                                <span>{employee.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>{employee.email || '-'}</td>
                                                        <td>
                                                            <span className={`attendance-status-pill ${item.status}`}>{item.status}</span>
                                                        </td>
                                                        <td>{item.attendance_date || '-'}</td>
                                                        <td>{item.check_in || '-'}</td>
                                                        <td>{item.check_out || '-'}</td>
                                                        <td>{item.overtime_label ? formatDuration(item.overtime_minutes) : '-'}</td>
                                                        <td>{item.status === 'leave' ? (item.notes || '-') : '-'}</td>
                                                        <td>
                                                            <div className="employee-actions">
                                                                <button type="button" className="btn-mini btn-mini-edit" onClick={() => setAttendanceViewing(item)}>View</button>
                                                                <button type="button" className="btn-mini btn-mini-purple" onClick={() => startEdit(item)}>Edit</button>
                                                                <button type="button" className="btn-mini btn-mini-delete" onClick={() => deleteAttendance(item)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {attendanceViewing ? (
                                <div className="attendance-view-card">
                                    <strong>Attendance Details:</strong>
                                    <span>ID #{attendanceViewing.id}</span>
                                    <span>Status: {attendanceViewing.status}</span>
                                    <span>Date: {attendanceViewing.attendance_date}</span>
                                    <span>Clock In: {attendanceViewing.check_in || '-'}</span>
                                    <span>Clock Out: {attendanceViewing.check_out || '-'}</span>
                                    <span>Over Time: {attendanceViewing.overtime_label ? formatDuration(attendanceViewing.overtime_minutes) : '-'}</span>
                                    <span>Notes: {attendanceViewing.notes || '-'}</span>
                                </div>
                            ) : null}
                        </article>
                    </section>
                );
            }

            return (
                <section className="employee-view-grid">
                    <article className="employee-view-panel">
                        <h4>Performance</h4>
                        <ul>
                            <li><strong>Performance Rating:</strong> Not configured yet</li>
                            <li><strong>Review Cycle:</strong> Not configured yet</li>
                        </ul>
                    </article>
                </section>
            );
        };

        return (
            <div className="modal-overlay">
                <div className="modal-card employee-modal-card employee-view-card">
                    <div className="modal-header">
                        <h2>Employee Profile View</h2>
                        <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                    </div>

                    <section className="employee-view-hero">
                        {employee.avatar_url ? (
                            <img src={employee.avatar_url} alt={employee.name} className="employee-view-avatar" />
                        ) : (
                            <div className="employee-view-avatar employee-view-avatar-fallback">{initials(employee.name)}</div>
                        )}

                        <div className="employee-view-hero-info">
                            <h3>{employee.name}</h3>
                            <p>{form.designation_name || 'Employee'}</p>
                            <div className="employee-view-badges">
                                <span className="employee-view-badge">{employee.role || 'N/A'}</span>
                                <span className="employee-view-badge soft">{employee.user_type || 'N/A'}</span>
                                <span className={`employee-status-pill ${employee.is_active ? 'active' : 'inactive'}`}>
                                    {employee.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="employee-view-meta">
                                <span>{employee.email || '-'}</span>
                                <span>{form.phone || '-'}</span>
                                <span>Joined: {form.date_of_joining || '-'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="employee-view-overview">
                        {overviewItems.map((item) => (
                            <article key={item.label} className="employee-view-tile">
                                <p>{item.label}</p>
                                <h4>{item.value}</h4>
                            </article>
                        ))}
                    </section>

                    <section className="employee-view-tabs">
                        <button type="button" className={`employee-view-tab ${activeViewTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveViewTab('personal')}>Personal</button>
                        <button type="button" className={`employee-view-tab ${activeViewTab === 'organization' ? 'active' : ''}`} onClick={() => setActiveViewTab('organization')}>Organization</button>
                        <button type="button" className={`employee-view-tab ${activeViewTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveViewTab('attendance')}>Attendance &amp; Leave</button>
                        <button type="button" className={`employee-view-tab ${activeViewTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveViewTab('payroll')}>Payroll &amp; Finance</button>
                        <button type="button" className={`employee-view-tab ${activeViewTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveViewTab('performance')}>Performance</button>
                    </section>

                    {renderViewTabContent()}
                </div>
            </div>
        );
    }

    const submit = (event) => {
        event.preventDefault();

        if (readOnly) {
            onClose();
            return;
        }

        onSave(employee.id, {
            ...form,
            basic_salary: form.basic_salary === '' ? null : form.basic_salary,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card employee-modal-card">
                <div className="modal-header">
                    <h2>{mode === 'view' ? `Employee View: ${employee.name}` : `Employee Edit: ${employee.name}`}</h2>
                    <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form className="modal-grid" onSubmit={submit}>
                    <label>
                        Date of Birth
                        <input disabled={readOnly} className="form-input" type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
                    </label>

                    <label>
                        Date of Joining
                        <input disabled={readOnly} className="form-input" type="date" value={form.date_of_joining} onChange={(e) => setForm((p) => ({ ...p, date_of_joining: e.target.value }))} />
                    </label>

                    <label>
                        Basic Salary
                        <input disabled={readOnly} className="form-input" type="number" min="0" step="0.01" value={form.basic_salary} onChange={(e) => setForm((p) => ({ ...p, basic_salary: e.target.value }))} />
                    </label>

                    <label>
                        Branch
                        <input disabled={readOnly} className="form-input" value={form.branch_name} onChange={(e) => setForm((p) => ({ ...p, branch_name: e.target.value }))} />
                    </label>

                    <label>
                        Department
                        <select disabled={readOnly} className="form-input" value={form.department_name} onChange={(e) => setForm((p) => ({ ...p, department_name: e.target.value }))}>
                            <option value="">Select Department</option>
                            {departmentOptions.map((item) => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Designation
                        <select disabled={readOnly} className="form-input" value={form.designation_name} onChange={(e) => setForm((p) => ({ ...p, designation_name: e.target.value }))}>
                            <option value="">Select Designation</option>
                            {designationOptions.map((item) => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Bank Name
                        <input disabled={readOnly} className="form-input" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} />
                    </label>

                    <label>
                        Bank Branch Location
                        <input disabled={readOnly} className="form-input" value={form.bank_branch_location} onChange={(e) => setForm((p) => ({ ...p, bank_branch_location: e.target.value }))} />
                    </label>

                    <label>
                        Bank Account Number
                        <input disabled={readOnly} className="form-input" value={form.bank_account_number} onChange={(e) => setForm((p) => ({ ...p, bank_account_number: e.target.value }))} />
                    </label>

                    <label>
                        Phone Number
                        <input disabled={readOnly} className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                    </label>

                    <label>
                        National ID Card Number
                        <input disabled={readOnly} className="form-input" value={form.national_id_card_number} onChange={(e) => setForm((p) => ({ ...p, national_id_card_number: e.target.value }))} />
                    </label>

                    <label>
                        Sex
                        <select disabled={readOnly} className="form-input" value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </label>

                    <label>
                        Blood Group
                        <input disabled={readOnly} className="form-input" value={form.blood_group} onChange={(e) => setForm((p) => ({ ...p, blood_group: e.target.value }))} placeholder="e.g. A+, O-" />
                    </label>

                    <label>
                        Father Name
                        <input disabled={readOnly} className="form-input" value={form.father_name} onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))} />
                    </label>

                    <label>
                        Mother Name
                        <input disabled={readOnly} className="form-input" value={form.mother_name} onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))} />
                    </label>

                    <label>
                        Father Phone
                        <input disabled={readOnly} className="form-input" value={form.father_phone} onChange={(e) => setForm((p) => ({ ...p, father_phone: e.target.value }))} />
                    </label>

                    <label style={{ gridColumn: 'span 2' }}>
                        Address
                        <textarea disabled={readOnly} className="form-input" rows={3} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                    </label>

                    <div className="modal-actions">
                        <button className="btn-primary small" type="submit" disabled={busy}>
                            {busy ? 'Saving...' : 'Update'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminEmployeesPage({ user, onLogout, headers, showToast }) {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [modalMode, setModalMode] = useState('edit');
    const [saving, setSaving] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const loadEmployees = async () => {
        const [employeesRes, departmentsRes, designationsRes] = await Promise.allSettled([
            api.get('/staff/employees', { headers }),
            api.get('/hrm/departments', { headers }),
            api.get('/hrm/designations', { headers }),
        ]);

        if (employeesRes.status !== 'fulfilled') {
            throw employeesRes.reason;
        }

        const employeeRows = employeesRes.value?.data?.data?.employees || [];
        setEmployees(employeeRows);

        const fallbackDepartmentNames = employeeRows.map((item) => item.department_name).filter(Boolean);
        const fallbackDesignationNames = employeeRows.map((item) => item.designation_name).filter(Boolean);

        if (departmentsRes.status === 'fulfilled') {
            const fromApi = departmentsRes.value?.data?.data?.departments || [];
            setDepartments(normalizeNameCatalog(fromApi, fallbackDepartmentNames));
        } else {
            setDepartments(normalizeNameCatalog([], fallbackDepartmentNames));
        }

        if (designationsRes.status === 'fulfilled') {
            const fromApi = designationsRes.value?.data?.data?.designations || [];
            setDesignations(normalizeNameCatalog(fromApi, fallbackDesignationNames));
        } else {
            setDesignations(normalizeNameCatalog([], fallbackDesignationNames));
        }
    };

    useEffect(() => {
        const run = async () => {
            try {
                await loadEmployees();
            } catch (error) {
                showToast('error', extractMessage(error));
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const filteredEmployees = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return employees;
        }

        return employees.filter((item) => {
            const haystack = [
                item.id,
                item.name,
                item.email,
                item.department_name,
                item.designation_name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(keyword);
        });
    }, [employees, search]);

    const totalPages = useMemo(() => {
        if (filteredEmployees.length === 0) {
            return 1;
        }

        return Math.max(1, Math.ceil(filteredEmployees.length / rowsPerPage));
    }, [filteredEmployees.length, rowsPerPage]);

    const safeCurrentPage = useMemo(() => {
        return Math.min(Math.max(currentPage, 1), totalPages);
    }, [currentPage, totalPages]);

    const visibleEmployees = useMemo(() => {
        const start = (safeCurrentPage - 1) * rowsPerPage;
        return filteredEmployees.slice(start, start + rowsPerPage);
    }, [filteredEmployees, rowsPerPage, safeCurrentPage]);

    useEffect(() => {
        if (currentPage !== safeCurrentPage) {
            setCurrentPage(safeCurrentPage);
        }
    }, [currentPage, safeCurrentPage]);

    useEffect(() => {
        const existingIds = new Set(employees.map((item) => Number(item.id)));
        setSelectedIds((prev) => prev.filter((id) => existingIds.has(Number(id))));
    }, [employees]);

    const visibleIds = useMemo(() => visibleEmployees.map((item) => Number(item.id)), [visibleEmployees]);
    const allVisibleSelected = useMemo(() => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id)), [visibleIds, selectedIds]);

    const toggleSelectAllVisible = () => {
        if (visibleIds.length === 0) {
            return;
        }

        if (allVisibleSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(Number(id))));
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev.map((id) => Number(id)));
            visibleIds.forEach((id) => next.add(Number(id)));
            return Array.from(next);
        });
    };

    const toggleSelectOne = (id) => {
        const numId = Number(id);
        setSelectedIds((prev) => (prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]));
    };

    const exportCsv = () => {
        const selectedEmployees = employees.filter((item) => selectedIds.includes(Number(item.id)));

        if (selectedEmployees.length === 0) {
            showToast('error', 'Please select at least one employee to export.');
            return;
        }

        const headersRow = [
            'Employee ID',
            'Name',
            'Email',
            'Department',
            'Designation',
            'User Type',
            'Part Time Hours',
            'Date of Joining',
            'Status',
        ];

        const lines = selectedEmployees.map((item) => ([
            item.id,
            item.name,
            item.email,
            item.department_name || '',
            item.designation_name || '',
            item.user_type || '',
            item.part_time_hours ?? '',
            item.date_of_joining || '',
            item.is_active ? 'Active' : 'Inactive',
        ].map(escapeCsv).join(',')));

        const csv = [headersRow.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.setAttribute('download', `employees_selected_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast('success', `${selectedEmployees.length} employee exported.`);
    };

    const openView = (employee) => {
        setModalMode('view');
        setSelectedEmployee(employee);
    };

    const openEdit = (employee) => {
        setModalMode('edit');
        setSelectedEmployee(employee);
    };

    const saveEmployee = async (employeeId, payload) => {
        setSaving(true);
        try {
            await api.put(`/staff/employees/${employeeId}`, payload, { headers });
            await loadEmployees();
            showToast('success', 'Employee details updated successfully.');
            setSelectedEmployee(null);
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteEmployee = async (employee) => {
        const ok = await confirmDelete(`Delete employee ${employee.name}?`);
        if (!ok) return;

        try {
            await api.delete(`/staff/users/${employee.id}`, { headers });
            await loadEmployees();
            showToast('success', 'Employee deleted successfully.');
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Employees</h1>

            <section className="panel employee-table-panel">
                <div className="employee-toolbar">
                    <div className="employee-toolbar-left">
                        <button className="btn-mini btn-mini-delete" type="button" onClick={exportCsv}>Export Selected</button>
                        <span className="employee-selected-count">Selected: {selectedIds.length}</span>
                    </div>
                    <div className="employee-toolbar-right">
                        <label className="employee-label-inline">
                            Rows
                            <select
                                className="form-input compact"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </label>

                        <input
                            className="form-input compact"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Type to search..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="panel">Loading employees...</div>
                ) : (
                    <>
                        <div className="event-table-wrap">
                            <table className="event-table employee-list-table">
                                <thead>
                                    <tr>
                                        <th className="employee-check-col">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={toggleSelectAllVisible}
                                                aria-label="Select all visible employees"
                                            />
                                        </th>
                                        <th>Employee ID</th>
                                        <th>Image</th>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Designation</th>
                                        <th>At Work</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-muted">No employee found.</td>
                                        </tr>
                                    ) : (
                                        visibleEmployees.map((item) => (
                                            <tr key={item.id}>
                                                <td className="employee-check-col">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(Number(item.id))}
                                                        onChange={() => toggleSelectOne(item.id)}
                                                        aria-label={`Select ${item.name}`}
                                                    />
                                                </td>
                                                <td>{item.id}</td>
                                                <td>
                                                    {item.avatar_url ? (
                                                        <img src={item.avatar_url} alt={item.name} className="employee-photo" />
                                                    ) : (
                                                        <div className="employee-photo-fallback">{initials(item.name)}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="employee-name">{item.name}</div>
                                                    <div className="employee-email">{item.email}</div>
                                                </td>
                                                <td>{item.department_name || '-'}</td>
                                                <td>{item.designation_name || '-'}</td>
                                                <td>{atWorkLabel(item.date_of_joining)}</td>
                                                <td>
                                                    <span className={`employee-status-pill ${item.is_active ? 'active' : 'inactive'}`}>
                                                        {item.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="employee-actions">
                                                        <button className="btn-mini btn-mini-edit" type="button" onClick={() => openView(item)}>View</button>
                                                        <button className="btn-mini btn-mini-purple" type="button" onClick={() => openEdit(item)}>Edit</button>
                                                        <button className="btn-mini btn-mini-delete" type="button" onClick={() => deleteEmployee(item)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="employee-pagination">
                            <span className="employee-pagination-text">
                                Showing {filteredEmployees.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1}
                                {' '}-{' '}
                                {Math.min(safeCurrentPage * rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length}
                            </span>
                            <div className="employee-pagination-actions">
                                <button
                                    className="btn-mini btn-mini-muted"
                                    type="button"
                                    disabled={safeCurrentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                >
                                    Prev
                                </button>
                                <span className="employee-page-indicator">Page {safeCurrentPage} / {totalPages}</span>
                                <button
                                    className="btn-mini btn-mini-muted"
                                    type="button"
                                    disabled={safeCurrentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <EmployeeDetailsModal
                open={Boolean(selectedEmployee)}
                employee={selectedEmployee}
                busy={saving}
                mode={modalMode}
                departments={departments}
                designations={designations}
                headers={headers}
                showToast={showToast}
                onClose={() => setSelectedEmployee(null)}
                onSave={saveEmployee}
            />
        </AppShell>
    );
}


