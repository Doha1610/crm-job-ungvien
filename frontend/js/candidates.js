document.addEventListener("DOMContentLoaded", function() {
    loadCandidates();
});

function loadCandidates() {
    fetch('/api/candidates')
        .then(response => response.json())
        .then(data => {
            const grid = document.getElementById('candidateGrid');
            grid.innerHTML = '';

            if (data.data.length === 0) {
                grid.innerHTML = '<p>Chưa có ứng viên nào.</p>';
                return;
            }

            data.data.forEach(c => {
                // Xác định class màu cho badge trạng thái
                let badgeClass = 'badge-new';
                if (c.status === 'Đã liên hệ') badgeClass = 'badge-contacted';
                if (c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn') badgeClass = 'badge-interview';
                if (c.status === 'Đã tuyển' || c.status === 'Offer') badgeClass = 'badge-hired';
                if (c.status === 'Từ chối') badgeClass = 'badge-rejected';

                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `
                    <h3>${c.nguoi_gui || 'Không rõ'}</h3>
                    <p><strong>Visa:</strong> ${c.visa_mong_muon || 'N/A'}</p>
                    <p><strong>Ngành nghề:</strong> ${c.nganh_nghe || 'N/A'}</p>
                    <p><strong>Địa điểm:</strong> ${c.dia_diem || 'N/A'}</p>
                    <span class="badge ${badgeClass}">${c.status || 'Mới'}</span>
                `;
                // Gắn sự kiện click để xem chi tiết
                card.onclick = () => showDetail(c.id);
                grid.appendChild(card);
            });
        })
        .catch(error => console.error('Lỗi tải danh sách:', error));
}

// Hàm xem chi tiết (Sẽ gọi API chi tiết và hiện popup)
function showDetail(id) {
    fetch(`/api/candidate/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Lỗi: ' + data.error);
                return;
            }
            const c = data.data;
            // Hiển thị popup thông tin
            alert(`--- CHI TIẾT ỨNG VIÊN #${c.id} ---\n\n` +
                  `Tên: ${c.nguoi_gui || 'N/A'}\n` +
                  `Visa: ${c.visa_mong_muon || 'N/A'}\n` +
                  `Ngành: ${c.nganh_nghe || 'N/A'}\n` +
                  `Địa điểm: ${c.dia_diem || 'N/A'}\n` +
                  `Trạng thái: ${c.status || 'Mới'}\n` +
                  `Link FB: ${c.url_bai_viet || 'Không có'}\n\n` +
                  `Nội dung: ${c.raw_content || 'Không có'}`);
        })
        .catch(error => console.error('Lỗi tải chi tiết:', error));
}
let allCandidates = []; // Biến toàn cục lưu dữ liệu để export

document.addEventListener("DOMContentLoaded", function() {
    loadCandidates();
});

function loadCandidates() {
    fetch('/api/candidates')
        .then(response => response.json())
        .then(data => {
            allCandidates = data.data; // Lưu lại để export
            const grid = document.getElementById('candidateGrid');
            grid.innerHTML = '';

            if (allCandidates.length === 0) {
                grid.innerHTML = '<p>Chưa có ứng viên nào.</p>';
                return;
            }

            allCandidates.forEach(c => {
                let badgeClass = 'badge-new';
                if (c.status === 'Đã liên hệ') badgeClass = 'badge-contacted';
                if (c.status === 'Hẹn phỏng vấn' || c.status === 'Đã phỏng vấn') badgeClass = 'badge-interview';
                if (c.status === 'Đã tuyển' || c.status === 'Offer') badgeClass = 'badge-hired';
                if (c.status === 'Từ chối') badgeClass = 'badge-rejected';

                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `
                    <h3>${c.nguoi_gui || 'Không rõ'}</h3>
                    <p><strong>Visa:</strong> ${c.visa_mong_muon || 'N/A'}</p>
                    <p><strong>Ngành nghề:</strong> ${c.nganh_nghe || 'N/A'}</p>
                    <p><strong>Địa điểm:</strong> ${c.dia_diem || 'N/A'}</p>
                    <span class="badge ${badgeClass}">${c.status || 'Mới'}</span>
                `;
                card.onclick = () => showDetail(c.id);
                grid.appendChild(card);
            });
        })
        .catch(error => console.error('Lỗi tải danh sách:', error));
}

// Mở Modal và tải dữ liệu chi tiết
function showDetail(id) {
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('modalBody');
    body.innerHTML = '<p>Đang tải...</p>';
    modal.classList.add('active');

    // Gọi 2 API cùng lúc: Chi tiết và Lịch sử
    Promise.all([
        fetch(`/api/candidate/${id}`).then(res => res.json()),
        fetch(`/api/interactions/${id}`).then(res => res.json())
    ]).then(([detailData, historyData]) => {
        if (detailData.error) {
            body.innerHTML = `<p>Lỗi: ${detailData.error}</p>`;
            return;
        }
        const c = detailData.data;
        const history = historyData.data;

        // Tạo nội dung HTML cho Modal
        body.innerHTML = `
            <h2 style="margin-top:0; color:#1e293b;">👤 ${c.nguoi_gui || 'Không rõ'} (ID: ${c.id})</h2>
            <p><strong>Visa:</strong> ${c.visa_mong_muon || 'N/A'} | <strong>Ngành:</strong> ${c.nganh_nghe || 'N/A'}</p>
            <p><strong>Địa điểm:</strong> ${c.dia_diem || 'N/A'} | <strong>Trạng thái:</strong> ${c.status}</p>
            <p><strong>Link FB:</strong> ${c.url_bai_viet ? `<a href="${c.url_bai_viet}" target="_blank">Xem bài viết</a>` : 'Không có'}</p>
            
            <div style="background:#f8fafc; padding:10px; border-radius:8px; margin-top:10px; max-height:100px; overflow-y:auto; font-size:13px; color:#475569;">
                <strong>Nội dung gốc:</strong><br>${c.raw_content || 'Không có'}
            </div>

            <!-- Phần Ghi chú -->
            <div class="note-section">
                <h4 style="margin:0 0 10px 0;">📝 Ghi chú nội bộ</h4>
                <textarea id="noteInput" class="note-textarea" placeholder="Nhập ghi chú...">${c.notes || ''}</textarea>
                <button class="btn-save-note" onclick="saveNote(${c.id})">💾 Lưu ghi chú</button>
            </div>

            <!-- Phần Lịch sử -->
            <div class="note-section">
                <h4 style="margin:0 0 10px 0;">📜 Lịch sử tương tác</h4>
                <div class="history-list">
                    ${history.length === 0 ? '<p>Chưa có lịch sử.</p>' : 
                        history.map(h => `
                            <div class="history-item">
                                <div class="history-time">${h.created_at}</div>
                                <div><strong>${h.action}:</strong> ${h.old_value || ''} ➔ ${h.new_value || ''}</div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }).catch(err => {
        body.innerHTML = `<p>Lỗi tải dữ liệu: ${err}</p>`;
    });
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// Lưu ghi chú
function saveNote(candidateId) {
    const noteContent = document.getElementById('noteInput').value;
    fetch('/api/add-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, note_content: noteContent })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert('✅ Đã lưu ghi chú!');
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    });
}

// Hàm Export CSV (Sử dụng JS thuần để tạo file)
function exportCSV() {
    if (allCandidates.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }
    
    // Định nghĩa các cột muốn xuất
    const headers = ["ID", "Người đăng", "Visa", "Ngành nghề", "Địa điểm", "Trạng thái"];
    const rows = allCandidates.map(c => [
        c.id, 
        `"${c.nguoi_gui || ''}"`, 
        `"${c.visa_mong_muon || ''}"`, 
        `"${c.nganh_nghe || ''}"`, 
        `"${c.dia_diem || ''}"`, 
        `"${c.status || ''}"`
    ]);

    // Tạo nội dung CSV (thêm BOM để Excel đọc đúng tiếng Việt)
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });

    // Tạo file và tải xuống
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_ung_vien_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}