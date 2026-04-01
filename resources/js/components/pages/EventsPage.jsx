import axios from 'axios';
import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import AppShell from '../layout/AppShell.jsx';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function addOneDay(yyyyMmDd) {
    const date = new Date(`${yyyyMmDd}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
}

function EventModal({ open, mode, initialEvent, busy, onClose, onSubmit }) {
    const [form, setForm] = useState(() => ({
        title: '',
        start_date: todayDate(),
        end_date: todayDate(),
        notes: '',
    }));

    React.useEffect(() => {
        if (!open) return;

        if (mode === 'edit' && initialEvent) {
            setForm({
                title: initialEvent.title || '',
                start_date: initialEvent.start_date || todayDate(),
                end_date: initialEvent.end_date || todayDate(),
                notes: initialEvent.notes || '',
            });
            return;
        }

        setForm({
            title: '',
            start_date: todayDate(),
            end_date: todayDate(),
            notes: '',
        });
    }, [open, mode, initialEvent]);

    if (!open) return null;

    const submit = async (e) => {
        e.preventDefault();
        await onSubmit(form);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <h2>{mode === 'edit' ? 'Edit Event' : 'Add Event'}</h2>
                    <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form className="modal-grid" onSubmit={submit}>
                    <label>
                        Title
                        <input
                            className="form-input"
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Event title"
                            required
                        />
                    </label>

                    <label>
                        Start Date
                        <input
                            type="date"
                            className="form-input"
                            value={form.start_date}
                            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                            required
                        />
                    </label>

                    <label>
                        End Date
                        <input
                            type="date"
                            className="form-input"
                            value={form.end_date}
                            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                            required
                        />
                    </label>

                    <label style={{ gridColumn: 'span 2' }}>
                        Notes
                        <textarea
                            className="form-input"
                            value={form.notes}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Optional note"
                        />
                    </label>

                    <div className="modal-actions">
                        <button className="btn-primary small" type="submit" disabled={busy}>
                            {busy ? (mode === 'edit' ? 'Updating...' : 'Creating...') : mode === 'edit' ? 'Update' : 'Create'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EventsPage({ user, onLogout, headers, showToast }) {
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [permissions, setPermissions] = React.useState({ can_create: false, can_update: false, can_delete: false });

    const [modalOpen, setModalOpen] = React.useState(false);
    const [modalMode, setModalMode] = React.useState('create');
    const [selectedEvent, setSelectedEvent] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    const adminGroup = user?.role_group !== 'employee';

    const loadEvents = React.useCallback(async () => {
        const { data } = await api.get('/events', { headers });
        setEvents(data?.data?.events || []);
        setPermissions(data?.data?.permissions || { can_create: false, can_update: false, can_delete: false });
    }, [headers]);

    React.useEffect(() => {
        const run = async () => {
            try {
                await loadEvents();
            } catch (error) {
                showToast('error', error?.response?.data?.message || 'Unable to load events.');
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [loadEvents, showToast]);

    const filteredEvents = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return events;

        return events.filter((item) => {
            return item.title.toLowerCase().includes(keyword)
                || item.start_date.includes(keyword)
                || item.end_date.includes(keyword);
        });
    }, [events, search]);

    const calendarEvents = useMemo(() => {
        return filteredEvents.map((item) => ({
            id: String(item.id),
            title: item.title,
            start: item.start_date,
            end: addOneDay(item.end_date),
            allDay: true,
        }));
    }, [filteredEvents]);

    const openCreate = () => {
        setModalMode('create');
        setSelectedEvent(null);
        setModalOpen(true);
    };

    const openEdit = (eventItem) => {
        setModalMode('edit');
        setSelectedEvent(eventItem);
        setModalOpen(true);
    };

    const submitEvent = async (payload) => {
        setSaving(true);
        try {
            if (modalMode === 'edit' && selectedEvent) {
                await api.put(`/events/${selectedEvent.id}`, payload, { headers });
                showToast('success', 'Event updated successfully.');
            } else {
                await api.post('/events', payload, { headers });
                showToast('success', 'Event created successfully.');
            }

            await loadEvents();
            setModalOpen(false);
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to save event.');
        } finally {
            setSaving(false);
        }
    };

    const deleteEvent = async (eventItem) => {
        const ok = window.confirm(`Delete event: ${eventItem.title}?`);
        if (!ok) return;

        try {
            await api.delete(`/events/${eventItem.id}`, { headers });
            await loadEvents();
            showToast('success', 'Event deleted successfully.');
        } catch (error) {
            showToast('error', error?.response?.data?.message || 'Unable to delete event.');
        }
    };

    return (
        <AppShell user={user} onLogout={onLogout} admin={adminGroup}>
            <section className="event-titlebar panel">
                <h1 className="dashboard-title">Event Calendar</h1>
                {permissions.can_create ? (
                    <button className="btn-event-add" type="button" onClick={openCreate}>+ Add Event</button>
                ) : null}
            </section>

            <section className="event-layout">
                <article className="panel event-calendar-panel">
                    {loading ? (
                        <div>Loading calendar...</div>
                    ) : (
                        <FullCalendar
                            plugins={[dayGridPlugin, interactionPlugin]}
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

                <article className="panel event-list-panel">
                    <div className="event-search-wrap">
                        <input
                            className="event-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search event..."
                        />
                    </div>

                    <div className="event-table-wrap">
                        <table className="event-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.title}</td>
                                        <td>{item.start_date}</td>
                                        <td>{item.end_date}</td>
                                        <td>
                                            <div className="event-action-cell">
                                                {permissions.can_update ? (
                                                    <button className="btn-mini btn-mini-edit" type="button" onClick={() => openEdit(item)}>
                                                        Edit
                                                    </button>
                                                ) : null}
                                                {permissions.can_delete ? (
                                                    <button className="btn-mini btn-mini-delete" type="button" onClick={() => deleteEvent(item)}>
                                                        Delete
                                                    </button>
                                                ) : null}
                                                {!permissions.can_update && !permissions.can_delete ? (
                                                    <span className="text-muted">View only</span>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="event-count">Showing 1 to {filteredEvents.length} of {filteredEvents.length}</p>
                </article>
            </section>

            <EventModal
                open={modalOpen}
                mode={modalMode}
                initialEvent={selectedEvent}
                busy={saving}
                onClose={() => setModalOpen(false)}
                onSubmit={submitEvent}
            />
        </AppShell>
    );
}
