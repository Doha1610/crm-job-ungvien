let allCandidates = []; // Lưu trữ dữ liệu toàn cục

document.addEventListener("DOMContentLoaded", function() {
    loadCandidates();
});

function loadCandidates() {
    fetch('/api/candidates')
        .then(res => res.json())
        .then(data => {
            allCandidates = data.data;
            renderTable(allCandidates);
            renderStats(allCandidates);
        })
        .catch(err => console.error("Lỗi tải dữ liệu:", err));
}

// Hàm vẽ 4 ô thống kê nhanh
function renderStats(data) {
    const total = data.length;
    const contacted = data.filter(c => c.status === 'Đã liên hệ').length;
    const potential = data.filter(c => c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn' || c.status === 'Offer').length;
    const hired = data.filter(c => c.status === 'Đã tuyển').length;

    document.getElementById('statTotal').innerText = total.toLocaleString('vi-VN');
    document.getElementById('statContacted').innerText = contacted.toLocaleString('vi-VN');
    document.getElementById('statPotential').innerText = potential.toLocaleString('vi-VN');
    document.getElementById('statHired').innerText = hired.toLocaleString('vi-VN');
}

// Hàm vẽ bảng danh sách
function renderTable(data) {
    const tbody = document.querySelector('#candidateTable tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Không có ứng viên nào.</td></tr>';
        return;
    }

    data.forEach((c, index) => {
        // Xác định class badge dựa trên trạng thái
        let badgeClass = 'badge-moi';
        if (c.status === 'Đã liên hệ') badgeClass = 'badge-lienhe';
        if (c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn' || c.status === 'Offer') badgeClass = 'badge-tiemnang';
        if (c.status === 'Đã tuyển') badgeClass = 'badge-tuyen';

        // Hiển thị số điện thoại thật (nếu có), nếu không thì để trống
        const phoneDisplay = c.phone ? `📞 ${c.phone}` : '📞 Chưa có SĐT';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td>${index + 1}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="avatar">${(c.nguoi_gui || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight: 600; color: #1e293b;">${c.nguoi_gui || 'Không rõ'}</div>
                        <div style="font-size: 11px; color: #64748b;">${phoneDisplay}</div>
                    </div>
                </div>
            </td>
            <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${c.visa_mong_muon || 'N/A'}</span></td>
            <td>📍 ${c.dia_diem || 'N/A'}</td>
            <td><span class="badge ${badgeClass}">● ${c.status || 'Mới'}</span></td>
            <td>${c.assigned_to || 'Chưa phân công'}</td>
            <td style="color: #94a3b8; cursor: pointer;">...</td>
        `;
        
        // Gắn sự kiện click để xem chi tiết
        tr.onclick = function(e) {
            // Nếu click vào checkbox thì không mở chi tiết
            if (e.target.type === 'checkbox') return;
            
            // Xóa class active của các dòng khác
            document.querySelectorAll('#candidateTable tbody tr').forEach(row => row.classList.remove('active'));
            // Thêm class active cho dòng hiện tại
            tr.classList.add('active');
            
            showDetail(c.id);
        };

        tbody.appendChild(tr);
    });
}

// Hàm hiển thị chi tiết bên phải
function showDetail(id) {
    const panel = document.getElementById('detailPanel');
    panel.innerHTML = '<p style="text-align:center; color:#94a3b8;">Đang tải...</p>';

    Promise.all([
        fetch(`/api/candidate/${id}`).then(res => res.json()),
        fetch(`/api/interactions/${id}`).then(res => res.json())
    ]).then(([detail, history]) => {
        const c = detail.data;
        
        // Tạo timeline lịch sử
        let historyHtml = '';
        if (history.data.length === 0) {
            historyHtml = '<p style="color:#94a3b8; font-size:12px;">Chưa có lịch sử chăm sóc.</p>';
        } else {
            history.data.forEach(h => {
                historyHtml += `
                    <div class="timeline-item">
                        <div class="timeline-time">${h.created_at}</div>
                        <div><strong>${h.action}:</strong> ${h.new_value || ''}</div>
                    </div>
                `;
            });
        }

        // Xác định class badge
        let badgeClass = 'badge-moi';
        if (c.status === 'Đã liên hệ') badgeClass = 'badge-lienhe';
        if (c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn' || c.status === 'Offer') badgeClass = 'badge-tiemnang';
        if (c.status === 'Đã tuyển') badgeClass = 'badge-tuyen';

        panel.innerHTML = `
            <div class="detail-header">
                <div class="detail-avatar">👤</div>
                <h3 class="detail-name">${c.nguoi_gui || 'Không rõ'}</h3>
                <span class="detail-status-badge ${badgeClass}">● ${c.status || 'Mới'}</span>
            </div>

            <div class="detail-section">
                <h4>Thông tin chi tiết</h4>
                <div class="detail-row"><span>Visa mong muốn</span><span>${c.visa_mong_muon || 'N/A'}</span></div>
                <div class="detail-row"><span>Ngành nghề</span><span>${c.nganh_nghe || 'N/A'}</span></div>
                <div class="detail-row"><span>Trình độ tiếng Nhật</span><span>${c.trinh_do_tieng_nhat || 'N/A'}</span></div>
                <div class="detail-row"><span>Địa điểm</span><span>${c.dia_diem || 'N/A'}</span></div>
                <div class="detail-row"><span>Giới tính</span><span>${c.gioi_tinh || 'N/A'}</span></div>
                <div class="detail-row"><span>Số điện thoại</span><span>${c.phone || 'Chưa có'}</span></div>
                <div class="detail-row"><span>Địa chỉ</span><span>${c.address || 'Chưa có'}</span></div>
                <div class="detail-row"><span>Nguồn</span><span>Facebook</span></div>
            </div>

            <div class="detail-section">
                <h4>Lịch sử chăm sóc</h4>
                <div class="timeline">
                    ${historyHtml}
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn-call">📞 Gọi điện</button>
                <button class="btn-msg">💬 Nhắn tin</button>
                <button class="btn-book" onclick="window.location.href='/calendar'">📅 Đặt lịch</button>
            </div>
        `;
    }).catch(err => {
        panel.innerHTML = `<p style="color:red; text-align:center;">Lỗi: ${err}</p>`;
    });
}

// ===== CÁC HÀM XỬ LÝ MODAL THÊM ỨNG VIÊN =====

function openAddModal() {
    document.getElementById('addCandidateModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addCandidateModal').style.display = 'none';
    // Xóa trắng form
    document.querySelectorAll('#addCandidateModal input, #addCandidateModal textarea').forEach(el => el.value = '');
    document.getElementById('addVisa').value = '';
}

function submitNewCandidate() {
    const name = document.getElementById('addName').value.trim();
    if (!name) {
        alert('Vui lòng nhập tên người đăng!');
        return;
    }

    const payload = {
        nguoi_gui: name,
        phone: document.getElementById('addPhone').value,
        address: document.getElementById('addAddress').value,
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
            loadCandidates(); // Tải lại bảng
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    })
    .catch(err => alert('Lỗi kết nối: ' + err));
}

// Hàm xuất CSV (Giữ nguyên từ code cũ)
function exportCSV() {
    if (allCandidates.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }
    const headers = ["ID", "Người đăng", "Visa", "Ngành nghề", "Địa điểm", "Trạng thái"];
    const rows = allCandidates.map(c => [
        c.id, `"${c.nguoi_gui || ''}"`, `"${c.visa_mong_muon || ''}"`, 
        `"${c.nganh_nghe || ''}"`, `"${c.dia_diem || ''}"`, `"${c.status || ''}"`
    ]);
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_ung_vien_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}