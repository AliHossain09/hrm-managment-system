import React from 'react';
import AppShell from '../layout/AppShell.jsx';

export default function OwnerSettingsPage({ user, onLogout }) {
    return (
        <AppShell user={user} onLogout={onLogout} owner>
            <h1 className="dashboard-title">Owner Settings</h1>
            <section className="panel stack-gap">
                <div>
                    <h3>Account</h3>
                    <p className="panel-muted">Name: {user?.name || '-'}</p>
                    <p className="panel-muted">Email: {user?.email || '-'}</p>
                    <p className="panel-muted">Level: {user?.account_level || '-'}</p>
                </div>
                <div>
                    <h3>Security</h3>
                    <p className="panel-muted">Password and profile update UI can be added next.</p>
                </div>
            </section>
        </AppShell>
    );
}
