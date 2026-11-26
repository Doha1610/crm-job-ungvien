document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('/admin/sidebar.html')
            .then(response => response.text())
            .then(html => {
                sidebarContainer.innerHTML = html;
                
                // Xác định trang hiện tại để highlight menu
                const currentPath = window.location.pathname;
                const menuItems = document.querySelectorAll('.menu-item');
                
                menuItems.forEach(item => {
                    const page = item.getAttribute('data-page');
                    
                    // Logic highlight cho các trang của Admin
                    if (
                        (currentPath === '/admin/' && page === 'dashboard') ||
                        (currentPath.includes('users') && page === 'users') ||
                        (currentPath.includes('leads') && page === 'leads') ||
                        (currentPath.includes('job_orders') && page === 'job_orders') ||
                        (currentPath.includes('assignments') && page === 'assignments') ||
                        (currentPath.includes('reports') && page === 'reports')
                    ) {
                        item.classList.add('active');
                    }
                });
            })
            .catch(error => console.error('Lỗi tải sidebar admin:', error));
    }
});