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

export default function EmployeeDashboard({ user, onLogout, headers }) {
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [leavePortal, setLeavePortal] = React.useState({
        notifications: [],
        unread_notifications_count: 0,
        leave_types: [],
    });

    React.useEffect(() => {
        const loadEvents = async () => {
            try {
                const [{ data: eventData }, { data: leaveData }] = await Promise.all([
                    api.get('/events', { headers }),
                    api.get('/employee/leaves', { headers }),
                ]);
                setEvents(eventData?.data?.events || []);
                setLeavePortal({
                    notifications: leaveData?.data?.notifications || [],
                    unread_notifications_count: leaveData?.data?.unread_notifications_count || 0,
                    leave_types: leaveData?.data?.leave_types || [],
                });
            } catch {
                setEvents([]);
                setLeavePortal({
                    notifications: [],
                    unread_notifications_count: 0,
                    leave_types: [],
                });
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [headers]);

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
        <AppShell user={user} onLogout={onLogout}>
            <h1 className="dashboard-title">Dashboard (Employee)</h1>
            <section className="notice-row">
                <div className="badge-orange">Notify</div>
                <div className="notice-text">
                    {leavePortal.notifications[0]?.message || `Hello ${user?.name}. You have ${leavePortal.unread_notifications_count} unread notification(s).`}
                </div>
                <Link to="/employee/leaves" className="btn-primary small">View Leave</Link>
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
                        {leavePortal.leave_types.length === 0 ? (
                            <p className="panel-muted">No leave type assigned yet.</p>
                        ) : (
                            leavePortal.leave_types.slice(0, 3).map((item) => (
                                <p key={item.leave_type_id} className="panel-muted">
                                    {item.leave_name}: {item.remaining_days} remaining
                                </p>
                            ))
                        )}
                    </div>
                </article>
            </section>
        </AppShell>
    );
}
