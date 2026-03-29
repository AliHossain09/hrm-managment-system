<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Miutx</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="guest-body">
    @if (session('success'))
        <div class="flash-message flash-success">{{ session('success') }}</div>
    @endif
    @if (session('error'))
        <div class="flash-message flash-error">{{ session('error') }}</div>
    @endif

    <main class="login-page">
        <header class="login-header">
            <div class="logo-mark">mx</div>
            <nav class="mini-nav">home</nav>
        </header>

        <section class="login-panel">
            <h1 class="login-title">Miutx Portal Access</h1>
            <p class="login-subtitle">Secure login for Master Admin, Accountant and Employee.</p>

            <form method="POST" action="{{ route('login.submit') }}" class="login-form">
                @csrf

                <div>
                    <label for="email" class="sr-only">Email</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value="{{ old('email') }}"
                        placeholder="name@company.com"
                        class="login-input"
                        required
                        autofocus
                    >
                    @error('email')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>

                <div>
                    <label for="password" class="sr-only">Password</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="******"
                        class="login-input"
                        required
                    >
                    @error('password')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>

                <label class="remember-wrap">
                    <input type="checkbox" name="remember" value="1" {{ old('remember') ? 'checked' : '' }}>
                    <span>Remember me</span>
                </label>

                <button type="submit" class="btn-primary">Login</button>
            </form>
        </section>
    </main>
</body>
</html>

