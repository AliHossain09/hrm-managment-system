@if (session('success') || session('error'))
    @php
        $toastType = session('success') ? 'success' : 'error';
        $toastMessage = session('success') ?: session('error');
    @endphp
    <div class="toast-wrap" id="app-toast-wrap">
        <div class="app-toast app-toast-{{ $toastType }}" id="app-toast" role="status" aria-live="polite">
            <div class="app-toast-text">{{ $toastMessage }}</div>
            <button type="button" class="app-toast-close" id="app-toast-close" aria-label="Close">x</button>
        </div>
    </div>
    <script>
        (function () {
            const toast = document.getElementById('app-toast');
            const close = document.getElementById('app-toast-close');
            if (!toast) return;

            const dismiss = () => {
                toast.classList.add('is-hiding');
                setTimeout(() => {
                    const wrap = document.getElementById('app-toast-wrap');
                    if (wrap) wrap.remove();
                }, 260);
            };

            setTimeout(dismiss, 3500);
            if (close) close.addEventListener('click', dismiss);
        })();
    </script>
@endif

