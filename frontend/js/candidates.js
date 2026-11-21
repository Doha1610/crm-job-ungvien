let allCandidates = []; // Lưu trữ dữ liệu toàn cục

document.addEventListener("DOMContentLoaded", function() {
    loadCandidates();

    // Gắn sự kiện cho các ô lọc
    const filterIds = ['filterVisa', 'filterLocation', 'filterStatus', 'searchInput'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyFilters);
            el.addEventListener('input', applyFilters); // Dùng cho ô text
        }
    });
});

function loadCandidates() {
    fetch('/api/candidates')
        .then(res => res.json())
        .then(data => {
            allCandidates = data.data;
            renderTable(allCandidates);
            renderStats(allCandidates);
            populateLocationFilter(allCandidates); // Đổ dữ liệu địa điểm vào bộ lọc
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
            <td>
                <select class="status-select" onchange="updateCandidateStatus(${c.id}, this.value)" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; cursor: pointer; outline: none;">
                    <option value="Mới" ${c.status === 'Mới' ? 'selected' : ''}>Mới</option>
                    <option value="Đã liên hệ" ${c.status === 'Đã liên hệ' ? 'selected' : ''}>Đã liên hệ</option>
                    <option value="Hẹn phỏng vấn" ${c.status === 'Hẹn phỏng vấn' ? 'selected' : ''}>Hẹn phỏng vấn</option>
                    <option value="Đã phỏng vấn" ${c.status === 'Đã phỏng vấn' ? 'selected' : ''}>Đã phỏng vấn</option>
                    <option value="Offer" ${c.status === 'Offer' ? 'selected' : ''}>Offer</option>
                    <option value="Đã tuyển" ${c.status === 'Đã tuyển' ? 'selected' : ''}>Đã tuyển</option>
                    <option value="Từ chối" ${c.status === 'Từ chối' ? 'selected' : ''}>Từ chối</option>
                </select>
            </td>
            <td>${c.assigned_to || 'Chưa phân công'}</td>
            <td style="color: #94a3b8; cursor: pointer;">...</td>
        `;
        
        tr.onclick = function(e) {
            // Nếu click vào checkbox hoặc select thì không mở chi tiết
            if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
            
            document.querySelectorAll('#candidateTable tbody tr').forEach(row => row.classList.remove('active'));
            tr.classList.add('active');
            
            showDetail(c.id);
        };

        tbody.appendChild(tr);
    });
}

// Hàm gọi API cập nhật trạng thái
async function updateCandidateStatus(candidateId, newStatus) {
    try {
        const response = await fetch('/api/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: candidateId, new_status: newStatus })
        });

        const result = await response.json();

        if (response.ok) {
            const candidate = allCandidates.find(c => c.id === candidateId);
            if (candidate) candidate.status = newStatus;
            
            renderStats(allCandidates);
            
            // Nếu đang xem chi tiết ứng viên này, cập nhật lại panel bên phải
            const activeDetail = document.querySelector('#detailPanel .detail-name');
            if (activeDetail && activeDetail.innerText === candidate.nguoi_gui) {
                showDetail(candidateId); 
            }
        } else {
            alert("Lỗi khi cập nhật: " + result.message);
            loadCandidates();
        }
    } catch (error) {
        console.error("Lỗi kết nối API:", error);
        alert("Không thể kết nối đến server!");
        loadCandidates();
    }
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

        let badgeClass = 'badge-moi';
        if (c.status === 'Đã liên hệ') badgeClass = 'badge-lienhe';
        if (c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn' || c.status === 'Offer') badgeClass = 'badge-tiemnang';
        if (c.status === 'Đã tuyển') badgeClass = 'badge-tuyen';

        // Render HTML cho Panel chi tiết
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

            <!-- PHẦN GHI CHÚ NỘI BỘ (Đã đặt đúng vị trí) -->
            <div class="note-section">
                <h4>📝 Ghi chú nội bộ</h4>
                <textarea id="noteInput" placeholder="Nhập ghi chú cho ứng viên này...">${c.notes || ''}</textarea>
                <button onclick="saveNote(${c.id})">💾 Lưu ghi chú</button>
            </div>

            <div class="detail-section" style="margin-top: 20px;">
                <h4>Lịch sử chăm sóc</h4>
                <div class="timeline">
                    ${historyHtml}
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn-call">📞 Gọi điện</button>
                <button class="btn-msg">💬 Nhắn tin</button>
                <button class="btn-book" onclick="window.location.href='/hr/calendar'">📅 Đặt lịch</button>
                <button class="btn-primary" onclick="openAssignModal(${c.id})">📦 Gán vào đơn hàng</button>
            </div>
        `;
    }).catch(err => {
        panel.innerHTML = `<p style="color:red; text-align:center;">Lỗi: ${err}</p>`;
    });
}

// Hàm lưu ghi chú
async function saveNote(candidateId) {
    const noteInput = document.getElementById('noteInput');
    const noteContent = noteInput.value.trim();

    if (!noteContent) {
        alert("Vui lòng nhập nội dung ghi chú!");
        return;
    }

    try {
        const response = await fetch('/api/add-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidate_id: candidateId,
                note_content: noteContent
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Đã lưu ghi chú thành công!");
            showDetail(candidateId); // Load lại chi tiết để thấy ghi chú mới trong timeline
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể kết nối đến server!");
    }
}

// ===== CÁC HÀM XỬ LÝ MODAL THÊM ỨNG VIÊN =====
function openAddModal() {
    document.getElementById('addCandidateModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addCandidateModal').style.display = 'none';
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
            loadCandidates();
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    })
    .catch(err => alert('Lỗi kết nối: ' + err));
}

// Hàm xuất CSV
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

// ===== TÍNH NĂNG LỌC VÀ TÌM KIẾM =====
function populateLocationFilter(data) {
    const locationSelect = document.getElementById('filterLocation');
    if (!locationSelect) return;
    
    const locations = [...new Set(data.map(c => c.dia_diem).filter(Boolean))];
    locationSelect.innerHTML = '<option value="">Tất cả Địa điểm</option>';
    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationSelect.appendChild(option);
    });
}

function applyFilters() {
    const visa = document.getElementById('filterVisa').value;
    const location = document.getElementById('filterLocation').value;
    const status = document.getElementById('filterStatus').value;
    const keyword = document.getElementById('searchInput').value.toLowerCase().trim();

    const filteredData = allCandidates.filter(c => {
        if (visa && c.visa_mong_muon !== visa) return false;
        if (location && c.dia_diem !== location) return false;
        if (status && c.status !== status) return false;
        
        if (keyword) {
            const name = (c.nguoi_gui || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const industry = (c.nganh_nghe || '').toLowerCase();
            if (!name.includes(keyword) && !phone.includes(keyword) && !industry.includes(keyword)) {
                return false;
            }
        }
        return true;
    });

    renderTable(filteredData);
}
// Hàm mở Modal gán ứng viên vào đơn hàng
async function openAssignModal(candidateId) {
    // Lấy danh sách đơn hàng
    const response = await fetch('/api/job-orders');
    const data = await response.json();
    const jobOrders = data.data;

    if (jobOrders.length === 0) {
        alert("Chưa có đơn hàng nào. Vui lòng tạo đơn hàng trước!");
        return;
    }

    // Tạo HTML cho Modal
    let modalHtml = `
        <div class="modal-overlay" id="assignModal" style="display: flex;">
            <div class="modal-content">
                <button class="modal-close" onclick="closeAssignModal()">&times;</button>
                <h2 style="margin-top: 0;">📦 Gán vào Đơn hàng</h2>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
                    <label>Chọn đơn hàng:</label>
                    <select id="assignJobOrderId" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        ${jobOrders.map(job => `<option value="${job.id}">${job.title} (${job.location || 'N/A'})</option>`).join('')}
                    </select>
                    <label>Ghi chú (nếu có):</label>
                    <textarea id="assignNote" placeholder="Ghi chú thêm..." style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; height: 60px;"></textarea>
                    <button onclick="submitAssign(${candidateId})" style="padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">💾 Xác nhận</button>
                </div>
            </div>
        </div>
    `;

    // Thêm Modal vào body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHtml;
    document.body.appendChild(tempDiv.firstElementChild);
}

function closeAssignModal() {
    const modal = document.getElementById('assignModal');
    if (modal) modal.remove();
}

async function submitAssign(candidateId) {
    const jobOrderId = document.getElementById('assignJobOrderId').value;
    const note = document.getElementById('assignNote').value.trim();

    const response = await fetch('/api/add-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            candidate_id: candidateId,
            job_order_id: parseInt(jobOrderId),
            note: note
        })
    });

    const result = await response.json();
    if (result.status === 'success') {
        alert("✅ Đã gán ứng viên vào đơn hàng thành công!");
        closeAssignModal();
        showDetail(candidateId); // Load lại chi tiết
    } else {
        alert("❌ Lỗi: " + result.message);
    }
}