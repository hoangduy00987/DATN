/** Trang gốc — middleware xử lý redirect theo cookie; file này tránh lỗi khi điều hướng client tới `/`. */
export default function HomePage() {
    return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
            Đang chuyển hướng…
        </div>
    );
}
