import axios from 'axios';
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
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

    React.useEffect(() => {
        const loadEvents = async () => {
            try {
                const { data } = await api.get('/events', { headers });
                setEvents(data?.data?.events || []);
            } catch {
                setEvents([]);
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
        <AppShell user={user} onLogout={onLogout} admin>
            <h1 className="dashboard-title">Dashboard (Admin)</h1>
            <section className="notice-row">
                <div className="badge-orange">Notice Board</div>
                <div className="notice-text">Welcome back {user?.name}</div>
                <button className="btn-primary small">View All</button>
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
                        <p className="panel-muted">Available Casual Leave: 9</p>
                        <p className="panel-muted">Available Sick Leave: 14</p>
                    </div>
                </article>
            </section>
        </AppShell>
    );
}
