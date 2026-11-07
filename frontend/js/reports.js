document.addEventListener("DOMContentLoaded", function() {
    fetch('/api/candidates')
        .then(response => response.json())
        .then(data => {
            const candidates = data.data;
            if (candidates.length === 0) return;

            // Hàm đếm số lượng theo một trường
            function countByField(field) {
                const counts = {};
                candidates.forEach(c => {
                    const val = c[field] || "Không xác định";
                    counts[val] = (counts[val] || 0) + 1;
                });
                return counts;
            }

            // Hàm lấy Top N
            function getTopN(countsObj, n) {
                const sorted = Object.entries(countsObj).sort((a, b) => b[1] - a[1]);
                return sorted.slice(0, n);
            }

            // Màu sắc cho biểu đồ
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

            // 1. Biểu đồ trạng thái (Doughnut)
            const statusCounts = countByField('status');
            new Chart(document.getElementById('statusChart'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: colors,
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 2. Biểu đồ địa điểm (Bar)
            const locationTop = getTopN(countByField('dia_diem'), 10);
            new Chart(document.getElementById('locationChart'), {
                type: 'bar',
                data: {
                    labels: locationTop.map(item => item[0]),
                    datasets: [{
                        label: 'Số lượng',
                        data: locationTop.map(item => item[1]),
                        backgroundColor: '#3b82f6',
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 3. Biểu đồ ngành nghề (Bar)
            const industryTop = getTopN(countByField('nganh_nghe'), 10);
            new Chart(document.getElementById('industryChart'), {
                type: 'bar',
                data: {
                    labels: industryTop.map(item => item[0]),
                    datasets: [{
                        label: 'Số lượng',
                        data: industryTop.map(item => item[1]),
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 4. Biểu đồ visa (Pie)
            const visaCounts = countByField('visa_mong_muon');
            new Chart(document.getElementById('visaChart'), {
                type: 'pie',
                data: {
                    labels: Object.keys(visaCounts),
                    datasets: [{
                        data: Object.values(visaCounts),
                        backgroundColor: colors.slice().reverse(),
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        })
        .catch(error => console.error('Lỗi tải thống kê:', error));
});