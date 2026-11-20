# 🚀 HelloJob CRM - Hệ thống Quản lý Ứng viên Tự động

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![SQLite](https://img.shields.io/badge/Database-SQLite-lightgrey.svg)
![HTML/CSS/JS](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-orange.svg)

## 📖 Giới thiệu
**HelloJob CRM** là một hệ thống quản lý ứng viên (ATS - Applicant Tracking System) dành riêng cho thị trường lao động Nhật Bản. Hệ thống được thiết kế để tự động hóa quy trình từ khâu thu thập dữ liệu (crawl từ Facebook) đến khâu quản lý, chăm sóc và theo dõi trạng thái ứng viên của bộ phận HR.

Dự án được xây dựng với kiến trúc tách biệt hoàn toàn giữa Backend (FastAPI) và Frontend (HTML/JS thuần), giúp dễ dàng bảo trì và mở rộng.

## ✨ Tính năng nổi bật

### 🎯 Dành cho HR / Quản lý tuyển dụng
- **Dashboard trực quan:** Thống kê nhanh số lượng ứng viên theo trạng thái (Mới, Đã liên hệ, Tiềm năng, Đã tuyển).
- **Quản lý trạng thái (Pipeline):** Cập nhật trạng thái ứng viên trực tiếp trên bảng danh sách.
- **Tìm kiếm & Lọc thông minh:** Lọc ứng viên theo Visa, Địa điểm, Trạng thái; tìm kiếm theo Tên, Số điện thoại, Ngành nghề.
- **Xem chi tiết:** Xem toàn bộ thông tin ứng viên, bao gồm cả số điện thoại, địa chỉ và link bài viết gốc.
- **Lịch sử chăm sóc (Timeline):** Ghi lại tự động mọi thao tác thay đổi trạng thái, ghi chú để HR nắm được lịch sử.
- **Xuất dữ liệu:** Xuất danh sách ứng viên ra file CSV (tương thích Excel).

### ⚙️ Dành cho Quản trị viên / Kỹ thuật
- **RESTful API:** Cung cấp đầy đủ các API để thao tác với dữ liệu.
- **Tự động nâng cấp Database:** Các script tự động kiểm tra và thêm cột mới (status, notes, assigned_to...) nếu chưa có, giúp tránh lỗi khi nâng cấp phiên bản.
- **Kiến trúc tách biệt:** Dễ dàng thay thế Frontend (ví dụ: chuyển sang React/Vue) mà không cần sửa Backend.

## 🛠️ Công nghệ sử dụng
- **Backend:** Python, FastAPI, Pydantic, Uvicorn.
- **Database:** SQLite (Dùng chung với module Crawler).
- **Frontend:** HTML5, CSS3, JavaScript (ES6+).
- **Thư viện khác:** Jinja2 (Render HTML), Python-dotenv (Quản lý biến môi trường).

## 📂 Cấu trúc thư mục
```text
crm-job-ungvien/
│
├── backend/                  # Chứa toàn bộ logic máy chủ
│   ├── main.py               # Khởi tạo FastAPI, định nghĩa các API routes
│   ├── database.py           # Xử lý kết nối, truy vấn và nâng cấp DB
│   └── __init__.py
│
├── frontend/                 # Chứa giao diện người dùng
│   ├── css/                  # Chứa các file style
│   ├── js/                   # Chứa logic xử lý giao diện (candidates.js, sidebar.js...)
│   ├── candidates.html       # Trang quản lý danh sách ứng viên
│   ├── calendar.html         # Trang lịch hẹn (đang phát triển)
│   ├── kanban.html           # Trang Kanban (đang phát triển)
│   ├── index.html            # Trang Dashboard chính
│   └── reports.html          # Trang báo cáo (đang phát triển)
│
├── .env                      # Biến môi trường (chứa DB_PATH)
├── .gitignore                # Các file không đưa lên Git
├── README.md                 # Tài liệu dự án
└── requirements.txt          # Danh sách thư viện Python cần thiết
```
🚀 Hướng dẫn cài đặt và chạy dự án
1. Yêu cầu hệ thống
Python 3.9 trở lên.

Đã cài đặt Git (nếu clone từ repository).

2. Cài đặt môi trường
bash
# Clone dự án (nếu có)
git clone <link-github-cua-ban>
cd crm-job-ungvien

# Tạo môi trường ảo (khuyên dùng)
python -m venv .venv

# Kích hoạt môi trường ảo
# Trên Windows:
.venv\Scripts\activate
# Trên Mac/Linux:
source .venv/bin/activate

# Cài đặt các thư viện
pip install -r requirements.txt
3. Cấu hình biến môi trường
Tạo file .env ở thư mục gốc (nếu chưa có) và trỏ đến đường dẫn Database SQLite của bạn:

env
DB_PATH=D:\shared_data\jobs.db
4. Khởi chạy Server
bash
uvicorn backend.main:app --reload
5. Truy cập ứng dụng
Mở trình duyệt và truy cập: http://127.0.0.1:8000/candidates

🗺️ Lộ trình phát triển (Roadmap)
☑ Kết nối Database, xây dựng API lấy danh sách.
☑ Giao diện danh sách, xem chi tiết và cập nhật trạng thái.
☑ Bộ lọc tìm kiếm theo Visa, Địa điểm, Trạng thái.
☑ Tính năng xuất file CSV.
□ Tính năng Ghi chú (Notes): Thêm ô nhập ghi chú cho HR.
□ Giao diện Kanban: Kéo thả ứng viên giữa các cột trạng thái.
□ Trang Lịch hẹn: Hiển thị lịch hẹn phỏng vấn lên FullCalendar.
□ Báo cáo (Reports): Vẽ biểu đồ thống kê ứng viên.
□ Authentication: Thêm màn hình đăng nhập và phân quyền.
□ Tự động hóa: Gửi email/Zalo tự động khi đổi trạng thái.


