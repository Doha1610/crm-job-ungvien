// Hàm tải dữ liệu (có truyền tham số lọc)
function loadData() {
    const visa = document.getElementById('filterVisa').value;
    const location = document.getElementById('filterLocation').value;
    const keyword = document.getElementById('filterKeyword').value;

    // Tạo URL với các tham số query
    const url = new URL('/api/candidates', window.location.origin);
    if (visa !== 'Tất cả') url.searchParams.append('visa', visa);
    if (location !== 'Tất cả') url.searchParams.append('location', location);
    if (keyword) url.searchParams.append('keyword', keyword);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#candidateTable tbody');
            tbody.innerHTML = ''; // Xóa dữ liệu cũ
            // Gọi hàm vẽ metrics
            renderMetrics(data.data);
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy ứng viên nào</td></tr>';
                return;
            }

            let htmlContent = ''; // Dùng biến tạm để tối ưu hiệu năng
            data.data.forEach(c => {
                const statusOptions = ["Mới", "Đã liên hệ", "Hẹn phỏng vấn", "Đã phỏng vấn", "Offer", "Đã tuyển", "Từ chối"];
                let statusSelect = `<select onchange="updateStatus(${c.id}, this.value)">`;
                statusOptions.forEach(opt => {
                    statusSelect += `<option value="${opt}" ${c.status === opt ? 'selected' : ''}>${opt}</option>`;
                });
                statusSelect += `</select>`;

                htmlContent += `
                    <tr>
                        <td>${c.id}</td>
                        <td>${c.nguoi_gui || 'N/A'}</td>
                        <td>${c.visa_mong_muon || 'N/A'}</td>
                        <td>${c.nganh_nghe || 'N/A'}</td>
                        <td>${c.dia_diem || 'N/A'}</td>
                        <td>${c.status || 'Mới'}</td>
                        <td>${statusSelect}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = htmlContent;
        })
        .catch(error => console.error('Lỗi khi lấy dữ liệu:', error));
}

// Hàm cập nhật trạng thái
function updateStatus(candidateId, newStatus) {
    fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, new_status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Không dùng alert để tránh giật màn hình, chỉ log ra console
            console.log(`✅ Đã cập nhật #${candidateId} -> ${newStatus}`);
        } else {
            alert('❌ Có lỗi xảy ra!');
        }
    })
    .catch(error => console.error('Lỗi cập nhật:', error));
}

// ===== CÁC HÀM XỬ LÝ MODAL THÊM ỨNG VIÊN =====

function openAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error("Không tìm thấy thẻ addModal trong HTML!");
    }
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.style.display = 'none';
        // Xóa trắng các ô nhập liệu
        document.querySelectorAll('#addModal input, #addModal textarea').forEach(el => el.value = '');
        document.getElementById('addVisa').value = '';
    }
}

function submitNewCandidate() {
    const name = document.getElementById('addName').value.trim();
    if (!name) {
        alert('Vui lòng nhập tên người đăng!');
        return;
    }

    const payload = {
        nguoi_gui: name,
        visa_mong_muon: document.getElementById('addVisa').value,
        nganh_nghe: document.getElementById('addIndustry').value,
        dia_diem: document.getElementById('addLocation').value,
        trinh_do_tieng_nhat: document.getElementById('addJapanese').value,
        gioi_tinh: document.getElementById('addGender').value,
        url_bai_viet: document.getElementById('addUrl').value,
        raw_content: document.getElementById('addContent').value
    };

    fetch('/api/add-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert('✅ Đã thêm ứng viên thành công!');
            closeAddModal();
            loadData(); // Tải lại bảng
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    })
    .catch(err => alert('Lỗi kết nối: ' + err));
}

// Khởi tạo khi trang tải xong
document.addEventListener("DOMContentLoaded", function() {
    loadData(); // Tải dữ liệu bảng
    
    // Gắn sự kiện click cho nút "Thêm ứng viên" (nếu nút có id)
    // (Nhưng trong HTML chúng ta đã dùng onclick trực tiếp nên không cần đoạn này)
});
// Hàm tính toán và vẽ 4 ô Metrics
function renderMetrics(data) {
    const total = data.length;
    const hired = data.filter(c => c.status === 'Đã tuyển').length;
    const rejected = data.filter(c => c.status === 'Từ chối').length;
    const rate = total > 0 ? ((hired / total) * 100).toFixed(1) : 0;

    // Cập nhật số liệu
    document.getElementById('metricTotal').innerText = total;
    document.getElementById('metricHired').innerText = hired;
    document.getElementById('metricRate').innerText = rate + '%';
    document.getElementById('metricRejected').innerText = rejected;

    // Vẽ biểu đồ mini (Sparkline) giả lập
    // Vì chưa có dữ liệu lịch sử, ta tạo mảng ngẫu nhiên cho đẹp mắt
    const fakeTrend = [10, 15, 8, 20, 18, 25, 22]; 
    
    const chartConfig = (color) => ({
        type: 'line',
        data: {
            labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
            datasets: [{ data: fakeTrend, borderColor: color, borderWidth: 2, tension: 0.4, pointRadius: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });

    new Chart(document.getElementById('sparklineTotal'), chartConfig('#3b82f6'));
    new Chart(document.getElementById('sparklineHired'), chartConfig('#8b5cf6'));
    new Chart(document.getElementById('sparklineRate'), chartConfig('#f59e0b'));
    new Chart(document.getElementById('sparklineRejected'), chartConfig('#ef4444'));
}