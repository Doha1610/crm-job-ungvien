document.addEventListener("DOMContentLoaded", function() {
    loadDashboardData();
});

function loadDashboardData() {
    fetch('/api/candidates')
        .then(res => res.json())
        .then(responseData => {
            const candidates = responseData.data;
            console.log("Dữ liệu tải được:", candidates.length, "ứng viên");

            // 1. Vẽ Metrics
            renderMetrics(candidates);
            
            // 2. Vẽ Kanban Mini
            renderKanbanMini(candidates);
            
            // 3. Vẽ Biểu đồ thống kê
            renderCharts(candidates);
        })
        .catch(err => console.error("Lỗi tải dữ liệu:", err));
}

// Hàm vẽ Metrics (4 ô trên cùng)
function renderMetrics(data) {
    const total = data.length;
    const hired = data.filter(c => c.status === 'Đã tuyển').length;
    const rejected = data.filter(c => c.status === 'Từ chối').length;
    const rate = total > 0 ? ((hired / total) * 100).toFixed(1) : 0;

    document.getElementById('metricTotal').innerText = total;
    document.getElementById('metricHired').innerText = hired;
    document.getElementById('metricRate').innerText = rate + '%';
    document.getElementById('metricRejected').innerText = rejected;

    // Vẽ Sparkline (dữ liệu giả lập)
    const fakeTrend = [10, 15, 8, 20, 18, 25, 22];
    const config = (color) => ({
        type: 'line',
        data: { labels: [], datasets: [{ data: fakeTrend, borderColor: color, borderWidth: 2, tension: 0.4, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
    
    if(document.getElementById('sparklineTotal')) new Chart(document.getElementById('sparklineTotal'), config('#3b82f6'));
    if(document.getElementById('sparklineHired')) new Chart(document.getElementById('sparklineHired'), config('#8b5cf6'));
    if(document.getElementById('sparklineRate')) new Chart(document.getElementById('sparklineRate'), config('#f59e0b'));
    if(document.getElementById('sparklineRejected')) new Chart(document.getElementById('sparklineRejected'), config('#ef4444'));
}

// Hàm vẽ Kanban Mini (thu gọn)
function renderKanbanMini(data) {
    const container = document.getElementById('kanbanMini');
    if (!container) return;
    
    container.innerHTML = '';
        // Định nghĩa trạng thái và class màu tương ứng
    const statusConfig = [
        { status: "Mới", class: "col-new" },
        { status: "Đã liên hệ", class: "col-contacted" },
        { status: "Hẹn phỏng vấn", class: "col-interview" },
        { status: "Đã tuyển", class: "col-potential" } // Tạm dùng màu tím cho Đã tuyển
    ];

    statusConfig.forEach(config => {
        const status = config.status;
        const items = data.filter(c => c.status === status);
        const col = document.createElement('div');
        // Gán class màu vào cột
        col.className = `kanban-col ${config.class}`; 
        col.innerHTML = `<h4>${status} (${items.length})</h4>`;
        
        items.slice(0, 3).forEach(c => {
            const card = document.createElement('div');
            card.className = 'kanban-card-mini';
            card.innerHTML = `<strong>${c.nguoi_gui || 'N/A'}</strong><br>${c.dia_diem || ''}`;
            card.onclick = () => showDetail(c.id);
            col.appendChild(card);
        });
        container.appendChild(col);
    });
}

// Hàm hiển thị Chi tiết ứng viên
function showDetail(id) {
    const panel = document.getElementById('detailPanel');
    if (!panel) return;
    panel.innerHTML = '<p>Đang tải...</p>';

    Promise.all([
        fetch(`/api/candidate/${id}`).then(res => res.json()),
        fetch(`/api/interactions/${id}`).then(res => res.json())
    ]).then(([detail, history]) => {
        const c = detail.data;
        
        let historyHtml = '';
        if (history.data.length === 0) {
            historyHtml = '<p style="color:#94a3b8; font-size:13px;">Chưa có lịch sử.</p>';
        } else {
            history.data.forEach(h => {
                let icon = '📝';
                if (h.action.includes('gọi') || h.action.includes('Đổi trạng thái')) icon = '📞';
                if (h.action.includes('thông tin')) icon = '💬';
                if (h.action.includes('Hẹn')) icon = '📅';
                
                historyHtml += `
                    <div class="timeline-item">
                        <div class="timeline-icon">${icon}</div>
                        <div class="timeline-time">${h.created_at}</div>
                        <div class="timeline-content"><strong>${h.action}:</strong> ${h.new_value || ''}</div>
                    </div>
                `;
            });
        }

        panel.innerHTML = `
            <div class="detail-header">
                <div class="detail-avatar">👤</div>
                <div>
                    <h3 class="detail-name">${c.nguoi_gui || 'Không rõ'}</h3>
                    <p class="detail-status">● ${c.status}</p>
                </div>
            </div>
            
            <div class="detail-info">
                <p><span>📍</span> ${c.dia_diem || 'N/A'}</p>
                <p><span>💼</span> ${c.nganh_nghe || 'N/A'}</p>
                <p><span>📞</span> ${c.visa_mong_muon || 'N/A'}</p>
                <p>
                    <img src="/logo/logo%20fb.png" style="width: 16px; height: 16px; vertical-align: middle;">
                    ${c.url_bai_viet ? `<a href="${c.url_bai_viet}" target="_blank" style="color: #3b82f6; font-weight: 600; text-decoration: none;">Xem bài viết Facebook gốc</a>` : 'Không có link'}
                </p>
            </div>

            <hr style="border:0; border-top:1px solid #e2e8f0; margin: 15px 0;">
            
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #475569;">Lịch sử tương tác</h4>
            <div class="timeline">
                ${historyHtml}
            </div>

            <!-- Box Lịch chăm sóc tiếp theo -->
            <div class="next-appointment-box">
                <div>
                    <div class="label">Lịch chăm sóc tiếp theo</div>
                    <div class="date">📅 ${c.next_appointment || 'Chưa có lịch'}</div>
                </div>
                <!-- Nút chuyển sang trang Lịch hẹn -->
                <button class="btn-blue" onclick="window.location.href='/calendar'">Đặt lịch</button>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <!-- Nút chuyển sang trang Quản lý ứng viên -->
                <button class="btn-blue" style="flex: 1;" onclick="window.location.href='/candidates'">💾 Cập nhật</button>
                <button class="btn-outline" style="flex: 1;" onclick="window.location.href='/candidates'">📝 Ghi chú</button>
            </div>
        `;
    }).catch(err => {
        panel.innerHTML = `<p style="color:red;">Lỗi tải dữ liệu: ${err}</p>`;
    });
}

// Hàm vẽ biểu đồ thống kê (Chart.js)
function renderCharts(candidates) {
    const countBy = (field) => {
        const counts = {};
        candidates.forEach(c => { 
            const v = c[field] || 'Khác'; 
            counts[v] = (counts[v] || 0) + 1; 
        });
        return counts;
    };

    const statusData = countBy('status');
    const ctxStatus = document.getElementById('chartStatus');
    if(ctxStatus) {
        new Chart(ctxStatus, {
            type: 'doughnut',
            data: { labels: Object.keys(statusData), datasets: [{ data: Object.values(statusData), backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const locData = countBy('dia_diem');
    const ctxLocation = document.getElementById('chartLocation');
    if(ctxLocation) {
        new Chart(ctxLocation, {
            type: 'bar',
            data: { labels: Object.keys(locData).slice(0, 5), datasets: [{ label: 'Số lượng', data: Object.values(locData).slice(0, 5), backgroundColor: '#3b82f6' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const indData = countBy('nganh_nghe');
    const ctxIndustry = document.getElementById('chartIndustry');
    if(ctxIndustry) {
        new Chart(ctxIndustry, {
            type: 'bar',
            data: { labels: Object.keys(indData).slice(0, 5), datasets: [{ label: 'Số lượng', data: Object.values(indData).slice(0, 5), backgroundColor: '#10b981' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const visaData = countBy('visa_mong_muon');
    const ctxVisa = document.getElementById('chartVisa');
    if(ctxVisa) {
        new Chart(ctxVisa, {
            type: 'pie',
            data: { labels: Object.keys(visaData), datasets: [{ data: Object.values(visaData), backgroundColor: ['#8b5cf6', '#f59e0b', '#3b82f6'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}
// Lắng nghe sự kiện gõ phím trên thanh tìm kiếm
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const keyword = e.target.value.trim();
            // Gọi API với từ khóa tìm kiếm
            fetch(`/api/candidates?keyword=${encodeURIComponent(keyword)}`)
                .then(res => res.json())
                .then(responseData => {
                    const candidates = responseData.data;
                    // Cập nhật lại Kanban và Metrics theo kết quả lọc
                    renderMetrics(candidates);
                    renderKanbanMini(candidates);
                    renderCharts(candidates);
                })
                .catch(err => console.error("Lỗi tìm kiếm:", err));
        });
    }
});