let calendar;
let allCandidates = [];

document.addEventListener("DOMContentLoaded", function() {
    initCalendar();
    loadCandidatesForSelect();
    loadAppointments();
});

// Khởi tạo FullCalendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'vi', // Ngôn ngữ tiếng Việt (cần thêm script locale nếu muốn)
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: function(info, successCallback, failureCallback) {
            fetch('/api/appointments')
                .then(res => res.json())
                .then(data => {
                    const events = data.data.map(appt => ({
                        id: appt.id,
                        title: `${appt.nguoi_gui || 'N/A'}: ${appt.title}`,
                        start: appt.appointment_date,
                        backgroundColor: appt.status === 'Chưa xong' ? '#f59e0b' : '#10b981',
                        extendedProps: { note: appt.note }
                    }));
                    successCallback(events);
                });
        }
    });
    calendar.render();
}

// Tải danh sách ứng viên vào dropdown
function loadCandidatesForSelect() {
    fetch('/api/candidates')
        .then(res => res.json())
        .then(data => {
            allCandidates = data.data;
            const select = document.getElementById('apptCandidate');
            allCandidates.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nguoi_gui} (ID: ${c.id})</option>`;
            });
        });
}

// Tải lại lịch hẹn
function loadAppointments() {
    if (calendar) calendar.refetchEvents();
}

// Mở/Đóng Modal
function openAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'flex';
}
function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

// Gửi form thêm lịch
function submitAppointment() {
    const candidateId = document.getElementById('apptCandidate').value;
    const title = document.getElementById('apptTitle').value;
    const date = document.getElementById('apptDate').value;
    const note = document.getElementById('apptNote').value;

    if (!candidateId || !title || !date) {
        alert('Vui lòng điền đầy đủ thông tin!');
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
            alert('✅ Đã thêm lịch hẹn!');
            closeAppointmentModal();
            loadAppointments(); // Tải lại lịch
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    });
}