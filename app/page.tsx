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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      const titleName = file.name.split(".")[0] || "Khoảnh khắc mới";

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

      alert("Tải ảnh lên thành công!");
    } catch (error: any) {
      alert("Lỗi tải ảnh: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "sans-serif" }}>
      <header style={{ backgroundColor: "#fff", padding: "20px 80px", borderBottom: "1px solid #e9ecef" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>VietAnh Gallery</h1>
      </header>

      <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
          <div>
            <h2 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 10px 0" }}>Ảnh đã tải lên</h2>
            <p style={{ color: "#6c757d", margin: 0 }}>Kho ảnh lưu trữ cố định</p>
          </div>

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

        {loading ? (
          <p style={{ color: "#6c757d" }}>Đang tải danh sách ảnh...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {images.map((img) => (
              <div key={img.id || img.name} style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}>
                <div style={{ height: "280px", overflow: "hidden", backgroundColor: "#e9ecef" }}>
                  <img src={img.url} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "16px" }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold" }}>{img.title}</h3>
                  <p style={{ margin: 0, color: "#6c757d", fontSize: "14px" }}>{img.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}