"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ImageItem {
  id?: number;
  name: string;
  url: string;
  title: string;
  author: string;
}

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Tự động tải danh sách ảnh từ Database khi mở trang (hoặc F5)
  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setImages(data);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách ảnh:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // 2. Xử lý Tải ảnh mới lên Storage VÀ lưu vào Database
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // a. Upload file lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // b. Lấy URL công khai
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      const titleName = file.name.split(".")[0] || "Khoảnh khắc mới";

      // c. Lưu thông tin ảnh vào Database
      const { data: dbData, error: dbError } = await supabase
        .from("images")
        .insert([
          {
            name: fileName,
            url: urlData.publicUrl,
            title: titleName,
            author: "Người dùng VietAnh",
          },
        ])
        .select();

      if (dbError) throw dbError;

      if (dbData) {
        setImages((prev) => [dbData[0], ...prev]);
      }

      alert("Tải ảnh và lưu dữ liệu thành công!");
    } catch (error: any) {
      alert("Lỗi tải ảnh: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 3. Xử lý Xóa ảnh khỏi Storage VÀ Database
  const handleDelete = async (id?: number, fileName?: string) => {
    if (!id || !fileName) return;
    if (!confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;

    try {
      // a. Xóa ảnh trên Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("images")
        .remove([fileName]);

      if (storageError) throw storageError;

      // b. Xóa dữ liệu ảnh trong Database
      const { error: dbError } = await supabase
        .from("images")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // c. Cập nhật lại giao diện
      setImages((prev) => prev.filter((img) => img.id !== id));
      alert("Xóa ảnh thành công!");
    } catch (error: any) {
      alert("Lỗi xóa ảnh: " + error.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "sans-serif" }}>
      {/* Header VietAnh */}
      <header style={{ backgroundColor: "#fff", padding: "20px 80px", borderBottom: "1px solid #e9ecef" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>VietAnh</h1>
      </header>

      {/* Nội dung chính */}
      <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
          <div>
            <h2 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 10px 0" }}>Ảnh mới nhất</h2>
            <p style={{ color: "#6c757d", margin: 0 }}>Chia sẻ những khoảnh khắc của bạn</p>
          </div>

          {/* Nút Chọn Ảnh */}
          <label style={{
            backgroundColor: "#000",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500"
          }}>
            {uploading ? "Đang tải..." : "+ Tải ảnh mới"}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>

        {/* Lưới hiển thị danh sách ảnh */}
        {loading ? (
          <p style={{ color: "#6c757d" }}>Đang tải danh sách ảnh từ máy chủ...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {images.map((img) => (
              <div key={img.id || img.name} style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ height: "280px", overflow: "hidden", backgroundColor: "#e9ecef" }}>
                  <img src={img.url} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                
                <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold" }}>{img.title}</h3>
                    <p style={{ margin: "0 0 12px 0", color: "#6c757d", fontSize: "14px" }}>{img.author}</p>
                  </div>

                  {/* Nút Xóa Ảnh */}
                  <button
                    onClick={() => handleDelete(img.id, img.name)}
                    style={{
                      backgroundColor: "#fff0f0",
                      color: "#dc3545",
                      border: "1px solid #ffcdd2",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      width: "100%"
                    }}
                  >
                    Xóa ảnh
                  </button>
                </div>
              </div>
            ))}

            {/* Hiển thị ô trống khi chưa có ảnh nào */}
            {images.length === 0 && (
              <div style={{
                backgroundColor: "#e9ecef",
                borderRadius: "16px",
                height: "360px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c757d"
              }}>
                Chưa có ảnh
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}