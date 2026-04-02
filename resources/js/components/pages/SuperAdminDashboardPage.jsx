import axios from 'axios';
import React from 'react';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

export default function SuperAdminDashboardPage({ user, onLogout, headers, showToast }) {
    const [stats, setStats] = React.useState({ total: 0, active: 0, inactive: 0 });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const run = async () => {
            try {
                const { data } = await api.get('/super-admin/workspaces', { headers });
                const rows = data?.data?.workspaces || [];
                setStats({
                    total: rows.length,
                    active: rows.filter((x) => String(x.status).toLowerCase() === 'active').length,
                    inactive: rows.filter((x) => String(x.status).toLowerCase() !== 'active').length,
                });
            } catch (error) {
                showToast('error', error?.response?.data?.message || 'Unable to load dashboard stats.');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [headers, showToast]);

    return (
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Super Admin Dashboard</h1>
            {loading ? (
                <section className="panel">Loading dashboard...</section>
            ) : (
                <section className="grid-two">
                    <article className="panel">
                        <h3>Total Master Admin Dashboards</h3>
                        <p className="panel-muted">{stats.total}</p>
                    </article>
                    <article className="panel">
                        <h3>Active</h3>
                        <p className="panel-muted">{stats.active}</p>
                    </article>
                    <article className="panel">
                        <h3>Inactive</h3>
                        <p className="panel-muted">{stats.inactive}</p>
                    </article>
                </section>
            )}
        </AppShell>
    );
}
