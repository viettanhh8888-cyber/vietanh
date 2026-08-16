"use client";

import { useState } from "react";
// Import biến supabase vừa tạo ở bước trước
import { supabase } from "@/lib/supabaseClient";

export default function UploadModal() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = e.target.files?.[0];
      if (!file) return;

      // Tạo tên file ngẫu nhiên để tránh bị trùng lặp
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Tải file ảnh lên Bucket tên là "images" trên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images") // Tên bucket bạn đã tạo trên Supabase
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Lấy link URL công khai của ảnh vừa tải lên
      const { data } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // 3. Lưu link ảnh vào State để hiển thị ra màn hình
      setImageUrl(data.publicUrl);
      alert("Tải ảnh lên Supabase thành công!");

    } catch (error: any) {
      alert("Lỗi tải ảnh: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Đồng bộ dữ liệu ảnh</h3>

      {/* Nút chọn ảnh */}
      <input
        type="file"
        accept="image/*"
        onChange={handleUploadImage}
        disabled={uploading}
      />

      {uploading && <p>Đang tải ảnh lên Supabase...</p>}

      {/* Hiển thị ảnh sau khi tải lên thành công */}
      {imageUrl && (
        <div style={{ marginTop: 20 }}>
          <p>Link ảnh đồng bộ công khai:</p>
          <a href={imageUrl} target="_blank" rel="noreferrer">
            {imageUrl}
          </a>
          <br />
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{ maxWidth: "300px", marginTop: "10px", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
}