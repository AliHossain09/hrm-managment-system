import React, { useState } from 'react';

export default function LoginPage({ onLogin, isSubmitting }) {
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
