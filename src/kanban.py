import streamlit as st
from streamlit_sortables import sort_items
import pandas as pd
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.database import get_connection, update_status

def render_kanban():
    """Hiển thị bảng Kanban kéo thả ứng viên"""
    st.subheader("📌 Bảng Kanban - Quy trình tuyển dụng")
    
    # Lấy dữ liệu
    conn = get_connection()
    df = pd.read_sql_query("SELECT id, nguoi_gui, nganh_nghe, dia_diem, status FROM candidates", conn)
    conn.close()

    # Định nghĩa các cột trạng thái
    STATUS_OPTIONS = ["Mới", "Đã liên hệ", "Hẹn phỏng vấn", "Đã phỏng vấn", "Offer", "Đã tuyển", "Từ chối"]
    
    # Chuẩn bị dữ liệu dưới dạng LIST CÁC DICTIONARY (đúng định dạng thư viện yêu cầu)
    kanban_data = []
    for status in STATUS_OPTIONS:
        # Lọc ứng viên có trạng thái tương ứng
        filtered = df[df['status'] == status] if 'status' in df.columns else pd.DataFrame()
        
        # Tạo label hiển thị cho mỗi thẻ ứng viên
        items = [
            f"#{row['id']} | {row['nguoi_gui']} ({row['nganh_nghe']} - {row['dia_diem']})" 
            for _, row in filtered.iterrows()
        ]
        # Mỗi cột là một dict có 'header' và 'items'
        kanban_data.append({
            'header': status,
            'items': items
        })

    # Hiển thị Kanban và bắt sự kiện kéo thả (Đã bỏ custom_style để tránh lỗi React)
    sorted_data = sort_items(
        kanban_data,
        multi_containers=True,
        key="kanban_board"
    )

    # Xử lý khi có sự thay đổi (kéo thả)
    # Streamlit sẽ rerun, nên ta cần so sánh dữ liệu cũ và mới
    if 'previous_kanban' not in st.session_state:
        st.session_state.previous_kanban = kanban_data

    if sorted_data != st.session_state.previous_kanban:
        # Tìm sự thay đổi
        for container in sorted_data:
            status = container['header']
            items = container['items']
            # Tìm danh sách cũ của cột này
            old_items = []
            for old_container in st.session_state.previous_kanban:
                if old_container['header'] == status:
                    old_items = old_container['items']
                    break
            
            # Tìm item mới được thêm vào cột này
            new_items = [item for item in items if item not in old_items]
            
            if new_items:
                for item in new_items:
                    # Lấy ID từ label (định dạng "#123 | Tên...")
                    try:
                        candidate_id = int(item.split(" | ")[0].replace("#", ""))
                        update_status(candidate_id, status)
                        st.toast(f"✅ Đã chuyển ứng viên #{candidate_id} sang '{status}'")
                    except Exception as e:
                        st.error(f"Lỗi cập nhật: {e}")
        
        st.session_state.previous_kanban = sorted_data
        st.rerun()