import sqlite3
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# Đường dẫn database lấy từ file .env
DB_PATH = os.getenv("DB_PATH", r"D:\shared_data\jobs.db")


def get_connection():
    """Kết nối đến database chung"""
    return sqlite3.connect(DB_PATH)


def get_all_candidates():
    """Lấy tất cả ứng viên"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM candidates ORDER BY id DESC")
    results = c.fetchall()
    conn.close()
    return results


def search_candidates(keyword=None, visa=None, location=None):
    """Tìm kiếm ứng viên theo bộ lọc"""
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM candidates WHERE 1=1"
    params = []
    if keyword:
        query += " AND raw_content LIKE ?"
        params.append(f"%{keyword}%")
    if visa:
        query += " AND visa_mong_muon LIKE ?"
        params.append(f"%{visa}%")
    if location:
        query += " AND dia_diem LIKE ?"
        params.append(f"%{location}%")
    c.execute(query, params)
    results = c.fetchall()
    conn.close()
    return results


def update_status(candidate_id, new_status):
    """Cập nhật trạng thái ứng viên theo ID."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE candidates SET status = ? WHERE id = ?", (new_status, candidate_id))
    conn.commit()
    conn.close()
    return True


def update_notes(candidate_id, new_notes):
    """Cập nhật ghi chú cho ứng viên theo ID."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE candidates SET notes = ? WHERE id = ?", (new_notes, candidate_id))
    conn.commit()
    conn.close()
    return True

def add_assigned_column_if_not_exists():
    """Tự động thêm cột assigned_to nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN assigned_to TEXT DEFAULT '';")
        conn.commit()
        print("✅ Đã thêm cột 'assigned_to' vào Database thành công!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'assigned_to' đã tồn tại sẵn.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()

def update_assigned_to(candidate_id, assigned_to):
    """Cập nhật người phụ trách cho ứng viên"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE candidates SET assigned_to = ? WHERE id = ?", (assigned_to, candidate_id))
    conn.commit()
    conn.close()
    return True

def add_status_column_if_not_exists():
    """Tự động thêm cột status nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'Mới';")
        conn.commit()
        print("✅ Đã thêm cột 'status' vào Database thành công!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'status' đã tồn tại sẵn trong Database.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()


def add_notes_column_if_not_exists():
    """Tự động thêm cột notes nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN notes TEXT DEFAULT '';")
        conn.commit()
        print("✅ Đã thêm cột 'notes' vào Database thành công!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'notes' đã tồn tại sẵn trong Database.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()


# ===== HÀM MỚI: THÊM CỘT created_at =====
def add_created_at_column():
    """Thêm cột created_at nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
        conn.commit()
        print("✅ Đã thêm cột 'created_at' vào Database!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'created_at' đã tồn tại.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()
# =========================================


def create_interaction_log_table():
    """Tạo bảng lịch sử tương tác nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS interaction_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER,
            action TEXT,
            old_value TEXT,
            new_value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Bảng 'interaction_log' đã sẵn sàng!")


def log_interaction(candidate_id, action, old_value=None, new_value=None):
    """Ghi lại lịch sử tương tác"""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO interaction_log (candidate_id, action, old_value, new_value) VALUES (?, ?, ?, ?)",
        (candidate_id, action, old_value, new_value)
    )
    conn.commit()
    conn.close()


def get_interaction_history(candidate_id):
    """Lấy lịch sử tương tác của một ứng viên"""
    conn = get_connection()
    df = pd.read_sql_query(
        "SELECT action, old_value, new_value, created_at FROM interaction_log WHERE candidate_id = ? ORDER BY created_at DESC",
        conn, params=(candidate_id,)
    )
    conn.close()
    return df


def test_connection():
    """Test kết nối database"""
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM candidates")
        count = c.fetchone()[0]
        conn.close()
        print(f"✅ Kết nối thành công! Tổng số ứng viên: {count}")
        return True
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        return False

def create_appointments_table():
    """Tạo bảng lịch hẹn nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER,
            title TEXT,
            appointment_date TIMESTAMP,
            note TEXT,
            status TEXT DEFAULT 'Chưa xong',
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Bảng 'appointments' đã sẵn sàng!")

def add_contact_columns_if_not_exists():
    """Thêm cột phone và address nếu chưa có"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN phone TEXT DEFAULT '';")
        c.execute("ALTER TABLE candidates ADD COLUMN address TEXT DEFAULT '';")
        conn.commit()
        print("✅ Đã thêm cột 'phone' và 'address' vào Database!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'phone' hoặc 'address' đã tồn tại.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()
if __name__ == "__main__":
    test_connection()
    add_status_column_if_not_exists()
    add_notes_column_if_not_exists()
    add_assigned_column_if_not_exists()  
    add_created_at_column()  # <-- THÊM DÒNG NÀY
    create_interaction_log_table()
    create_appointments_table()
    add_contact_columns_if_not_exists()
    print("\n--- Test cập nhật trạng thái ---")
    update_status(1, "Đã liên hệ")
    print("✅ Đã chạy test update_status thành công!")