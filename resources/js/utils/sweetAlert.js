import Swal from 'sweetalert2';

export async function confirmDelete(message, options = {}) {
    const result = await Swal.fire({
        title: options.title || 'Are you sure?',
        text: message,
        icon: options.icon || 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: options.confirmButtonText || 'Yes, delete it',
        cancelButtonText: options.cancelButtonText || 'Cancel',
        reverseButtons: true,
    });

    return result.isConfirmed;
}
