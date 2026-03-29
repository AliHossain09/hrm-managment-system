<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Dashboard | Miutx</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
@include('toaster')
<div class="app-shell">
    <aside class="side-nav">
        <div class="brand">adency<span>/4</span></div>
        <nav>
            <a class="side-item active" href="{{ route('dashboard.employee') }}">Dashboard</a>
            <a class="side-item" href="#">Pay Slip</a>
            <a class="side-item" href="#">Leave List</a>
            <a class="side-item" href="#">Attendance</a>
            <a class="side-item" href="#">My Library</a>
        </nav>
    </aside>

    <main class="main-content">
        <header class="topbar">
            <div class="user-chip">{{ $user->name }}</div>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button class="btn-ghost" type="submit">Logout</button>
            </form>
        </header>

        <h1 class="dashboard-title">Dashboard (Employee)</h1>

        <section class="notice-row">
            <div class="badge-orange">Notice Board</div>
            <div class="notice-text">Role group: {{ strtoupper($roleGroup) }} | Hello {{ $user->name }}</div>
            <button class="btn-primary small">View All</button>
        </section>

        <section class="grid-two">
            <article class="panel">
                <h3>Attendance Calendar</h3>
                <p class="panel-muted">Month: March 2026</p>
                <div class="fake-calendar"></div>
            </article>

            <article class="panel stack-gap">
                <div>
                    <h3>Regularize Your Attendance</h3>
                    <p class="panel-muted">Your days of absence: 0</p>
                </div>
                <div>
                    <h3>Apply For Leave</h3>
                    <p class="panel-muted">Available Casual Leave: 9</p>
                    <p class="panel-muted">Available Sick Leave: 14</p>
                    <button class="btn-primary small">Apply Leave</button>
                </div>
            </article>
        </section>
    </main>
</div>
</body>
</html>
