import React from 'react';
import { NavLink } from 'react-router-dom';

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

            <a className="side-item" href="#">
                Product & Service
            </a>
            <a className="side-item" href="#">
                HRM
            </a>
            <a className="side-item" href="#">
                Settings
            </a>
        </nav>
    );
}

function SideNavEmployee() {
    return (
        <nav>
            <NavLink to="/employee/dashboard" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Dashboard
            </NavLink>
            <a className="side-item" href="#">
                Pay Slip
            </a>
            <a className="side-item" href="#">
                Leave List
            </a>
            <a className="side-item" href="#">
                Attendance
            </a>
            <a className="side-item" href="#">
                My Library
            </a>
        </nav>
    );
}

export default function AppShell({ user, onLogout, children, admin = false }) {
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
