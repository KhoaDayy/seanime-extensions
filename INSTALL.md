# Installation Guide

Hướng dẫn chi tiết cài đặt AniMapper Provider extension cho Seanime.

## Yêu cầu

- **Seanime** version 1.0.0 trở lên
- Kết nối Internet ổn định
- Truy cập được tới https://api.animapper.net

## Bước 1: Tải Extension

### Option A: Clone từ Git
```bash
git clone https://github.com/yourusername/seanime-animapper-extension.git
cd seanime-animapper-extension
```

### Option B: Tải ZIP
1. Tải file ZIP từ GitHub releases
2. Giải nén vào thư mục bất kỳ
3. Nhớ đường dẫn thư mục

## Bước 2: Cài Đặt trong Seanime

### Phương pháp 1: Qua UI (Khuyến nghị)

1. Mở **Seanime**
2. Vào **Settings** (⚙️) → **Extensions**
3. Click **Install Extension** hoặc **Add Provider**
4. Chọn **Browse** và tìm tới thư mục extension
5. Click **Install**

### Phương pháp 2: Manual Copy

1. Tìm thư mục extensions của Seanime:
   - Windows: `%APPDATA%\Seanime\extensions\`
   - macOS: `~/Library/Application Support/Seanime/extensions/`
   - Linux: `~/.config/seanime/extensions/`

2. Copy toàn bộ thư mục extension vào đây:
   ```
   extensions/
   └── animapper-provider/
       ├── metadata.json
       ├── index.js
       ├── core.d.ts
       └── online-streaming-provider.d.ts
   ```

3. Restart Seanime

## Bước 3: Kích Hoạt Extension

1. Sau khi cài đặt, vào **Settings** → **Extensions**
2. Tìm **AniMapper Provider** trong danh sách
3. Toggle switch để **Enable**
4. Extension sẽ hiện màu xanh khi active

## Bước 4: Kiểm Tra

1. Vào trang anime bất kỳ trong library
2. Click tab **Online Streaming** hoặc **Watch Online**
3. Trong dropdown **Provider**, chọn **AniMapper Provider**
4. Bạn sẽ thấy danh sách tập hiện ra
5. Click vào một tập để test

## Xác Minh Cài Đặt

Extension đã cài thành công khi:

- ✅ Hiện trong danh sách Extensions
- ✅ Status là "Active" hoặc "Enabled"
- ✅ Có thể chọn trong dropdown providers
- ✅ Có thể tìm kiếm và xem anime

## Troubleshooting

### Extension không hiện trong danh sách

**Giải pháp:**
1. Check file `metadata.json` có đúng format không
2. Verify extension type là `"onlinestream-provider"`
3. Restart Seanime
4. Check logs: Settings → Logs

### Extension bị lỗi khi load

**Giải pháp:**
1. Xem console logs: F12 hoặc Ctrl+Shift+I
2. Verify file `index.js` không có syntax errors
3. Check network: có kết nối tới api.animapper.net không
4. Try disable/enable lại extension

### Không tìm được anime

**Giải pháp:**
1. Verify internet connection
2. Check api.animapper.net có accessible không
3. Try search với từ khóa khác (tiếng Anh)
4. Check xem anime có trên AniMapper không

### Video không load

**Giải pháp:**
1. Try server khác (HDX, SV thay vì DU)
2. Check CORS settings trong browser
3. Verify episode còn available
4. Check console logs để xem lỗi cụ thể

## Gỡ Cài Đặt

### Qua UI
1. Settings → Extensions
2. Tìm AniMapper Provider
3. Click **Uninstall** hoặc **Remove**
4. Confirm

### Manual
1. Navigate tới thư mục extensions
2. Xóa folder `animapper-provider`
3. Restart Seanime

## Cập Nhật Extension

### Qua UI (nếu hỗ trợ)
1. Settings → Extensions
2. Tìm AniMapper Provider
3. Click **Update** nếu có version mới

### Manual
1. Gỡ extension cũ
2. Tải version mới
3. Cài đặt lại theo hướng dẫn trên

## Lưu Ý

- **Backup**: Extension settings sẽ được Seanime tự động backup
- **Updates**: Check GitHub releases để có version mới nhất
- **Logs**: Luôn enable logging khi debug issues
- **Performance**: Extension chạy trong isolated environment, không ảnh hưởng Seanime

## Getting Help

Nếu gặp vấn đề:

1. 📖 Đọc [FAQ](./README.md#troubleshooting)
2. 🔍 Search issues trên GitHub
3. 💬 Join Seanime Discord server
4. 🐛 Report bug trên GitHub Issues

## Next Steps

Sau khi cài đặt thành công:

1. Đọc [Configuration Guide](./CONFIG.md) để tùy chỉnh
2. Xem [Examples](./EXAMPLE.md) để hiểu cách hoạt động
3. Check [Changelog](./CHANGELOG.md) để biết updates

---

**Chúc bạn xem anime vui vẻ! 🎬**
