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

interface LikeItem {
  id: number;
  image_id: number;
  user_name: string;
}

interface CommentItem {
  id: number;
  image_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // LIKE
  const [likedImages, setLikedImages] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  // COMMENT
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentImage, setCommentImage] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // =========================================================
  // LẤY DANH SÁCH ẢNH
  // =========================================================

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

      alert(
        "Lỗi lấy danh sách ảnh: " +
          (error?.message || "Không xác định được lỗi.")
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LẤY LIKE + COMMENT
  // =========================================================

  const fetchLikesAndComments = async () => {
    try {
      // Lấy likes
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("*");

      if (likesError) {
        throw likesError;
      }

      if (likesData) {
        const counts: Record<number, number> = {};
        const liked: number[] = [];

        likesData.forEach((like: LikeItem) => {
          counts[like.image_id] =
            (counts[like.image_id] || 0) + 1;

          // Người dùng hiện tại được tạm xác định bằng user_name
          if (like.user_name === "Người dùng VietAnh") {
            liked.push(like.image_id);
          }
        });

        setLikeCounts(counts);
        setLikedImages(liked);
      }

      // Lấy comments
      const { data: commentsData, error: commentsError } =
        await supabase
          .from("comments")
          .select("*")
          .order("created_at", { ascending: true });

      if (commentsError) {
        throw commentsError;
      }

      if (commentsData) {
        setComments(commentsData);
      }
    } catch (error: any) {
      console.error("Lỗi lấy Like/Bình luận:", error);

      alert(
        "Lỗi lấy Like/Bình luận: " +
          (error?.message || "Không xác định được lỗi.")
      );
    }
  };

  useEffect(() => {
    fetchImages();
    fetchLikesAndComments();
  }, []);

  // =========================================================
  // LIKE
  // =========================================================

  const handleLike = async (imageId?: number) => {
    if (!imageId) return;

    try {
      const alreadyLiked = likedImages.includes(imageId);

      if (alreadyLiked) {
        // BỎ LIKE
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("image_id", imageId)
          .eq("user_name", "Người dùng VietAnh");

        if (error) {
          throw error;
        }

        setLikedImages((prev) =>
          prev.filter((id) => id !== imageId)
        );

        setLikeCounts((prev) => ({
          ...prev,
          [imageId]: Math.max(
            (prev[imageId] || 1) - 1,
            0
          ),
        }));
      } else {
        // THÊM LIKE
        const { error } = await supabase
          .from("likes")
          .insert({
            image_id: imageId,
            user_name: "Người dùng VietAnh",
          });

        if (error) {
          throw error;
        }

        setLikedImages((prev) => [
          ...prev,
          imageId,
        ]);

        setLikeCounts((prev) => ({
          ...prev,
          [imageId]: (prev[imageId] || 0) + 1,
        }));
      }
    } catch (error: any) {
      console.error("Lỗi Like:", error);

      alert(
        "Lỗi Like: " +
          (error?.message || "Không xác định được lỗi.")
      );
    }
  };

  // =========================================================
  // COMMENT
  // =========================================================

  const handleSendComment = async (imageId?: number) => {
    if (!imageId) return;

    const text = commentText.trim();

    if (!text) {
      return;
    }

    try {
      setSendingComment(true);

      const { data, error } = await supabase
        .from("comments")
        .insert({
          image_id: imageId,
          user_name: "Người dùng VietAnh",
          content: text,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setComments((prev) => [
          ...prev,
          data,
        ]);
      }

      setCommentText("");
    } catch (error: any) {
      console.error("Lỗi gửi bình luận:", error);

      alert(
        "Lỗi gửi bình luận: " +
          (error?.message || "Không xác định được lỗi.")
      );
    } finally {
      setSendingComment(false);
    }
  };

  // =========================================================
  // XÓA BÌNH LUẬN
  // =========================================================

  const handleDeleteComment = async (commentId: number) => {
    const confirmed = confirm(
      "Bạn có chắc chắn muốn xóa bình luận này?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        throw error;
      }

      setComments((prev) =>
        prev.filter(
          (comment) => comment.id !== commentId
        )
      );
    } catch (error: any) {
      console.error("Lỗi xóa bình luận:", error);

      alert(
        "Lỗi xóa bình luận: " +
          (error?.message || "Không xác định được lỗi.")
      );
    }
  };

  // =========================================================
  // LÀM SẠCH TÊN FILE
  // =========================================================

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

    const safeName =
      nameWithoutExtension || "image";

    return `${Date.now()}_${safeName}.${extension || "jpg"}`;
  };

  // =========================================================
  // UPLOAD ẢNH
  // =========================================================

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const originalFile = e.target.files?.[0];

    e.target.value = "";

    if (!originalFile) {
      return;
    }

    try {
      setUploading(true);

      if (!originalFile.type.startsWith("image/")) {
        throw new Error(
          "Vui lòng chọn một file ảnh."
        );
      }

      if (
        originalFile.size >
        10 * 1024 * 1024
      ) {
        throw new Error(
          "Ảnh không được lớn hơn 10MB."
        );
      }

      const fileName =
        createSafeFileName(
          originalFile.name
        );

      // Upload Storage
      const { error: uploadError } =
        await supabase.storage
          .from("images")
          .upload(
            fileName,
            originalFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                originalFile.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      // Public URL
      const { data: urlData } =
        supabase.storage
          .from("images")
          .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error(
          "Không lấy được đường dẫn ảnh."
        );
      }

      const originalTitle =
        originalFile.name.replace(
          /\.[^/.]+$/,
          ""
        ) ||
        "Khoảnh khắc mới";

      // Lưu Database
      const { data: dbData, error: dbError } =
        await supabase
          .from("images")
          .insert([
            {
              name: fileName,
              url: urlData.publicUrl,
              title: originalTitle,
              author:
                "Người dùng VietAnh",
            },
          ])
          .select();

      if (dbError) {
        await supabase.storage
          .from("images")
          .remove([fileName]);

        throw dbError;
      }

      if (
        dbData &&
        dbData.length > 0
      ) {
        setImages((prev) => [
          dbData[0],
          ...prev,
        ]);
      }

      alert(
        "Tải ảnh lên thành công!"
      );
    } catch (error: any) {
      console.error(
        "Lỗi upload:",
        error
      );

      alert(
        "Lỗi tải ảnh: " +
          (error?.message ||
            "Không xác định được lỗi.")
      );
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // XÓA ẢNH
  // =========================================================

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
      // Xóa Storage
      const {
        error: storageError,
      } = await supabase.storage
        .from("images")
        .remove([fileName]);

      if (storageError) {
        throw storageError;
      }

      // Xóa Database
      const {
        error: dbError,
      } = await supabase
        .from("images")
        .delete()
        .eq("id", id);

      if (dbError) {
        throw dbError;
      }

      setImages((prev) =>
        prev.filter(
          (img) => img.id !== id
        )
      );

      setLikedImages((prev) =>
        prev.filter(
          (imageId) =>
            imageId !== id
        )
      );

      setLikeCounts((prev) => {
        const newCounts = {
          ...prev,
        };

        delete newCounts[id];

        return newCounts;
      });

      setComments((prev) =>
        prev.filter(
          (comment) =>
            comment.image_id !== id
        )
      );

      if (commentImage === id) {
        setCommentImage(null);
      }

      alert(
        "Xóa ảnh thành công!"
      );
    } catch (error: any) {
      console.error(
        "Lỗi xóa ảnh:",
        error
      );

      alert(
        "Lỗi xóa ảnh: " +
          (error?.message ||
            "Không xác định được lỗi.")
      );
    }
  };

  // =========================================================
  // HIỂN THỊ
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          backgroundColor: "#fff",
          padding: "20px 80px",
          borderBottom:
            "1px solid #e9ecef",
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
            justifyContent:
              "space-between",
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
                margin:
                  "0 0 10px 0",
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

          {/* UPLOAD */}
          <label
            style={{
              backgroundColor:
                uploading
                  ? "#555"
                  : "#000",
              color: "#fff",
              padding:
                "10px 20px",
              borderRadius: "8px",
              cursor:
                uploading
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "500",
              whiteSpace:
                "nowrap",
            }}
          >
            {uploading
              ? "Đang tải..."
              : "+ Tải ảnh mới"}

            <input
              type="file"
              accept="image/*"
              onChange={
                handleUpload
              }
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
            {images.map(
              (img) => {
                const id =
                  img.id;

                const isLiked =
                  id !== undefined &&
                  likedImages.includes(
                    id
                  );

                const likes =
                  id !== undefined
                    ? likeCounts[id] ||
                      0
                    : 0;

                const imageComments =
                  id !== undefined
                    ? comments.filter(
                        (comment) =>
                          comment.image_id ===
                          id
                      )
                    : [];

                const isCommentOpen =
                  id !== undefined &&
                  commentImage === id;

                return (
                  <div
                    key={
                      img.id ||
                      img.name
                    }
                    style={{
                      backgroundColor:
                        "#fff",
                      borderRadius:
                        "16px",
                      overflow:
                        "hidden",
                      boxShadow:
                        "0 4px 12px rgba(0,0,0,0.05)",
                      display:
                        "flex",
                      flexDirection:
                        "column",
                    }}
                  >
                    {/* ẢNH */}
                    <div
                      style={{
                        height:
                          "280px",
                        overflow:
                          "hidden",
                        backgroundColor:
                          "#e9ecef",
                      }}
                    >
                      <img
                        src={img.url}
                        alt={
                          img.title
                        }
                        loading="lazy"
                        style={{
                          width:
                            "100%",
                          height:
                            "100%",
                          objectFit:
                            "cover",
                        }}
                      />
                    </div>

                    {/* THÔNG TIN */}
                    <div
                      style={{
                        padding:
                          "16px",
                        flexGrow: 1,
                        display:
                          "flex",
                        flexDirection:
                          "column",
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            "0 0 4px 0",
                          fontSize:
                            "18px",
                          fontWeight:
                            "bold",
                        }}
                      >
                        {img.title}
                      </h3>

                      <p
                        style={{
                          margin:
                            "0 0 14px 0",
                          color:
                            "#6c757d",
                          fontSize:
                            "14px",
                        }}
                      >
                        {img.author}
                      </p>

                      {/* LIKE + COMMENT */}
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          borderTop:
                            "1px solid #eee",
                          borderBottom:
                            "1px solid #eee",
                          padding:
                            "10px 0",
                          marginBottom:
                            "12px",
                        }}
                      >
                        {/* LIKE */}
                        <button
                          type="button"
                          onClick={() =>
                            handleLike(
                              id
                            )
                          }
                          style={{
                            border:
                              "none",
                            background:
                              "transparent",
                            cursor:
                              "pointer",
                            fontSize:
                              "15px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "5px",
                            padding:
                              "5px",
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                "22px",
                            }}
                          >
                            {isLiked
                              ? "❤️"
                              : "🤍"}
                          </span>

                          <span>
                            {likes >
                            0
                              ? likes
                              : "Thích"}
                          </span>
                        </button>

                        {/* COMMENT */}
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              id !==
                              undefined
                            ) {
                              setCommentImage(
                                commentImage ===
                                  id
                                  ? null
                                  : id
                              );
                            }
                          }}
                          style={{
                            border:
                              "none",
                            background:
                              "transparent",
                            cursor:
                              "pointer",
                            fontSize:
                              "15px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "5px",
                            padding:
                              "5px",
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                "21px",
                            }}
                          >
                            💬
                          </span>

                          <span>
                            {imageComments.length >
                            0
                              ? imageComments.length
                              : "Bình luận"}
                          </span>
                        </button>
                      </div>

                      {/* BÌNH LUẬN */}
                      {isCommentOpen && (
                        <div
                          style={{
                            backgroundColor:
                              "#f8f9fa",
                            borderRadius:
                              "10px",
                            padding:
                              "12px",
                            marginBottom:
                              "12px",
                          }}
                        >
                          {/* DANH SÁCH COMMENT */}
                          {imageComments.length >
                            0 && (
                            <div
                              style={{
                                marginBottom:
                                  "12px",
                              }}
                            >
                              {imageComments.map(
                                (
                                  comment
                                ) => (
                                  <div
                                    key={
                                      comment.id
                                    }
                                    style={{
                                      backgroundColor:
                                        "#fff",
                                      borderRadius:
                                        "8px",
                                      padding:
                                        "8px 10px",
                                      marginBottom:
                                        "7px",
                                      fontSize:
                                        "14px",
                                    }}
                                  >
                                    <strong>
                                      {
                                        comment.user_name
                                      }
                                    </strong>

                                    <div
                                      style={{
                                        marginTop:
                                          "3px",
                                        wordBreak:
                                          "break-word",
                                      }}
                                    >
                                      {
                                        comment.content
                                      }
                                    </div>

                                    {/* XÓA COMMENT */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteComment(
                                          comment.id
                                        )
                                      }
                                      style={{
                                        border:
                                          "none",
                                        background:
                                          "transparent",
                                        color:
                                          "#dc3545",
                                        cursor:
                                          "pointer",
                                        fontSize:
                                          "12px",
                                        padding:
                                          "4px 0 0 0",
                                      }}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {/* Ô NHẬP */}
                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "6px",
                            }}
                          >
                            <input
                              type="text"
                              value={
                                commentText
                              }
                              onChange={(
                                e
                              ) =>
                                setCommentText(
                                  e.target
                                    .value
                                )
                              }
                              onKeyDown={(
                                e
                              ) => {
                                if (
                                  e.key ===
                                  "Enter"
                                ) {
                                  handleSendComment(
                                    id
                                  );
                                }
                              }}
                              placeholder="Viết bình luận..."
                              style={{
                                flex:
                                  1,
                                minWidth:
                                  0,
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "8px",
                                padding:
                                  "9px 10px",
                                outline:
                                  "none",
                                backgroundColor:
                                  "#fff",
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleSendComment(
                                  id
                                )
                              }
                              disabled={
                                sendingComment ||
                                !commentText.trim()
                              }
                              style={{
                                border:
                                  "none",
                                borderRadius:
                                  "8px",
                                padding:
                                  "0 12px",
                                backgroundColor:
                                  sendingComment ||
                                  !commentText.trim()
                                    ? "#ccc"
                                    : "#000",
                                color:
                                  "#fff",
                                cursor:
                                  sendingComment ||
                                  !commentText.trim()
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {sendingComment
                                ? "..."
                                : "Gửi"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* XÓA ẢNH */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            img.id,
                            img.name
                          )
                        }
                        style={{
                          backgroundColor:
                            "#fff0f0",
                          color:
                            "#dc3545",
                          border:
                            "1px solid #ffcdd2",
                          padding:
                            "8px 12px",
                          borderRadius:
                            "6px",
                          cursor:
                            "pointer",
                          fontSize:
                            "14px",
                          fontWeight:
                            "500",
                          width:
                            "100%",
                        }}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                );
              }
            )}

            {/* CHƯA CÓ ẢNH */}
            {images.length ===
              0 && (
              <div
                style={{
                  backgroundColor:
                    "#e9ecef",
                  borderRadius:
                    "16px",
                  height:
                    "360px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color:
                    "#6c757d",
                  gridColumn:
                    "1 / -1",
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