document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('/admin/sidebar.html')
            .then(response => response.text())
            .then(html => {
                sidebarContainer.innerHTML = html;
            })
            .catch(error => console.error('Lỗi tải sidebar admin:', error));
    }
});