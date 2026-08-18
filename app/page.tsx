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

  // Lưu trạng thái Like tạm thời trên giao diện
  const [likedImages, setLikedImages] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  // Ảnh đang mở phần bình luận
  const [commentImage, setCommentImage] = useState<number | null>(null);

  // Lấy danh sách ảnh từ Database
  const fetchImages = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setImages(data);
      }
    } catch (error: any) {
      console.error("Lỗi lấy danh sách ảnh:", error);
      alert("Lỗi lấy danh sách ảnh: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Xử lý Like
  const handleLike = (id?: number) => {
    if (!id) return;

    const alreadyLiked = likedImages.includes(id);

    if (alreadyLiked) {
      setLikedImages((prev) =>
        prev.filter((imageId) => imageId !== id)
      );

      setLikeCounts((prev) => ({
        ...prev,
        [id]: Math.max((prev[id] || 1) - 1, 0),
      }));
    } else {
      setLikedImages((prev) => [...prev, id]);

      setLikeCounts((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
    }
  };

  // Làm sạch tên file
  const createSafeFileName = (originalName: string) => {
    const parts = originalName.split(".");

    const extension =
      parts.length > 1
        ? parts[parts.length - 1]
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase()
        : "jpg";

    const nameWithoutExtension = parts
      .slice(0, -1)
      .join(".")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

    const safeName = nameWithoutExtension || "image";

    return `${Date.now()}_${safeName}.${extension || "jpg"}`;
  };

  // Upload ảnh
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const originalFile = e.target.files?.[0];

    // Reset input
    e.target.value = "";

    if (!originalFile) {
      return;
    }

    try {
      setUploading(true);

      // Kiểm tra file có phải ảnh không
      if (!originalFile.type.startsWith("image/")) {
        throw new Error("Vui lòng chọn một file ảnh.");
      }

      // Giới hạn 10MB
      if (originalFile.size > 10 * 1024 * 1024) {
        throw new Error("Ảnh không được lớn hơn 10MB.");
      }

      // Tạo tên file an toàn
      const fileName = createSafeFileName(originalFile.name);

      console.log("Tên file upload:", fileName);

      // Upload lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, originalFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: originalFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Lấy URL công khai
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error("Không lấy được đường dẫn ảnh.");
      }

      // Tên hiển thị giữ nguyên tên gốc
      const originalTitle =
        originalFile.name.replace(/\.[^/.]+$/, "") ||
        "Khoảnh khắc mới";

      // Lưu thông tin vào Database
      const { data: dbData, error: dbError } = await supabase
        .from("images")
        .insert([
          {
            name: fileName,
            url: urlData.publicUrl,
            title: originalTitle,
            author: "Người dùng VietAnh",
          },
        ])
        .select();

      if (dbError) {
        // Nếu Database lỗi thì xóa ảnh vừa upload
        await supabase.storage
          .from("images")
          .remove([fileName]);

        throw dbError;
      }

      if (dbData && dbData.length > 0) {
        setImages((prev) => [dbData[0], ...prev]);
      }

      alert("Tải ảnh lên thành công!");
    } catch (error: any) {
      console.error("Lỗi upload:", error);

      alert(
        "Lỗi tải ảnh: " +
          (error?.message || "Không xác định được lỗi.")
      );
    } finally {
      setUploading(false);
    }
  };

  // Xóa ảnh
  const handleDelete = async (
    id?: number,
    fileName?: string
  ) => {
    if (!id || !fileName) {
      return;
    }

    const confirmed = confirm(
      "Bạn có chắc chắn muốn xóa ảnh này?"
    );

    if (!confirmed) {
      return;
    }

    try {
      // Xóa file trong Storage
      const { error: storageError } = await supabase.storage
        .from("images")
        .remove([fileName]);

      if (storageError) {
        throw storageError;
      }

      // Xóa Database
      const { error: dbError } = await supabase
        .from("images")
        .delete()
        .eq("id", id);

      if (dbError) {
        throw dbError;
      }

      // Cập nhật giao diện
      setImages((prev) =>
        prev.filter((img) => img.id !== id)
      );

      // Xóa trạng thái Like của ảnh
      setLikedImages((prev) =>
        prev.filter((imageId) => imageId !== id)
      );

      setLikeCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[id];
        return newCounts;
      });

      // Đóng bình luận nếu đang mở
      if (commentImage === id) {
        setCommentImage(null);
      }

      alert("Xóa ảnh thành công!");
    } catch (error: any) {
      console.error("Lỗi xóa ảnh:", error);

      alert(
        "Lỗi xóa ảnh: " +
          (error?.message || "Không xác định được lỗi.")
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          backgroundColor: "#fff",
          padding: "20px 80px",
          borderBottom: "1px solid #e9ecef",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "bold",
          }}
        >
          VietAnh Gallery
        </h1>
      </header>

      {/* MAIN */}
      <main
        style={{
          maxWidth: "1000px",
          margin: "40px auto",
          padding: "0 20px",
        }}
      >
        {/* TITLE + UPLOAD */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "30px",
            gap: "20px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                margin: "0 0 10px 0",
              }}
            >
              Ảnh đã tải lên
            </h2>

            <p
              style={{
                color: "#6c757d",
                margin: 0,
              }}
            >
              Kho ảnh lưu trữ cố định
            </p>
          </div>

          {/* NÚT UPLOAD */}
          <label
            style={{
              backgroundColor: uploading ? "#555" : "#000",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontWeight: "500",
              whiteSpace: "nowrap",
            }}
          >
            {uploading ? "Đang tải..." : "+ Tải ảnh mới"}

            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              style={{
                display: "none",
              }}
            />
          </label>
        </div>

        {/* DANH SÁCH ẢNH */}
        {loading ? (
          <p
            style={{
              color: "#6c757d",
            }}
          >
            Đang tải danh sách ảnh...
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {images.map((img) => {
              const id = img.id;

              const isLiked =
                id !== undefined && likedImages.includes(id);

              const likes =
                id !== undefined
                  ? likeCounts[id] || 0
                  : 0;

              const isCommentOpen =
                id !== undefined && commentImage === id;

              return (
                <div
                  key={img.id || img.name}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* ẢNH */}
                  <div
                    style={{
                      height: "280px",
                      overflow: "hidden",
                      backgroundColor: "#e9ecef",
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  {/* THÔNG TIN */}
                  <div
                    style={{
                      padding: "16px",
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }}
                      >
                        {img.title}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 14px 0",
                          color: "#6c757d",
                          fontSize: "14px",
                        }}
                      >
                        {img.author}
                      </p>
                    </div>

                    {/* LIKE + BÌNH LUẬN */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        borderTop: "1px solid #eee",
                        borderBottom: "1px solid #eee",
                        padding: "10px 0",
                        marginBottom: "12px",
                      }}
                    >
                      {/* NÚT LIKE */}
                      <button
                        type="button"
                        onClick={() => handleLike(id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "15px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "22px",
                          }}
                        >
                          {isLiked ? "❤️" : "🤍"}
                        </span>

                        <span>
                          {likes > 0 ? likes : "Thích"}
                        </span>
                      </button>

                      {/* NÚT BÌNH LUẬN */}
                      <button
                        type="button"
                        onClick={() => {
                          if (id !== undefined) {
                            setCommentImage(
                              commentImage === id ? null : id
                            );
                          }
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "15px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "21px",
                          }}
                        >
                          💬
                        </span>

                        <span>Bình luận</span>
                      </button>
                    </div>

                    {/* KHUNG BÌNH LUẬN */}
                    {isCommentOpen && (
                      <div
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderRadius: "10px",
                          padding: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "14px",
                            color: "#6c757d",
                          }}
                        >
                          Bình luận về ảnh
                        </p>

                        <input
                          type="text"
                          placeholder="Viết bình luận..."
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "9px 10px",
                            outline: "none",
                            backgroundColor: "#fff",
                          }}
                        />
                      </div>
                    )}

                    {/* NÚT XÓA */}
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(img.id, img.name)
                      }
                      style={{
                        backgroundColor: "#fff0f0",
                        color: "#dc3545",
                        border: "1px solid #ffcdd2",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        width: "100%",
                      }}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              );
            })}

            {/* CHƯA CÓ ẢNH */}
            {images.length === 0 && (
              <div
                style={{
                  backgroundColor: "#e9ecef",
                  borderRadius: "16px",
                  height: "360px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6c757d",
                  gridColumn: "1 / -1",
                }}
              >
                Chưa có ảnh nào trong bộ sưu tập
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}