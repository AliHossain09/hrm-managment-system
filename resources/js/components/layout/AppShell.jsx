import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

function NotificationButton({ notifications = [], unreadCount = 0, onMarkAllRead, onOpenNotification }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="topbar-notify">
            <button
                type="button"
                className="topbar-notify-btn"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-label="Notifications"
            >
                <span className="topbar-notify-icon">!</span>
                {unreadCount > 0 ? <span className="topbar-notify-badge">{unreadCount}</span> : null}
            </button>

            {open ? (
                <div className="topbar-notify-panel">
                    <div className="topbar-notify-head">
                        <strong>Notifications</strong>
                        <button type="button" className="btn-ghost small" onClick={onMarkAllRead}>
                            Read All
                        </button>
                    </div>

                    <div className="topbar-notify-list">
                        {notifications.length === 0 ? (
                            <p className="text-muted">No notification found.</p>
                        ) : (
                            notifications.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`topbar-notify-item ${item.is_read ? 'read' : 'unread'}`}
                                    onClick={async () => {
                                        if (onOpenNotification) {
                                            await onOpenNotification(item);
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    <strong>{item.title}</strong>
                                    <p>{item.message}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

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
    const location = useLocation();
    const isStaffRoute = location.pathname.startsWith('/admin/staff');
    const isHrmRoute = location.pathname.startsWith('/admin/hrm') || location.pathname.startsWith('/admin/leaves') || location.pathname.startsWith('/events');
    const [isStaffOpen, setIsStaffOpen] = useState(isStaffRoute);
    const [isHrmOpen, setIsHrmOpen] = useState(isHrmRoute);

    useEffect(() => {
        if (isStaffRoute) {
            setIsStaffOpen(true);
        }
    }, [isStaffRoute]);

    useEffect(() => {
        if (isHrmRoute) {
            setIsHrmOpen(true);
        }
    }, [isHrmRoute]);

    return (
        <nav>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Dashboard
            </NavLink>

            <div className={`side-accordion ${isStaffOpen ? 'open' : ''}`}>
                <button
                    type="button"
                    className={`side-accordion-trigger ${isStaffRoute ? 'active' : ''}`}
                    onClick={() => setIsStaffOpen((current) => !current)}
                    aria-expanded={isStaffOpen}
                >
                    <span className="side-accordion-label">Staff</span>
                    <span className={`side-accordion-icon ${isStaffOpen ? 'open' : ''}`} aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </button>
                {isStaffOpen ? (
                    <div className="side-accordion-panel">
                        <NavLink to="/admin/staff/users" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                            User
                        </NavLink>
                        <NavLink to="/admin/staff/roles" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                            Role & Permission
                        </NavLink>
                    </div>
                ) : null}
            </div>

            {isMasterAdmin ? (
                <>
                    <div className={`side-accordion ${isHrmOpen ? 'open' : ''}`}>
                        <button
                            type="button"
                            className={`side-accordion-trigger ${isHrmRoute ? 'active' : ''}`}
                            onClick={() => setIsHrmOpen((current) => !current)}
                            aria-expanded={isHrmOpen}
                        >
                            <span className="side-accordion-label">HRM</span>
                            <span className={`side-accordion-icon ${isHrmOpen ? 'open' : ''}`} aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>
                        {isHrmOpen ? (
                            <div className="side-accordion-panel">
                                <NavLink to="/admin/hrm/employees" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                                    Employee
                                </NavLink>
                                <NavLink to="/admin/hrm/employee-attendance" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                                    Employee Attendance
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
                                <NavLink to="/events" className={({ isActive }) => `side-item side-sub ${isActive ? 'active' : ''}`}>
                                    Event Calendar
                                </NavLink>
                            </div>
                        ) : null}
                    </div>
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
            <NavLink to="/employee/leaves" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
                Leave List
            </NavLink>
            <a className="side-item" href="#">
                Attendance
            </a>
            <a className="side-item" href="#">
                My Library
            </a>
        </nav>
    );
}

export default function AppShell({
    user,
    onLogout,
    children,
    admin = false,
    owner = false,
    notifications = [],
    unreadNotificationsCount = 0,
    onMarkAllNotificationsRead = null,
    onMarkNotificationRead = null,
}) {
    const navigate = useNavigate();
    const accountLevel = String(user?.account_level || '').toLowerCase();
    const isSuperAdmin = accountLevel === 'super_admin' || accountLevel === 'super admin';
    const isMasterAdmin = accountLevel === 'master_admin' || accountLevel === 'master admin';
    const isEmployeeShell = !owner && !isSuperAdmin && !admin;
    const brandName = owner ? 'Owner' : (isSuperAdmin ? 'Super Admin' : (user?.workspace?.name || 'Miutx'));
    const logoUrl = (!owner && !isSuperAdmin) ? user?.workspace?.logo_url : null;

    const openNotification = async (item) => {
        if (onMarkNotificationRead) {
            await onMarkNotificationRead(item.id);
        }

        if (admin) {
            navigate('/admin/leaves');
            return;
        }

        if (isEmployeeShell) {
            navigate('/employee/leaves');
        }
    };

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
                    <div className="topbar-actions">
                        <NotificationButton
                            notifications={notifications}
                            unreadCount={unreadNotificationsCount}
                            onMarkAllRead={onMarkAllNotificationsRead || (() => {})}
                            onOpenNotification={openNotification}
                        />
                        <button className="btn-ghost" type="button" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
}

