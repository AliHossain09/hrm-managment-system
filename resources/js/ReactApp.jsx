import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';

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

function LoginPage({ onLogin, isSubmitting }) {
    const [form, setForm] = useState({ email: '', password: '' });

    const submit = async (e) => {
        e.preventDefault();
        await onLogin(form);
    };

    return (
        <main className="login-page">
            <header className="login-header">
                <div className="logo-mark">mx</div>
                <nav className="mini-nav">home</nav>
            </header>

            <section className="login-panel">
                <h1 className="login-title">Miutx Portal Access</h1>
                <p className="login-subtitle">Secure login for Master Admin, Accountant and Employee.</p>

                <form className="login-form" onSubmit={submit}>
                    <input
                        className="login-input"
                        type="email"
                        placeholder="name@company.com"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        required
                    />

                    <input
                        className="login-input"
                        type="password"
                        placeholder="******"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        required
                    />

                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </section>
        </main>
    );
}

function SideNavAdmin() {
    return (
        <nav>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Dashboard
            </NavLink>

            <div className="side-section-title">Staff</div>
            <NavLink to="/admin/staff/users" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                User
            </NavLink>
            <NavLink to="/admin/staff/roles" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                Role & Permission
            </NavLink>

            <a className="side-item" href="#">Product & Service</a>
            <a className="side-item" href="#">HRM</a>
            <a className="side-item" href="#">Settings</a>
        </nav>
    );
}

function SideNavEmployee() {
    return (
        <nav>
            <a className="side-item active" href="#">Dashboard</a>
            <a className="side-item" href="#">Pay Slip</a>
            <a className="side-item" href="#">Leave List</a>
            <a className="side-item" href="#">Attendance</a>
            <a className="side-item" href="#">My Library</a>
        </nav>
    );
}

function AppShell({ user, onLogout, children, admin = false }) {
    return (
        <div className="app-shell">
            <aside className="side-nav">
                <div className="brand">
                    adency<span>/4</span>
                </div>
                {admin ? <SideNavAdmin /> : <SideNavEmployee />}
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="user-chip">{user?.name}</div>
                    <button className="btn-ghost" type="button" onClick={onLogout}>
                        Logout
                    </button>
                </header>
                {children}
            </main>
        </div>
    );
}

function AdminDashboard({ user, onLogout }) {
    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Dashboard (Admin)</h1>
            <section className="notice-row">
                <div className="badge-orange">Notice Board</div>
                <div className="notice-text">Welcome back {user?.name}</div>
                <button className="btn-primary small">View All</button>
            </section>
            <section className="grid-two">
                <article className="panel">
                    <h3>Attendance Calendar</h3>
                    <p className="panel-muted">Month: March 2026</p>
                    <div className="fake-calendar"></div>
                </article>
                <article className="panel stack-gap">
                    <div>
                        <h3>Regularize Your Attendance</h3>
                        <p className="panel-muted">Your days of absence: 0</p>
                    </div>
                    <div>
                        <h3>Apply For Leave</h3>
                        <p className="panel-muted">Available Casual Leave: 9</p>
                        <p className="panel-muted">Available Sick Leave: 14</p>
                    </div>
                </article>
            </section>
        </AppShell>
    );
}

function UserModal({ open, onClose, onSubmit, roles, busy, mode, initialUser }) {
    const [form, setForm] = useState({
        id: null,
        name: '',
        email: '',
        role_name: 'employee',
        password: '',
        avatar: null,
        avatar_preview: null,
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
                avatar: null,
                avatar_preview: initialUser.avatar_url || null,
            });
            return;
        }

        setForm({
            id: null,
            name: '',
            email: '',
            role_name: fallbackRole,
            password: '',
            avatar: null,
            avatar_preview: null,
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

        if (form.avatar) {
            payload.append('avatar', form.avatar);
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

                    <label>
                        Avatar Image
                        <input
                            className="form-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setForm((p) => ({
                                    ...p,
                                    avatar: file,
                                    avatar_preview: file ? URL.createObjectURL(file) : p.avatar_preview,
                                }));
                            }}
                        />
                    </label>

                    <div className="avatar-preview-wrap">
                        {form.avatar_preview ? (
                            <img src={form.avatar_preview} alt="Avatar preview" className="avatar-preview" />
                        ) : (
                            <div className="avatar-circle avatar-preview">{initials(form.name)}</div>
                        )}
                    </div>

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
                            {item.avatar_url ? (
                                <img src={item.avatar_url} alt={item.name} className="user-avatar-image" />
                            ) : (
                                <div className="avatar-circle">{initials(item.name)}</div>
                            )}
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

    useEffect(() => {
        setSelected(role.permissions || []);
    }, [role.id, role.permissions]);

    const toggle = (name) => {
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
                        />
                        <span>{perm.name}</span>
                    </label>
                ))}
            </div>
            <button className="btn-primary small" type="button" onClick={() => onSave(role.id, selected)} disabled={busy}>
                {busy ? 'Saving...' : 'Save Permissions'}
            </button>
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

function EmployeeDashboard({ user, onLogout }) {
    return (
        <AppShell user={user} onLogout={onLogout}>
            <h1 className="dashboard-title">Dashboard (Employee)</h1>
            <section className="notice-row">
                <div className="badge-orange">Notice Board</div>
                <div className="notice-text">Hello {user?.name}</div>
                <button className="btn-primary small">View All</button>
            </section>
            <section className="grid-two">
                <article className="panel">
                    <h3>Attendance Calendar</h3>
                    <p className="panel-muted">Month: March 2026</p>
                    <div className="fake-calendar"></div>
                </article>
                <article className="panel stack-gap">
                    <div>
                        <h3>Regularize Your Attendance</h3>
                        <p className="panel-muted">Your days of absence: 0</p>
                    </div>
                    <div>
                        <h3>Apply For Leave</h3>
                        <p className="panel-muted">Available Casual Leave: 9</p>
                        <p className="panel-muted">Available Sick Leave: 14</p>
                    </div>
                </article>
            </section>
        </AppShell>
    );
}

function ProtectedRoute({ user, role, children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (normalizeRoleGroup(user.role_group) !== role) return <Navigate to="/" replace />;
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
                            <AdminDashboard user={user} onLogout={logout} />
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
                            <EmployeeDashboard user={user} onLogout={logout} />
                        </ProtectedRoute>
                    }
                />

                <Route path="/" element={user ? <Navigate to={defaultPath} replace /> : <Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
