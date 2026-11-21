let calendar;
let allCandidates = [];

document.addEventListener("DOMContentLoaded", function() {
    initCalendar();
    loadCandidatesForSelect();
});

// Khởi tạo FullCalendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'vi',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay' // Thêm view theo ngày
        },
        // Hiển thị dữ liệu lịch hẹn
        events: function(info, successCallback, failureCallback) {
            fetch('/api/appointments')
                .then(res => res.json())
                .then(data => {
                    const events = data.data.map(appt => ({
                        id: appt.id,
                        title: `${appt.nguoi_gui || 'N/A'}: ${appt.title}`,
                        start: appt.appointment_date,
                        backgroundColor: appt.status === 'Chưa xong' ? '#f59e0b' : '#10b981', // Vàng nếu chưa xong, Xanh nếu xong
                        borderColor: 'transparent',
                        extendedProps: { 
                            note: appt.note,
                            status: appt.status
                        }
                    }));
                    successCallback(events);
                })
                .catch(err => {
                    console.error("Lỗi tải lịch:", err);
                    failureCallback(err);
                });
        },
        // Xử lý sự kiện khi click vào một lịch hẹn
        eventClick: function(info) {
            const note = info.event.extendedProps.note || 'Không có ghi chú';
            const status = info.event.extendedProps.status || 'Chưa xong';
            
            // Format lại thời gian cho đẹp
            const timeStr = info.event.start.toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
            });

            alert(`📅 CHI TIẾT LỊCH HẸN\n\n👤 Ứng viên: ${info.event.title.split(':')[0]}\n📌 Tiêu đề: ${info.event.title.split(':')[1]}\n⏰ Thời gian: ${timeStr}\n📝 Ghi chú: ${note}\n🚦 Trạng thái: ${status}`);
        }
    });
    calendar.render();
}

// Tải danh sách ứng viên vào dropdown
function loadCandidatesForSelect() {
    const select = document.getElementById('apptCandidate');
    if (!select) return;

    fetch('/api/candidates')
        .then(res => res.json())
        .then(data => {
            allCandidates = data.data;
            select.innerHTML = '<option value="">-- Chọn ứng viên --</option>'; // Reset lại option mặc định
            allCandidates.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nguoi_gui || 'Không rõ'} (ID: ${c.id})</option>`;
            });
        })
        .catch(err => console.error("Lỗi tải danh sách ứng viên:", err));
}

// Tải lại lịch hẹn
function loadAppointments() {
    if (calendar) calendar.refetchEvents();
}

// Mở/Đóng Modal
function openAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'flex';
    // Reset form
    document.getElementById('apptCandidate').value = '';
    document.getElementById('apptTitle').value = '';
    document.getElementById('apptDate').value = '';
    document.getElementById('apptNote').value = '';
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

// Gửi form thêm lịch
function submitAppointment() {
    const candidateId = document.getElementById('apptCandidate').value;
    const title = document.getElementById('apptTitle').value.trim();
    const date = document.getElementById('apptDate').value;
    const note = document.getElementById('apptNote').value.trim();

    if (!candidateId || !title || !date) {
        alert('Vui lòng điền đầy đủ thông tin: Ứng viên, Tiêu đề và Thời gian!');
        return;
    }

    fetch('/api/add-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            candidate_id: parseInt(candidateId),
            title: title,
            appointment_date: date,
            note: note
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert('✅ Đã thêm lịch hẹn thành công!');
            closeAppointmentModal();
            loadAppointments(); // Tải lại lịch để thấy lịch mới
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    })
    .catch(err => {
        console.error("Lỗi:", err);
        alert("Không thể kết nối đến server!");
    });
}