// frontend/js/sidebar.js

// Hàm tự động tải sidebar vào một thẻ div có id="sidebar-container"
document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.getElementById('sidebar-container');
    
    if (sidebarContainer) {
        // Tải nội dung file sidebar.html từ thư mục hr/
        fetch('/hr/sidebar.html', { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error("Không tìm thấy file sidebar.html");
                return response.text();
            })
            .then(html => {
                sidebarContainer.innerHTML = html;
                
                // Xác định trang hiện tại để highlight menu
                const currentPath = window.location.pathname;
                const menuItems = document.querySelectorAll('.menu-item');
                
                menuItems.forEach(item => {
                    const page = item.getAttribute('data-page');
                    
                    // Logic highlight cho TẤT CẢ các trang
                    if (
                        ((currentPath === '/' || currentPath === '/hr/' || currentPath === '/hr') && page === 'dashboard') ||
                        (currentPath.includes('candidates') && page === 'candidates') ||
                        (currentPath.includes('kanban') && page === 'kanban') ||
                        (currentPath.includes('calendar') && page === 'calendar') ||
                        (currentPath.includes('job_orders') && page === 'job_orders') ||
                        (currentPath.includes('reports') && page === 'reports')
                    ) {
                        item.classList.add('active');
                    }
                });
            })
            .catch(error => console.error('Lỗi tải sidebar:', error));
    }
});