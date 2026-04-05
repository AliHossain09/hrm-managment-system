import axios from 'axios';
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Link } from 'react-router-dom';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

function addOneDay(yyyyMmDd) {
    const date = new Date(`${yyyyMmDd}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
}

export default function AdminDashboard({ user, onLogout, headers }) {
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [leavePortal, setLeavePortal] = React.useState({
        pending_count: 0,
        notifications: [],
        recent_requests: [],
    });
    const isMasterAdmin = ['master_admin', 'master admin'].includes(String(user?.account_level || '').toLowerCase());

    React.useEffect(() => {
        const loadEvents = async () => {
            try {
                const requests = [api.get('/events', { headers })];

                if (isMasterAdmin) {
                    requests.push(api.get('/admin/leave-requests', { headers }));
                }

                const responses = await Promise.all(requests);
                setEvents(responses[0]?.data?.data?.events || []);
                if (isMasterAdmin) {
                    setLeavePortal({
                        pending_count: responses[1]?.data?.data?.pending_count || 0,
                        notifications: responses[1]?.data?.data?.notifications || [],
                        recent_requests: responses[1]?.data?.data?.recent_requests || [],
                    });
                }
            } catch {
                setEvents([]);
                setLeavePortal({
                    pending_count: 0,
                    notifications: [],
                    recent_requests: [],
                });
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [headers, isMasterAdmin]);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all', {}, { headers });
            if (isMasterAdmin) {
                const { data } = await api.get('/admin/leave-requests', { headers });
                setLeavePortal({
                    pending_count: data?.data?.pending_count || 0,
                    notifications: data?.data?.notifications || [],
                    recent_requests: data?.data?.recent_requests || [],
                });
            }
        } catch {
            // keep dashboard resilient
        }
    };

    const markOneRead = async (notificationId) => {
        try {
            await api.post(`/notifications/${notificationId}/read`, {}, { headers });
            if (isMasterAdmin) {
                const { data } = await api.get('/admin/leave-requests', { headers });
                setLeavePortal({
                    pending_count: data?.data?.pending_count || 0,
                    notifications: data?.data?.notifications || [],
                    recent_requests: data?.data?.recent_requests || [],
                });
            }
        } catch {
            // keep dashboard resilient
        }
    };

    const calendarEvents = React.useMemo(() => {
        return events.map((item) => ({
            id: String(item.id),
            title: item.title,
            start: item.start_date,
            end: addOneDay(item.end_date),
            allDay: true,
        }));
    }, [events]);

    return (
        <AppShell
            user={user}
            onLogout={onLogout}
            admin
            notifications={leavePortal.notifications}
            unreadNotificationsCount={leavePortal.notifications.filter((item) => !item.is_read).length}
            onMarkAllNotificationsRead={markAllRead}
            onMarkNotificationRead={markOneRead}
        >
            <h1 className="dashboard-title">Dashboard (Admin)</h1>
            <section className="notice-row">
                <div className="badge-orange">Notice</div>
                <div className="notice-text">{`Welcome back ${user?.name}`}</div>
                <Link to={isMasterAdmin ? '/admin/leaves' : '/events'} className="btn-primary small">
                    {isMasterAdmin ? 'Review Leaves' : 'View All'}
                </Link>
            </section>
            <section className="grid-two">
                <article className="panel">
                    <h3>Event Calendar</h3>
                    {loading ? (
                        <p className="panel-muted">Loading events...</p>
                    ) : (
                        <FullCalendar
                            plugins={[dayGridPlugin]}
                            initialView="dayGridMonth"
                            events={calendarEvents}
                            height="auto"
                            headerToolbar={{
                                left: 'title',
                                center: '',
                                right: 'today prev,next',
                            }}
                        />
                    )}
                </article>
                <article className="panel stack-gap">
                    <div>
                        <h3>Regularize Your Attendance</h3>
                        <p className="panel-muted">Your days of absence: 0</p>
                    </div>
                    <div>
                        <h3>Apply For Leave</h3>
                        {isMasterAdmin ? (
                            <>
                                <p className="panel-muted">Pending Leave Requests: {leavePortal.pending_count}</p>
                                <p className="panel-muted">
                                    Latest Status: {leavePortal.recent_requests[0]?.status || 'No request yet'}
                                </p>
                            </>
                        ) : (
                            <p className="panel-muted">Leave review is available for master admin.</p>
                        )}
                    </div>
                </article>
            </section>
        </AppShell>
    );
}
