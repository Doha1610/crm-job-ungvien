// Định nghĩa các cột (Trạng thái)
const COLUMNS = [
    { status: "Mới", class: "col-new" },
    { status: "Đã liên hệ", class: "col-contacted" },
    { status: "Hẹn phỏng vấn", class: "col-interview" },
    { status: "Đã phỏng vấn", class: "col-interview" },
    { status: "Offer", class: "col-hired" },
    { status: "Đã tuyển", class: "col-hired" },
    { status: "Từ chối", class: "col-rejected" }
];

document.addEventListener("DOMContentLoaded", function() {
    loadKanbanData();
});

function loadKanbanData() {
    fetch('/api/candidates')
        .then(response => response.json())
        .then(data => {
            renderKanban(data.data);
        })
        .catch(error => console.error('Lỗi tải Kanban:', error));
}

function renderKanban(candidates) {
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = ''; // Xóa dữ liệu cũ

    COLUMNS.forEach(col => {
        // Tạo cột
        const columnDiv = document.createElement('div');
        columnDiv.className = `kanban-column ${col.class}`;
        
        // Header của cột
        columnDiv.innerHTML = `
            <div class="column-header">
                <h3>${col.status}</h3>
                <span class="count-badge" id="count-${col.status.replace(/\s/g, '')}">0</span>
            </div>
            <div class="kanban-items" data-status="${col.status}"></div>
        `;
        board.appendChild(columnDiv);

        // Lấy thẻ ứng viên thuộc cột này
        const itemsContainer = columnDiv.querySelector('.kanban-items');
        const filteredCandidates = candidates.filter(c => c.status === col.status);
        
        // Cập nhật số lượng
        columnDiv.querySelector('.count-badge').innerText = filteredCandidates.length;

        // Đổ dữ liệu vào cột
        filteredCandidates.forEach(c => {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.setAttribute('data-id', c.id);
            card.innerHTML = `
                <div class="name">${c.nguoi_gui || 'Không rõ'}</div>
                <div class="info">${c.nganh_nghe || 'N/A'} - ${c.dia_diem || 'N/A'}</div>
            `;
            itemsContainer.appendChild(card);
        });

        // Kích hoạt tính năng kéo thả của SortableJS cho cột này
        new Sortable(itemsContainer, {
            group: 'kanban', // Cho phép kéo thả giữa các cột cùng group
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function(evt) {
                // Khi kéo thả xong
                const candidateId = evt.item.getAttribute('data-id');
                const newStatus = evt.to.getAttribute('data-status');
                
                // Gọi API cập nhật trạng thái xuống Database
                updateStatusKanban(candidateId, newStatus);
                
                // Cập nhật lại số lượng badge (đơn giản là tải lại trang)
                // Hoặc bạn có thể viết code JS để đếm lại, nhưng tải lại cho nhanh
                setTimeout(() => loadKanbanData(), 300);
            }
        });
    });
}

function updateStatusKanban(candidateId, newStatus) {
    fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            candidate_id: parseInt(candidateId),
            new_status: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log(`✅ Đã chuyển ứng viên #${candidateId} sang ${newStatus}`);
        }
    })
    .catch(error => console.error('Lỗi cập nhật:', error));
}