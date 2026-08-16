'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase client từ biến môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Photo {
  id: string;
  title: string;
  author: string;
  image_url: string;
  created_at: string;
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);

  // State lưu thông tin form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Lấy danh sách ảnh từ Supabase Database
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPhotos(data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách ảnh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Hàm xử lý upload ảnh (Đã sửa lỗi ký tự tiếng Việt/Headers)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      alert('Vui lòng điền tiêu đề và chọn ảnh!');
      return;
    }

    try {
      setUploading(true);

      // 1. TẠO TÊN FILE AN TOÀN (chỉ dùng timestamp + chuỗi ngẫu nhiên + đuôi file)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      // 2. Tải ảnh lên Supabase Storage bucket 'photos'
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(safeFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Lấy Public URL của bức ảnh
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(safeFileName);

      const imageUrl = publicUrlData.publicUrl;

      // 4. Lưu thông tin vào Database bảng 'photos'
      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            title: title.trim(),
            author: author.trim() || 'Người dùng VietAnh',
            image_url: imageUrl,
          },
        ]);

      if (dbError) throw dbError;

      // Reset form & reload danh sách ảnh
      setTitle('');
      setAuthor('');
      setFile(null);
      setIsOpenModal(false);
      await fetchPhotos();
      alert('Tải ảnh thành công!');
    } catch (error: any) {
      console.error('Lỗi tải ảnh:', error);
      alert('Lỗi tải ảnh: ' + (error.message || 'Đã có lỗi xảy ra'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center pb-8 mb-8 border-b border-slate-200">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">VietAnh</h1>
          <button
            onClick={() => setIsOpenModal(true)}
            className="bg-black hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-sm"
          >
            + Tải ảnh mới
          </button>
        </header>

        {/* Tiêu đề trang */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Ảnh mới nhất</h2>
          <p className="text-slate-500">Chia sẻ những khoảnh khắc của bạn</p>
        </div>

        {/* Danh sách ảnh */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
        ) : photos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-200 rounded-2xl h-80 flex items-center justify-center text-slate-400 font-medium">
              Chưa có ảnh
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <h3 className="font-bold text-lg text-slate-900 capitalize truncate">{photo.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{photo.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal / Popup Form Tải Ảnh */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Thêm ảnh mới</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tiêu đề bức ảnh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: cô gái"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tác giả (Tên của bạn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: hoang anh"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Chọn hình ảnh <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {uploading ? 'Đang tải...' : 'Tải lên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}