import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import AdminDashboard from './components/pages/AdminDashboard.jsx';
import EmployeeDashboard from './components/pages/EmployeeDashboard.jsx';
import EventsPage from './components/pages/EventsPage.jsx';
import LoginPage from './components/pages/LoginPage.jsx';

const TOKEN_KEY = 'miutx_api_token';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        Accept: 'application/json',
    },
});

function normalizeRoleGroup(value) {
    return value === 'employee' ? 'employee' : 'admin';
}

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
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

function formatDateTime(value) {
    if (!value) return 'Never logged in';
    return value;
}


function Toast({ toast, onClose }) {
    if (!toast) return null;

    return (
        <div className="toast-wrap">
            <div className={`app-toast app-toast-${toast.type}`}>
                <div className="app-toast-text">{toast.message}</div>
                <button type="button" className="app-toast-close" onClick={onClose}>
                    x
                </button>
            </div>
        </div>
    );
}

function UserModal({ open, onClose, onSubmit, roles, busy, mode, initialUser }) {
    const [form, setForm] = useState({
        id: null,
        name: '',
        email: '',
        role_name: 'employee',
        password: '',
    });

    useEffect(() => {
        if (!open) return;

        const fallbackRole = roles[0]?.name || 'employee';

        if (mode === 'edit' && initialUser) {
            setForm({
                id: initialUser.id,
                name: initialUser.name || '',
                email: initialUser.email || '',
                role_name: initialUser.role || fallbackRole,
                password: '',
            });
            return;
        }

        setForm({
            id: null,
            name: '',
            email: '',
            role_name: fallbackRole,
            password: '',
        });
    }, [open, mode, initialUser, roles]);

    if (!open) return null;

    const submit = async (e) => {
        e.preventDefault();

        const payload = new FormData();
        payload.append('name', form.name);
        payload.append('email', form.email);
        payload.append('role_name', form.role_name);

        if (form.password) {
            payload.append('password', form.password);
        }

        await onSubmit({ ...form, payload });
    };

    const title = mode === 'edit' ? 'Edit User' : 'Create New User';
    const submitLabel = mode === 'edit' ? 'Update' : 'Create';

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form className="modal-grid" onSubmit={submit}>
                    <label>
                        Name
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Enter User Name"
                            required
                        />
                    </label>

                    <label>
                        Email
                        <input
                            className="form-input"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                            placeholder="Enter User Email"
                            required
                        />
                    </label>

                    <label>
                        User Role
                        <select
                            className="form-input"
                            value={form.role_name}
                            onChange={(e) => setForm((p) => ({ ...p, role_name: e.target.value }))}
                            required
                        >
                            {roles.map((role) => (
                                <option key={role.id} value={role.name}>{role.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Password {mode === 'edit' ? '(optional)' : ''}
                        <input
                            className="form-input"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                            placeholder="Enter User Password"
                            required={mode !== 'edit'}
                        />
                    </label>

                    <div className="modal-actions">
                        <button className="btn-primary small" type="submit" disabled={busy}>
                            {busy ? (mode === 'edit' ? 'Updating...' : 'Creating...') : submitLabel}
                        </button>
                        <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function StaffUsersPage({ user, onLogout, headers, showToast }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadUsers = async () => {
        const [{ data: usersData }, { data: rolesData }] = await Promise.all([
            api.get('/staff/users', { headers }),
            api.get('/staff/roles', { headers }),
        ]);

        setUsers(usersData?.data?.users || []);
        setRoles(rolesData?.data?.roles || []);
    };

    useEffect(() => {
        const run = async () => {
            try {
                await loadUsers();
            } catch (error) {
                showToast('error', extractMessage(error));
            } finally {
                setLoading(false);
            }
        };
        run();
    }, []);

    const openCreate = () => {
        setModalMode('create');
        setSelectedUser(null);
        setModalOpen(true);
    };

    const openEdit = (targetUser) => {
        setModalMode('edit');
        setSelectedUser(targetUser);
        setModalOpen(true);
    };

    const submitUser = async ({ id, payload }) => {
        setSaving(true);
        try {
            if (modalMode === 'edit' && id) {
                payload.append('_method', 'PUT');
                await api.post(`/staff/users/${id}`, payload, {
                    headers: {
                        ...headers,
                        'Content-Type': 'multipart/form-data',
                    },
                });
                showToast('success', 'User updated successfully.');
            } else {
                await api.post('/staff/users', payload, {
                    headers: {
                        ...headers,
                        'Content-Type': 'multipart/form-data',
                    },
                });
                showToast('success', 'User created successfully.');
            }

            await loadUsers();
            setModalOpen(false);
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (targetUser) => {
        if (Number(targetUser.id) === Number(user?.id)) {
            showToast('error', 'You cannot delete your own account.');
            return;
        }

        const ok = window.confirm(`Delete user ${targetUser.name}?`);
        if (!ok) return;

        try {
            await api.delete(`/staff/users/${targetUser.id}`, { headers });
            await loadUsers();
            showToast('success', 'User deleted successfully.');
        } catch (error) {
            showToast('error', extractMessage(error));
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <div className="staff-header">
                <h1 className="dashboard-title">Manage Users</h1>
                <button className="btn-primary" type="button" onClick={openCreate}>
                    + Create
                </button>
            </div>

            {loading ? (
                <div className="panel">Loading users...</div>
            ) : (
                <section className="user-grid">
                    {users.map((item) => (
                        <article key={item.id} className="user-card">
                            <div className="avatar-circle">{initials(item.name)}</div>
                            <h3>{item.name}</h3>
                            <span className="role-pill">{item.role || 'N/A'}</span>
                            <p>{item.email}</p>
                            <p>{formatDateTime(item.last_login_at)}</p>
                            <div className="user-card-actions">
                                <button className="btn-ghost small" type="button" onClick={() => openEdit(item)}>
                                    Edit
                                </button>
                                <button className="btn-danger small" type="button" onClick={() => deleteUser(item)}>
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            <UserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={submitUser}
                roles={roles}
                busy={saving}
                mode={modalMode}
                initialUser={selectedUser}
            />
        </AppShell>
    );
}

function RoleCard({ role, permissions, onSave, busy }) {
    const [selected, setSelected] = useState(role.permissions || []);
    const canEdit = Boolean(role?.can_edit);

    useEffect(() => {
        setSelected(role.permissions || []);
    }, [role.id, role.permissions]);

    const toggle = (name) => {
        if (!canEdit) return;

        setSelected((prev) =>
            prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
        );
    };

    return (
        <article className="panel role-card">
            <h3>{role.name}</h3>
            <div className="permission-list">
                {permissions.map((perm) => (
                    <label key={perm.id} className="permission-item">
                        <input
                            type="checkbox"
                            checked={selected.includes(perm.name)}
                            onChange={() => toggle(perm.name)}
                            disabled={!canEdit}
                        />
                        <span>{perm.name}</span>
                    </label>
                ))}
            </div>
            {canEdit ? (
                <button className="btn-primary small" type="button" onClick={() => onSave(role.id, selected)} disabled={busy}>
                    {busy ? 'Saving...' : 'Save Permissions'}
                </button>
            ) : (
                <p className="panel-muted">Read only.</p>
            )}
        </article>
    );
}

function StaffRolesPage({ user, onLogout, headers, showToast }) {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingRoleId, setSavingRoleId] = useState(null);

    const load = async () => {
        const { data } = await api.get('/staff/roles', { headers });
        setRoles(data?.data?.roles || []);
        setPermissions(data?.data?.permissions || []);
    };

    useEffect(() => {
        const run = async () => {
            try {
                await load();
            } catch (error) {
                showToast('error', extractMessage(error));
            } finally {
                setLoading(false);
            }
        };
        run();
    }, []);

    const save = async (roleId, selectedPermissions) => {
        setSavingRoleId(roleId);
        try {
            await api.put(`/staff/roles/${roleId}`, { permissions: selectedPermissions }, { headers });
            await load();
            showToast('success', 'Role permissions updated.');
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSavingRoleId(null);
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Role & Permissions</h1>
            {loading ? (
                <div className="panel">Loading roles...</div>
            ) : (
                <section className="role-grid">
                    {roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            permissions={permissions}
                            onSave={save}
                            busy={savingRoleId === role.id}
                        />
                    ))}
                </section>
            )}
        </AppShell>
    );
}

function ProtectedRoute({ user, role, children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (normalizeRoleGroup(user.role_group) !== role) return <Navigate to="/" replace />;
    return children;
}

function ProtectedAny({ user, children }) {
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

export default function ReactApp() {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(null);
    const [booting, setBooting] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(id);
    }, [toast]);

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const showToast = (type, message) => setToast({ type, message });

    useEffect(() => {
        const bootstrap = async () => {
            if (!token) {
                setBooting(false);
                return;
            }

            try {
                const { data } = await api.get('/auth/me', { headers: authHeaders });
                setUser(data.data);
            } catch {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
            } finally {
                setBooting(false);
            }
        };

        bootstrap();
    }, [token, authHeaders]);

    const login = async (credentials) => {
        setSubmitting(true);
        try {
            const { data } = await api.post('/auth/login', credentials);
            const nextToken = data?.data?.token;
            const nextUser = {
                ...data?.data?.user,
                role_group: data?.data?.role_group,
            };

            localStorage.setItem(TOKEN_KEY, nextToken);
            setToken(nextToken);
            setUser(nextUser);
            showToast('success', data?.message || 'Login successful.');
        } catch (error) {
            showToast('error', extractMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await api.post('/auth/logout', {}, { headers: authHeaders });
            }
        } catch {
            // clear local state regardless
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
            showToast('success', 'Logged out successfully.');
        }
    };

    const defaultPath = normalizeRoleGroup(user?.role_group) === 'employee' ? '/employee/dashboard' : '/admin/dashboard';

    if (booting) {
        return <div style={{ padding: '2rem' }}>Loading...</div>;
    }

    return (
        <>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <Routes>
                <Route
                    path="/login"
                    element={
                        user ? <Navigate to={defaultPath} replace /> : <LoginPage onLogin={login} isSubmitting={submitting} />
                    }
                />

                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute user={user} role="admin">
                            <AdminDashboard user={user} onLogout={logout} headers={authHeaders} />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/staff/users"
                    element={
                        <ProtectedRoute user={user} role="admin">
                            <StaffUsersPage user={user} onLogout={logout} headers={authHeaders} showToast={showToast} />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/staff/roles"
                    element={
                        <ProtectedRoute user={user} role="admin">
                            <StaffRolesPage user={user} onLogout={logout} headers={authHeaders} showToast={showToast} />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employee/dashboard"
                    element={
                        <ProtectedRoute user={user} role="employee">
                            <EmployeeDashboard user={user} onLogout={logout} headers={authHeaders} />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/events"
                    element={
                        <ProtectedAny user={user}>
                            <EventsPage user={user} onLogout={logout} headers={authHeaders} showToast={showToast} />
                        </ProtectedAny>
                    }
                />

                <Route path="/" element={user ? <Navigate to={defaultPath} replace /> : <Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

