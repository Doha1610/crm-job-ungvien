import streamlit as st
import pandas as pd
import sys
import os

# Thêm thư mục gốc vào path để import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import các hàm từ database và kanban
from src.database import get_connection, update_status, update_notes
from src.kanban import render_kanban

# Cấu hình trang
st.set_page_config(
    page_title="Japan Job CRM",
    page_icon="🇯🇵",
    layout="wide"
)

st.title("🇯🇵 CRM Quản lý Ứng viên đi Nhật")
st.markdown("---")

# Tạo 2 Tab: Bảng dữ liệu và Kanban Board
tab1, tab2, tab3 = st.tabs(["📊 Bảng dữ liệu", "📌 Kanban Board", "📈 Thống kê"])

# ==========================================
# TAB 1: BẢNG DỮ LIỆU VÀ CHI TIẾT
# ==========================================
with tab1:
    @st.cache_data(ttl=30)
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

    # Lọc theo Trạng thái
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
            'status': 'Trạng thái',
            'summary': 'Tóm tắt'
        }
        
        available_columns = [col for col in display_columns.keys() if col in filtered_df.columns]
        display_df = filtered_df[available_columns].copy()
        display_df.columns = [display_columns[col] for col in available_columns]
        
        st.dataframe(display_df, use_container_width=True, height=400)

        # Nút Export CSV
        csv_data = filtered_df.to_csv(index=False).encode('utf-8-sig')
        st.download_button(
            label="📥 Tải xuống danh sách (CSV)",
            data=csv_data,
            file_name=f"ungvien_{pd.Timestamp.now().strftime('%Y%m%d_%H%M')}.csv",
            mime="text/csv",
            type="primary"
        )
        
        # ===== XEM CHI TIẾT =====
        st.markdown("---")
        st.subheader("🔍 Xem chi tiết một ứng viên")
        
        filtered_df['display_label'] = filtered_df.apply(
            lambda r: f"#{r['id']} | {r.get('nguoi_gui', 'Không rõ')} | {r.get('nganh_nghe', 'N/A')} | {r.get('dia_diem', 'N/A')}",
            axis=1
        )
        
        selected_label = st.selectbox("Chọn ứng viên (ID | Tên | Ngành | Địa điểm)", filtered_df['display_label'].tolist())
        
        if selected_label:
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
            
            STATUS_OPTIONS = ["Mới", "Đã liên hệ", "Hẹn phỏng vấn", "Đã phỏng vấn", "Offer", "Đã tuyển", "Từ chối"]
            
            current_status = selected_row.get('status', 'Mới')
            if current_status not in STATUS_OPTIONS:
                current_status = 'Mới'
                
            new_status = st.selectbox("Chọn trạng thái mới", STATUS_OPTIONS, index=STATUS_OPTIONS.index(current_status))
            
            if st.button("💾 Lưu trạng thái", type="primary"):
                update_status(candidate_id, new_status)
                st.success(f"✅ Đã cập nhật ứng viên #{candidate_id} → {new_status}")
                st.cache_data.clear()
                st.rerun()
                
            # ===== GHI CHÚ =====
            st.markdown("---")
            st.subheader("📝 Ghi chú nội bộ")
            
            current_notes = selected_row.get('notes', '')
            if pd.isna(current_notes) or current_notes is None:
                current_notes = ''
                
            note_input = st.text_area("Ghi chú cho ứng viên này", value=current_notes, height=100, placeholder="Ví dụ: Đã gọi 2h chiều, hẹn mai phỏng vấn...")
            
            if st.button("💾 Lưu ghi chú", type="primary"):
                update_notes(candidate_id, note_input)
                st.success(f"✅ Đã lưu ghi chú cho ứng viên #{candidate_id}")
                st.cache_data.clear()
                st.rerun()

# ==========================================
# TAB 2: KANBAN BOARD
# ==========================================
with tab2:
    # Gọi hàm render_kanban từ file src/kanban.py
    render_kanban()
# ==========================================
# TAB 3: THỐNG KÊ (ANALYTICS)
# ==========================================
with tab3:
    st.subheader("📈 Thống kê tổng quan")
    
    # Lấy dữ liệu mới nhất (không dùng cache để biểu đồ luôn đúng)
    conn = get_connection()
    df_stats = pd.read_sql_query("SELECT * FROM candidates", conn)
    conn.close()
    
    if df_stats.empty:
        st.info("Chưa có dữ liệu để thống kê.")
    else:
        # Chia làm 2 cột biểu đồ
        col_chart1, col_chart2 = st.columns(2)
        
        with col_chart1:
            st.markdown("**Phân bố Trạng thái ứng viên**")
            # Đếm số lượng theo từng trạng thái
            status_counts = df_stats['status'].value_counts()
            st.bar_chart(status_counts)
            
        with col_chart2:
            st.markdown("**Phân bố Địa điểm**")
            # Đếm số lượng theo địa điểm (lấy top 10 địa điểm nhiều nhất)
            location_counts = df_stats['dia_diem'].value_counts().head(10)
            st.bar_chart(location_counts)
            
        st.markdown("---")
        
        # Biểu đồ thứ 2 (hàng dưới)
        col_chart3, col_chart4 = st.columns(2)
        
        with col_chart3:
            st.markdown("**Phân bố Ngành nghề (Top 10)**")
            industry_counts = df_stats['nganh_nghe'].value_counts().head(10)
            st.bar_chart(industry_counts)
            
        with col_chart4:
            st.markdown("**Phân bố Loại Visa**")
            visa_counts = df_stats['visa_mong_muon'].value_counts()
            st.bar_chart(visa_counts)
            
        st.markdown("---")
        
        # Bảng số liệu tổng hợp
        st.markdown("### 📊 Số liệu chi tiết")
        total = len(df_stats)
        hired = len(df_stats[df_stats['status'] == 'Đã tuyển'])
        rejected = len(df_stats[df_stats['status'] == 'Từ chối'])
        
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Tổng ứng viên", total)
        m2.metric("Đã tuyển", hired, f"{hired/total*100:.1f}%")
        m3.metric("Từ chối", rejected, f"{rejected/total*100:.1f}%")
        m4.metric("Đang xử lý", total - hired - rejected)