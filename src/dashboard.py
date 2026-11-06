import streamlit as st
import pandas as pd
import sys
import os

# Thêm thư mục gốc vào path để import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import thêm hàm update_status từ database
from src.database import get_connection, update_status

# Cấu hình trang
st.set_page_config(
    page_title="Japan Job CRM",
    page_icon="🇯🇵",
    layout="wide"
)

st.title("🇯🇵 CRM Quản lý Ứng viên đi Nhật")
st.markdown("---")


@st.cache_data(ttl=30)  # Cache 30 giây, tự động làm mới
def load_data():
    """Đọc dữ liệu từ database"""
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM candidates", conn)
    conn.close()
    return df


# Đọc dữ liệu
try:
    df = load_data()
except Exception as e:
    st.error(f"❌ Lỗi đọc database: {e}")
    st.stop()

# ===== SIDEBAR FILTERS =====
st.sidebar.header("🔍 Bộ lọc")

# Lọc theo Visa
visa_options = ["Tất cả"] + [v for v in df['visa_mong_muon'].dropna().unique() if v]
visa_filter = st.sidebar.selectbox("Loại Visa", visa_options)

# Lọc theo Địa điểm
location_options = ["Tất cả"] + [l for l in df['dia_diem'].dropna().unique() if l]
location_filter = st.sidebar.selectbox("Địa điểm", location_options)

# Lọc theo Trạng thái (MỚI THÊM)
status_options = ["Tất cả", "Mới", "Đã liên hệ", "Hẹn phỏng vấn", "Đã phỏng vấn", "Offer", "Đã tuyển", "Từ chối"]
status_filter = st.sidebar.selectbox("Trạng thái", status_options)

# Tìm kiếm từ khóa
keyword = st.sidebar.text_input("🔎 Tìm kiếm từ khóa")

# ===== ÁP DỤNG BỘ LỌC =====
filtered_df = df.copy()

if visa_filter != "Tất cả":
    filtered_df = filtered_df[filtered_df['visa_mong_muon'] == visa_filter]

if location_filter != "Tất cả":
    filtered_df = filtered_df[filtered_df['dia_diem'] == location_filter]

# Lọc theo trạng thái (MỚI THÊM)
if status_filter != "Tất cả":
    filtered_df = filtered_df[filtered_df['status'] == status_filter]

if keyword:
    filtered_df = filtered_df[
        filtered_df['raw_content'].str.contains(keyword, case=False, na=False)
    ]

# ===== HIỂN THỊ METRICS =====
col1, col2, col3 = st.columns(3)
col1.metric("📊 Tổng ứng viên", len(df))
col2.metric("✅ Đang hiển thị", len(filtered_df))
col3.metric("🕐 Cập nhật", pd.Timestamp.now().strftime("%H:%M:%S"))

st.markdown("---")

# ===== HIỂN THỊ BẢNG DỮ LIỆU =====
st.subheader(f"📋 Danh sách Ứng viên ({len(filtered_df)} người)")

if filtered_df.empty:
    st.warning("⚠️ Không tìm thấy ứng viên nào phù hợp.")
else:
    # Chọn cột để hiển thị
    display_columns = {
        'nguoi_gui': 'Người đăng',
        'visa_mong_muon': 'Visa',
        'nganh_nghe': 'Ngành nghề',
        'dia_diem': 'Địa điểm',
        'status': 'Trạng thái',  # MỚI THÊM
        'summary': 'Tóm tắt'
    }
    
    # Chỉ lấy cột nào có trong DataFrame
    available_columns = [col for col in display_columns.keys() if col in filtered_df.columns]
    
    display_df = filtered_df[available_columns].copy()
    display_df.columns = [display_columns[col] for col in available_columns]
    
    st.dataframe(
        display_df,
        use_container_width=True,
        height=500
    )
    
    # ===== XEM CHI TIẾT =====
    st.markdown("---")
    st.subheader("🔍 Xem chi tiết một ứng viên")
    
    # Tạo label hiển thị bao gồm ID và các thông tin phân biệt để tránh nhầm lẫn
    filtered_df['display_label'] = filtered_df.apply(
        lambda r: f"#{r['id']} | {r.get('nguoi_gui', 'Không rõ')} | {r.get('nganh_nghe', 'N/A')} | {r.get('dia_diem', 'N/A')}",
        axis=1
    )
    
    selected_label = st.selectbox("Chọn ứng viên (ID | Tên | Ngành | Địa điểm)", filtered_df['display_label'].tolist())
    
    if selected_label:
        # Lấy chính xác dòng dựa vào label duy nhất vừa tạo
        selected_row = filtered_df[filtered_df['display_label'] == selected_label].iloc[0]
        candidate_id = int(selected_row['id'])
        
        st.markdown(f"### 👤 {selected_row.get('nguoi_gui', 'Không rõ')} (ID: {candidate_id})")
        
        col1, col2 = st.columns(2)
        with col1:
            st.write(f"**Visa:** {selected_row.get('visa_mong_muon', 'N/A')}")
            st.write(f"**Ngành nghề:** {selected_row.get('nganh_nghe', 'N/A')}")
            st.write(f"**Địa điểm:** {selected_row.get('dia_diem', 'N/A')}")
        with col2:
            st.write(f"**Tiếng Nhật:** {selected_row.get('trinh_do_tieng_nhat', 'N/A')}")
            st.write(f"**Giới tính:** {selected_row.get('gioi_tinh', 'N/A')}")
        
        st.markdown("**📝 Nội dung gốc:**")
        st.text_area("Nội dung", selected_row.get('raw_content', ''), height=150, disabled=True, label_visibility="collapsed")
        
        if selected_row.get('url_bai_viet'):
            st.markdown(f"**🔗 Link bài viết:** [Xem trên Facebook]({selected_row['url_bai_viet']})")
            
        # ===== CẬP NHẬT TRẠNG THÁI =====
        st.markdown("---")
        st.subheader("🔄 Cập nhật trạng thái ứng viên")
        
        STATUS_OPTIONS = ["Mới", "Đã liên hệ", "Hẹn phỏng vấn", 
                          "Đã phỏng vấn", "Offer", "Đã tuyển", "Từ chối"]
        
        current_status = selected_row.get('status', 'Mới')
        if current_status not in STATUS_OPTIONS:
            current_status = 'Mới'
            
        new_status = st.selectbox(
            "Chọn trạng thái mới",
            STATUS_OPTIONS,
            index=STATUS_OPTIONS.index(current_status)
        )
        
        if st.button("💾 Lưu trạng thái", type="primary"):
            update_status(candidate_id, new_status)
            st.success(f"✅ Đã cập nhật ứng viên #{candidate_id} → {new_status}")
            st.cache_data.clear()
            st.rerun()