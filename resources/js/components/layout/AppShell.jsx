import React from 'react';
import { NavLink } from 'react-router-dom';

function SideNavOwner() {
    return (
        <nav>
            <NavLink to="/owner/dashboard" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Dashboard
            </NavLink>
            <NavLink to="/owner/super-admins" end className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Super Admin Index
            </NavLink>
            <NavLink to="/owner/super-admins/create" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Create Super Admin
            </NavLink>
            <NavLink to="/owner/settings" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Settings
            </NavLink>
        </nav>
    );
}

function SideNavSuperAdmin() {
    return (
        <nav>
            <NavLink to="/super-admin/dashboard" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Dashboard
            </NavLink>
            <NavLink to="/super-admin/workspaces/create" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Create Master Admin Dashboard
            </NavLink>
            <NavLink to="/super-admin/workspaces" end className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Index Master Admin Dashboard
            </NavLink>
        </nav>
    );
}

function SideNavAdmin({ isMasterAdmin }) {
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

            {isMasterAdmin ? (
                <>
                    <div className="side-section-title">HRM</div>
                    <NavLink to="/admin/hrm/employees" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        Employee
                    </NavLink>
                    <NavLink to="/admin/hrm/user-roles" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        User Role
                    </NavLink>
                    <NavLink to="/admin/hrm/departments" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        Department
                    </NavLink>
                    <NavLink to="/admin/hrm/designations" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        Designation
                    </NavLink>
                    <NavLink to="/admin/hrm/user-types" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        User Type
                    </NavLink>
                    <NavLink to="/admin/hrm/part-time-hours" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        Part Time Hours
                    </NavLink>
                    <NavLink to="/admin/leaves" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                        Leave Create & Index
                    </NavLink>
                </>
            ) : null}

            <a className="side-item" href="#">
                Product & Service
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

export default function AppShell({ user, onLogout, children, admin = false, owner = false }) {
    const accountLevel = String(user?.account_level || '').toLowerCase();
    const isSuperAdmin = accountLevel === 'super_admin' || accountLevel === 'super admin';
    const isMasterAdmin = accountLevel === 'master_admin' || accountLevel === 'master admin';
    const brandName = owner ? 'Owner' : (isSuperAdmin ? 'Super Admin' : (user?.workspace?.name || 'Miutx'));
    const logoUrl = (!owner && !isSuperAdmin) ? user?.workspace?.logo_url : null;

    return (
        <div className="app-shell">
            <aside className="side-nav">
                <div className="brand">
                    {logoUrl ? <img src={logoUrl} alt={brandName} className="brand-logo" /> : brandName}
                </div>
                {owner ? <SideNavOwner /> : isSuperAdmin ? <SideNavSuperAdmin /> : admin ? <SideNavAdmin isMasterAdmin={isMasterAdmin} /> : <SideNavEmployee />}
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
