import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

# Đường dẫn database lấy từ file .env (nằm ở thư mục shared_data)
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
    """Cập nhật trạng thái ứng viên theo ID (ID là duy nhất, không sợ nhầm)."""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "UPDATE candidates SET status = ? WHERE id = ?",
        (new_status, candidate_id)
    )
    conn.commit()
    conn.close()
    return True


def add_status_column_if_not_exists():
    """Tự động thêm cột status nếu chưa có (để fix lỗi chưa lưu ALTER TABLE)."""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'Mới';")
        conn.commit()
        print("✅ Đã thêm cột 'status' vào Database thành công!")
    except sqlite3.OperationalError as e:
        # Nếu cột đã tồn tại, SQLite sẽ báo lỗi, ta bỏ qua
        if "duplicate column name" in str(e):
            print("ℹ️ Cột 'status' đã tồn tại sẵn trong Database.")
        else:
            print(f"❌ Lỗi: {e}")
    finally:
        conn.close()


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


if __name__ == "__main__":
    # 1. Test kết nối cơ bản
    test_connection()
    
    # 2. Tự động kiểm tra và thêm cột status nếu thiếu
    add_status_column_if_not_exists()
    
    # 3. Test tính năng update (Sẽ chạy được sau khi cột status được thêm ở bước 2)
    # Lưu ý: Bạn có thể đổi số 1 thành ID thực tế của ứng viên bạn muốn test
    print("\n--- Test cập nhật trạng thái ---")
    update_status(1, "Đã liên hệ")
    print("✅ Đã chạy test update_status thành công! (Ứng viên ID=1 đã đổi thành 'Đã liên hệ')")