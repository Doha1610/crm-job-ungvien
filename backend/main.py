from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import sys
import hashlib
# Thêm thư mục backend vào path để import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import database

app = FastAPI(title="CRM Job API")

# Đường dẫn tới thư mục frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
HR_DIR = os.path.join(FRONTEND_DIR, "hr") # Đường dẫn tới thư mục HR

# ==========================================
# CẤU HÌNH PHỤC VỤ FILE TĨNH (CSS, JS)
# ==========================================
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

# Phục vụ file ảnh từ thư mục gốc
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/logo", StaticFiles(directory=ROOT_DIR), name="logo")

# Cấu hình template HTML (TRỎ VÀO THƯ MỤC HR)
templates = Jinja2Templates(directory=HR_DIR)
admin_templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "admin"))

# ==========================================
# CÁC API (BACKEND)
# ==========================================

@app.get("/api/candidates")
def get_candidates(
    visa: str = Query(None), 
    location: str = Query(None), 
    keyword: str = Query(None),
    time_range: str = Query("all")
):
    """API lấy danh sách ứng viên (có bộ lọc thời gian)"""
    conn = database.get_connection()
    c = conn.cursor()
    
    query = "SELECT id, nguoi_gui, visa_mong_muon, nganh_nghe, dia_diem, status, assigned_to, created_at, phone, address FROM candidates WHERE 1=1"
    params = []
    
    if time_range == "this_month":
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query += " AND created_at >= ?"
        params.append(start_of_month.strftime('%Y-%m-%d %H:%M:%S'))
        
    elif time_range == "last_month":
        now = datetime.now()
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = first_of_this_month - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        query += " AND created_at >= ? AND created_at <= ?"
        params.append(last_month_start.strftime('%Y-%m-%d %H:%M:%S'))
        params.append(last_month_end.strftime('%Y-%m-%d %H:%M:%S'))
        
    elif time_range == "this_year":
        now = datetime.now()
        start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        query += " AND created_at >= ?"
        params.append(start_of_year.strftime('%Y-%m-%d %H:%M:%S'))
    
    if visa and visa != "Tất cả":
        query += " AND visa_mong_muon = ?"
        params.append(visa)
    if location and location != "Tất cả":
        query += " AND dia_diem = ?"
        params.append(location)
    if keyword:
        query += " AND raw_content LIKE ?"
        params.append(f"%{keyword}%")
        
    query += " ORDER BY id DESC"
    
    c.execute(query, params)
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}


@app.get("/api/candidate/{candidate_id}")
def get_candidate_detail(candidate_id: int):
    """API lấy chi tiết một ứng viên theo ID"""
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    columns = [column[0] for column in c.description]
    row = c.fetchone()
    conn.close()
    
    if row:
        return {"data": dict(zip(columns, row))}
    return {"error": "Không tìm thấy ứng viên"}


class StatusUpdate(BaseModel):
    candidate_id: int
    new_status: str

@app.post("/api/update-status")
def update_status_api(payload: StatusUpdate):
    """API cập nhật trạng thái ứng viên"""
    database.update_status(payload.candidate_id, payload.new_status)
    try:
        database.log_interaction(payload.candidate_id, "Đổi trạng thái", "Cũ", payload.new_status)
    except Exception:
        pass
    return {"status": "success", "message": "Cập nhật thành công"}

@app.get("/api/appointments")
def get_appointments():
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT a.id, a.title, a.appointment_date, a.note, a.status, a.candidate_id, c.nguoi_gui 
        FROM appointments a
        LEFT JOIN candidates c ON a.candidate_id = c.id
        ORDER BY a.appointment_date ASC
    """)
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}

class NewAppointment(BaseModel):
    candidate_id: int
    title: str
    appointment_date: str
    note: str = None

@app.post("/api/add-appointment")
def add_appointment(payload: NewAppointment):
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO appointments (candidate_id, title, appointment_date, note)
            VALUES (?, ?, ?, ?)
        """, (payload.candidate_id, payload.title, payload.appointment_date, payload.note))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Thêm lịch hẹn thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# API QUẢN LÝ ĐƠN HÀNG (JOB ORDERS)
# ==========================================

@app.get("/api/job-orders")
def get_job_orders():
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM job_orders ORDER BY id DESC")
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}

class NewJobOrder(BaseModel):
    title: str
    company: str = None
    location: str = None
    industry: str = None
    visa_type: str = None
    salary: str = None
    quota: int = 0

@app.post("/api/add-job-order")
def add_job_order(payload: NewJobOrder):
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO job_orders (title, company, location, industry, visa_type, salary, quota)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (payload.title, payload.company, payload.location, payload.industry, payload.visa_type, payload.salary, payload.quota))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Thêm đơn hàng thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/admin/delete-job-order/{job_id}")
def delete_job_order(job_id: int):
    """Xóa đơn hàng (chỉ Admin)"""
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("DELETE FROM job_orders WHERE id = ?", (job_id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Xóa đơn hàng thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# ==========================================
# CÁC ROUTE TRẢ VỀ GIAO DIỆN HTML (HR)
# ==========================================

@app.get("/", response_class=HTMLResponse)
def read_dashboard(request: Request):
    return RedirectResponse(url="/hr/", status_code=307)

@app.get("/hr/", response_class=HTMLResponse)
def read_hr_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={})

@app.get("/hr/candidates", response_class=HTMLResponse)
def read_candidates_page(request: Request):
    return templates.TemplateResponse(request=request, name="candidates.html", context={})

@app.get("/hr/kanban", response_class=HTMLResponse)
def read_kanban_page(request: Request):
    return templates.TemplateResponse(request=request, name="kanban.html", context={})

@app.get("/hr/reports", response_class=HTMLResponse)
def read_reports_page(request: Request):
    return templates.TemplateResponse(request=request, name="reports.html", context={})

@app.get("/hr/calendar", response_class=HTMLResponse)
def read_calendar_page(request: Request):
    return templates.TemplateResponse(request=request, name="calendar.html", context={})

@app.get("/hr/job_orders", response_class=HTMLResponse)
def read_job_orders_page(request: Request):
    return templates.TemplateResponse(request=request, name="job_orders.html", context={})

# API lấy lịch sử tương tác
@app.get("/api/interactions/{candidate_id}")
def get_interactions(candidate_id: int):
    conn = database.get_connection()
    df = database.get_interaction_history(candidate_id)
    conn.close()
    if df.empty:
        return {"data": []}
    df['created_at'] = df['created_at'].astype(str)
    return {"data": df.to_dict(orient='records')}

class NoteUpdate(BaseModel):
    candidate_id: int
    note_content: str

@app.post("/api/add-note")
def add_note(payload: NoteUpdate):
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("UPDATE candidates SET notes = ? WHERE id = ?", (payload.note_content, payload.candidate_id))
        conn.commit()
        conn.close()
        database.log_interaction(payload.candidate_id, "Thêm ghi chú", "", payload.note_content[:50] + "...")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class NewCandidate(BaseModel):
    nguoi_gui: str
    visa_mong_muon: str = None
    nganh_nghe: str = None
    dia_diem: str = None
    trinh_do_tieng_nhat: str = None
    gioi_tinh: str = None
    raw_content: str = None
    url_bai_viet: str = None
    phone: str = None
    address: str = None

@app.post("/api/add-candidate")
def add_candidate(payload: NewCandidate):
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO candidates (nguoi_gui, visa_mong_muon, nganh_nghe, dia_diem, trinh_do_tieng_nhat, gioi_tinh, raw_content, url_bai_viet, status, phone, address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Mới', ?, ?)
        """, (
            payload.nguoi_gui, payload.visa_mong_muon, payload.nganh_nghe, 
            payload.dia_diem, payload.trinh_do_tieng_nhat, payload.gioi_tinh, 
            payload.raw_content, payload.url_bai_viet, payload.phone, payload.address
        ))
        new_id = c.lastrowid
        conn.commit()
        conn.close()
        try:
            database.log_interaction(new_id, "Tạo mới", "", "Thêm ứng viên thủ công")
        except:
            pass
        return {"status": "success", "message": "Thêm thành công", "id": new_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# API QUẢN LÝ ỨNG TUYỂN (APPLICATIONS)
# ==========================================

@app.get("/api/applications/{job_order_id}")
def get_applications_by_job(job_order_id: int):
    """Lấy danh sách ứng viên đã ứng tuyển vào một đơn hàng"""
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT a.id, a.candidate_id, a.status, a.applied_date, a.result, a.note,
               c.nguoi_gui, c.dia_diem, c.nganh_nghe
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE a.job_order_id = ?
        ORDER BY a.applied_date DESC
    """, (job_order_id,))
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}

class NewApplication(BaseModel):
    candidate_id: int
    job_order_id: int
    note: str = None

@app.post("/api/add-application")
def add_application(payload: NewApplication):
    """Gán ứng viên vào đơn hàng"""
    try:
        conn = database.get_connection()
        c = conn.cursor()
        
        # Kiểm tra xem đã ứng tuyển chưa (tránh trùng lặp)
        c.execute("SELECT id FROM applications WHERE candidate_id = ? AND job_order_id = ?", 
                  (payload.candidate_id, payload.job_order_id))
        if c.fetchone():
            conn.close()
            return {"status": "error", "message": "Ứng viên này đã ứng tuyển vào đơn hàng này rồi!"}
        
        c.execute("""
            INSERT INTO applications (candidate_id, job_order_id, note)
            VALUES (?, ?, ?)
        """, (payload.candidate_id, payload.job_order_id, payload.note))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Gán ứng viên vào đơn hàng thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}



class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(payload: LoginRequest):
    conn = database.get_connection()
    c = conn.cursor()
    
    # Mã hóa mật khẩu để so sánh
    hashed_pass = hashlib.sha256(payload.password.encode()).hexdigest()
    
    c.execute("SELECT id, username, full_name, role FROM users WHERE username = ? AND password = ?", 
              (payload.username, hashed_pass))
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "status": "success",
            "data": {
                "id": user[0],
                "username": user[1],
                "full_name": user[2],
                "role": user[3]
            }
        }
    else:
        return {"status": "error", "message": "Tên đăng nhập hoặc mật khẩu không đúng!"}

@app.get("/login", response_class=HTMLResponse)
def read_login_page(request: Request):
    return admin_templates.TemplateResponse(request=request, name="login.html", context={})

@app.get("/admin/", response_class=HTMLResponse)
def read_admin_dashboard(request: Request):
    # Tạm thời trả về trang login nếu chưa có dashboard, hoặc tạo file index.html trong admin/
    return admin_templates.TemplateResponse(request=request, name="index.html", context={})

# ==========================================
# API THỐNG KÊ CHO ADMIN
# ==========================================

@app.get("/api/admin/stats")
def get_admin_stats():
    conn = database.get_connection()
    c = conn.cursor()
    
    # 1. Tổng số ứng viên
    c.execute("SELECT COUNT(*) FROM candidates")
    total_candidates = c.fetchone()[0]
    
    # 2. Tổng số đơn hàng
    c.execute("SELECT COUNT(*) FROM job_orders")
    total_jobs = c.fetchone()[0]
    
    # 3. Tổng số nhân sự (users)
    c.execute("SELECT COUNT(*) FROM users")
    total_users = c.fetchone()[0]
    
    # 4. Số lượng đã tuyển (trạng thái 'Đã tuyển')
    c.execute("SELECT COUNT(*) FROM candidates WHERE status = 'Đã tuyển'")
    total_hired = c.fetchone()[0]
    
    # 5. Thống kê trạng thái ứng viên (để vẽ biểu đồ)
    c.execute("SELECT status, COUNT(*) FROM candidates GROUP BY status")
    status_counts = dict(c.fetchall())
    
    # 6. Thống kê đơn hàng theo địa điểm (để vẽ biểu đồ)
    c.execute("SELECT location, COUNT(*) FROM job_orders GROUP BY location")
    job_counts = dict(c.fetchall())
    
    conn.close()
    
    return {
        "total_candidates": total_candidates,
        "total_jobs": total_jobs,
        "total_users": total_users,
        "total_hired": total_hired,
        "status_counts": status_counts,
        "job_counts": job_counts
    }

# Thêm vào main.py (dưới API /api/admin/delete-user)

class AssignRequest(BaseModel):
    candidate_id: int
    user_id: int  # ID của nhân viên được gán

# API lấy danh sách tất cả ứng viên (dành riêng cho Admin)
@app.get("/api/admin/all-candidates")
def get_all_candidates_for_admin():
    """Lấy danh sách tất cả ứng viên để phân công"""
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, nguoi_gui, visa_mong_muon, dia_diem, status, assigned_to FROM candidates ORDER BY id DESC")
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}

@app.post("/api/admin/assign")
def assign_candidate(payload: AssignRequest):
    """Gán ứng viên cho nhân viên phụ trách"""
    try:
        conn = database.get_connection()
        c = conn.cursor()
        
        # Lấy tên nhân viên để lưu vào assigned_to (hoặc lưu ID cũng được)
        c.execute("SELECT full_name FROM users WHERE id = ?", (payload.user_id,))
        user = c.fetchone()
        if not user:
            conn.close()
            return {"status": "error", "message": "Không tìm thấy nhân viên!"}
        
        user_name = user[0]
        
        # Cập nhật cột assigned_to trong bảng candidates
        c.execute("UPDATE candidates SET assigned_to = ? WHERE id = ?", (user_name, payload.candidate_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Đã gán cho {user_name}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# API BÁO CÁO & THỐNG KÊ CHO ADMIN
# ==========================================

@app.get("/api/admin/reports")
def get_admin_reports():
    """Lấy dữ liệu thống kê cho báo cáo Admin"""
    conn = database.get_connection()
    c = conn.cursor()
    
    # 1. Thống kê hiệu suất nhân viên (số ứng viên được gán)
    c.execute("""
        SELECT u.full_name, u.role, COUNT(c.id) as total_assigned
        FROM users u
        LEFT JOIN candidates c ON u.full_name = c.assigned_to
        GROUP BY u.id
        ORDER BY total_assigned DESC
    """)
    staff_performance = [{"name": row[0], "role": row[1], "total": row[2]} for row in c.fetchall()]
    
    # 2. Thống kê trạng thái ứng viên (Pie chart)
    c.execute("SELECT status, COUNT(*) FROM candidates GROUP BY status")
    status_counts = dict(c.fetchall())
    
    # 3. Thống kê đơn hàng theo địa điểm (Bar chart)
    c.execute("SELECT location, COUNT(*) FROM job_orders GROUP BY location")
    job_counts = dict(c.fetchall())
    
    # 4. Tỷ lệ chuyển đổi (Conversion Rate)
    c.execute("SELECT COUNT(*) FROM candidates")
    total_candidates = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM candidates WHERE status = 'Đã tuyển'")
    total_hired = c.fetchone()[0]
    conversion_rate = (total_hired / total_candidates * 100) if total_candidates > 0 else 0
    
    conn.close()
    
    return {
        "staff_performance": staff_performance,
        "status_counts": status_counts,
        "job_counts": job_counts,
        "conversion_rate": round(conversion_rate, 1)
    }

@app.get("/admin/leads", response_class=HTMLResponse)
def read_admin_leads(request: Request):
    return admin_templates.TemplateResponse(request=request, name="leads.html", context={})

@app.get("/api/admin/users")
def get_all_users():
    """Lấy danh sách tất cả người dùng"""
    conn = database.get_connection()
    c = conn.cursor()
    # THÊM is_active VÀO CÂU QUERY
    c.execute("SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY id DESC")
    columns = [column[0] for column in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]
    conn.close()
    return {"data": results}

class ToggleStatusRequest(BaseModel):
    user_id: int
    is_active: bool

@app.post("/api/admin/toggle-user-status")
def toggle_user_status(payload: ToggleStatusRequest):
    """Khóa hoặc mở khóa tài khoản người dùng"""
    try:
        conn = database.get_connection()
        c = conn.cursor()
        
        # Không cho phép khóa tài khoản admin gốc
        c.execute("SELECT username FROM users WHERE id = ?", (payload.user_id,))
        user = c.fetchone()
        if user and user[0] == 'admin':
            conn.close()
            return {"status": "error", "message": "Không thể khóa tài khoản Admin gốc!"}
        
        status_value = 1 if payload.is_active else 0
        c.execute("UPDATE users SET is_active = ? WHERE id = ?", (status_value, payload.user_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Cập nhật trạng thái thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class ResetPasswordRequest(BaseModel):
    user_id: int
    new_password: str

@app.post("/api/admin/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """Đặt lại mật khẩu cho người dùng"""
    try:
        conn = database.get_connection()
        c = conn.cursor()
        hashed_pass = database.hash_password(payload.new_password)
        c.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_pass, payload.user_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Đặt lại mật khẩu thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/login")
def login(payload: LoginRequest):
    conn = database.get_connection()
    c = conn.cursor()
    
    hashed_pass = hashlib.sha256(payload.password.encode()).hexdigest()
    
    # THÊM is_active VÀO CÂU QUERY
    c.execute("SELECT id, username, full_name, role, is_active FROM users WHERE username = ? AND password = ?", 
              (payload.username, hashed_pass))
    user = c.fetchone()
    conn.close()
    
    if user:
        if user[4] == 0:  # Nếu is_active = 0
            return {"status": "error", "message": "Tài khoản đã bị khóa!"}
        
        return {
            "status": "success",
            "data": {
                "id": user[0],
                "username": user[1],
                "full_name": user[2],
                "role": user[3]
            }
        }
    else:
        return {"status": "error", "message": "Tên đăng nhập hoặc mật khẩu không đúng!"}

@app.get("/admin/users", response_class=HTMLResponse)
def read_admin_users(request: Request):
    return admin_templates.TemplateResponse(request=request, name="users.html", context={})

@app.get("/admin/job_orders", response_class=HTMLResponse)
def read_admin_job_orders(request: Request):
    return admin_templates.TemplateResponse(request=request, name="job_orders.html", context={})

@app.get("/admin/assignments", response_class=HTMLResponse)
def read_admin_assignments(request: Request):
    return admin_templates.TemplateResponse(request=request, name="assignments.html", context={})

@app.get("/admin/reports", response_class=HTMLResponse)
def read_admin_reports(request: Request):
    return admin_templates.TemplateResponse(request=request, name="reports.html", context={})
# ==========================================
# CẤU HÌNH PHỤC VỤ FILE HTML TĨNH (SIDEBAR...)
# ==========================================
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend_static")