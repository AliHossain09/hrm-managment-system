import axios from 'axios';
import React from 'react';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

export default function OwnerDashboardPage({ user, onLogout, headers, showToast }) {
    const [stats, setStats] = React.useState({ total: 0, active: 0, inactive: 0, expiring_soon: 0 });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const run = async () => {
            try {
                const { data } = await api.get('/owner/super-admins', { headers });
                const items = data?.data?.super_admins || [];
                const now = new Date();
                const in7 = new Date();
                in7.setDate(now.getDate() + 7);

                const total = items.length;
                const active = items.filter((x) => String(x.status).toLowerCase() === 'active').length;
                const inactive = items.filter((x) => String(x.status).toLowerCase() !== 'active').length;
                const expiringSoon = items.filter((x) => {
                    if (!x.subscription_ends_at) return false;
                    const d = new Date(x.subscription_ends_at);
                    return d >= now && d <= in7;
                }).length;

                setStats({ total, active, inactive, expiring_soon: expiringSoon });
            } catch (error) {
                showToast('error', error?.response?.data?.message || 'Unable to load owner dashboard stats.');
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [headers, showToast]);

    return (
        <AppShell user={user} onLogout={onLogout} owner>
            <h1 className="dashboard-title">Owner Dashboard</h1>
            {loading ? (
                <section className="panel">Loading dashboard...</section>
            ) : (
                <section className="grid-two">
                    <article className="panel">
                        <h3>Total Super Admin</h3>
                        <p className="panel-muted">{stats.total}</p>
                    </article>
                    <article className="panel">
                        <h3>Active Accounts</h3>
                        <p className="panel-muted">{stats.active}</p>
                    </article>
                    <article className="panel">
                        <h3>Inactive Accounts</h3>
                        <p className="panel-muted">{stats.inactive}</p>
                    </article>
                    <article className="panel">
                        <h3>Expiring in 7 Days</h3>
                        <p className="panel-muted">{stats.expiring_soon}</p>
                    </article>
                </section>
            )}
        </AppShell>
    );
}
