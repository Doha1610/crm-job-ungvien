from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import os
import sys

# Thêm thư mục backend vào path để import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import database

app = FastAPI(title="CRM Job API")

# Đường dẫn tới thư mục frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

# ==========================================
# CẤU HÌNH PHỤC VỤ FILE TĨNH (CSS, JS)
# ==========================================
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

# Cấu hình template HTML
templates = Jinja2Templates(directory=FRONTEND_DIR)

# ==========================================
# CÁC API (BACKEND)
# ==========================================

@app.get("/api/candidates")
def get_candidates(
    visa: str = Query(None), 
    location: str = Query(None), 
    keyword: str = Query(None)
):
    """API lấy danh sách ứng viên (có bộ lọc)"""
    conn = database.get_connection()
    c = conn.cursor()
    
    query = "SELECT id, nguoi_gui, visa_mong_muon, nganh_nghe, dia_diem, status FROM candidates WHERE 1=1"
    params = []
    
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


# ==========================================
# CÁC ROUTE TRẢ VỀ GIAO DIỆN HTML
# ==========================================

@app.get("/", response_class=HTMLResponse)
def read_dashboard(request: Request):
    """Trang chủ Dashboard"""
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={}
    )

@app.get("/candidates", response_class=HTMLResponse)
def read_candidates_page(request: Request):
    """Trang quản lý ứng viên"""
    return templates.TemplateResponse(
        request=request, 
        name="candidates.html", 
        context={}
    )

@app.get("/kanban", response_class=HTMLResponse)
def read_kanban_page(request: Request):
    """Trang Kanban Board"""
    return templates.TemplateResponse(
        request=request, 
        name="kanban.html", 
        context={}
    )
@app.get("/reports", response_class=HTMLResponse)
def read_reports_page(request: Request):
    """Trang Thống kê"""
    return templates.TemplateResponse(
        request=request, 
        name="reports.html", 
        context={}
    )

# API lấy lịch sử tương tác
@app.get("/api/interactions/{candidate_id}")
def get_interactions(candidate_id: int):
    conn = database.get_connection()
    df = database.get_interaction_history(candidate_id)
    conn.close()
    # Chuyển DataFrame sang list dict để trả về JSON
    if df.empty:
        return {"data": []}
    df['created_at'] = df['created_at'].astype(str)
    return {"data": df.to_dict(orient='records')}

# API thêm ghi chú
class NoteUpdate(BaseModel):
    candidate_id: int
    note_content: str

@app.post("/api/add-note")
def add_note(payload: NoteUpdate):
    try:
        # Cập nhật ghi chú vào bảng candidates
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("UPDATE candidates SET notes = ? WHERE id = ?", (payload.note_content, payload.candidate_id))
        conn.commit()
        conn.close()
        
        # Ghi log
        database.log_interaction(payload.candidate_id, "Thêm ghi chú", "", payload.note_content[:50] + "...")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# API thêm ứng viên mới
class NewCandidate(BaseModel):
    nguoi_gui: str
    visa_mong_muon: str = None
    nganh_nghe: str = None
    dia_diem: str = None
    trinh_do_tieng_nhat: str = None
    gioi_tinh: str = None
    raw_content: str = None
    url_bai_viet: str = None

@app.post("/api/add-candidate")
def add_candidate(payload: NewCandidate):
    try:
        conn = database.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO candidates (nguoi_gui, visa_mong_muon, nganh_nghe, dia_diem, trinh_do_tieng_nhat, gioi_tinh, raw_content, url_bai_viet, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Mới')
        """, (
            payload.nguoi_gui, payload.visa_mong_muon, payload.nganh_nghe, 
            payload.dia_diem, payload.trinh_do_tieng_nhat, payload.gioi_tinh, 
            payload.raw_content, payload.url_bai_viet
        ))
        new_id = c.lastrowid
        conn.commit()
        conn.close()
        
        # Ghi log
        try:
            database.log_interaction(new_id, "Tạo mới", "", "Thêm ứng viên thủ công")
        except:
            pass
            
        return {"status": "success", "message": "Thêm thành công", "id": new_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# ==========================================
# CẤU HÌNH PHỤC VỤ FILE HTML TĨNH (SIDEBAR...)
# LƯU Ý: PHẢI ĐẶT Ở CUỐI CÙNG ĐỂ KHÔNG CHIẾM QUYỀN CÁC ROUTE KHÁC
# ==========================================
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend_static")
