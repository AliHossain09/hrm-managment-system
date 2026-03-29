import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

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
    return (
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong.'
    );
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
                <p className="login-subtitle">
                    Secure login for Master Admin, Accountant and Employee.
                </p>

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

function DashboardLayout({ user, title, navItems, children, onLogout }) {
    return (
        <div className="app-shell">
            <aside className="side-nav">
                <div className="brand">
                    adency<span>/4</span>
                </div>
                <nav>
                    {navItems.map((item) => (
                        <a key={item} className="side-item" href="#">
                            {item}
                        </a>
                    ))}
                </nav>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="user-chip">{user?.name}</div>
                    <button className="btn-ghost" type="button" onClick={onLogout}>
                        Logout
                    </button>
                </header>

                <h1 className="dashboard-title">{title}</h1>

                <section className="notice-row">
                    <div className="badge-orange">Notice Board</div>
                    <div className="notice-text">
                        Welcome back {user?.name} ({normalizeRoleGroup(user?.role_group)})
                    </div>
                    <button className="btn-primary small">View All</button>
                </section>

                {children}
            </main>
        </div>
    );
}

function AdminDashboard({ user, onLogout }) {
    return (
        <DashboardLayout
            user={user}
            title="Dashboard (Admin)"
            navItems={['Dashboard', 'Staff', 'Product & Service', 'HRM', 'Settings']}
            onLogout={onLogout}
        >
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
        </DashboardLayout>
    );
}

function EmployeeDashboard({ user, onLogout }) {
    return (
        <DashboardLayout
            user={user}
            title="Dashboard (Employee)"
            navItems={['Dashboard', 'Pay Slip', 'Leave List', 'Attendance', 'My Library']}
            onLogout={onLogout}
        >
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
        </DashboardLayout>
    );
}

function ProtectedRoute({ user, role, children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (normalizeRoleGroup(user.role_group) !== role) return <Navigate to="/" replace />;
    return children;
}

export default function App() {
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

    const authHeaders = useMemo(
        () => (token ? { Authorization: `Bearer ${token}` } : {}),
        [token],
    );

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
            setToast({ type: 'success', message: data?.message || 'Login successful.' });
        } catch (error) {
            setToast({ type: 'error', message: extractMessage(error) });
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
            // logout should clear local state even if server fails
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
            setToast({ type: 'success', message: 'Logged out successfully.' });
        }
    };

    const defaultPath =
        normalizeRoleGroup(user?.role_group) === 'employee'
            ? '/employee/dashboard'
            : '/admin/dashboard';

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
                        user ? (
                            <Navigate to={defaultPath} replace />
                        ) : (
                            <LoginPage onLogin={login} isSubmitting={submitting} />
                        )
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
                    path="/employee/dashboard"
                    element={
                        <ProtectedRoute user={user} role="employee">
                            <EmployeeDashboard user={user} onLogout={logout} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate to={defaultPath} replace />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

