# AniMapper AnimeVietSub Provider for Seanime

Extension cho Seanime để xem anime online sử dụng **AniMapper API** - API Mapping Anime/Manga dành cho người Việt.

**Optimized for ANIMEVIETSUB** - Provider tốt nhất với nhiều anime nhất và phụ đề tiếng Việt chất lượng cao.

## 📖 Giới thiệu

Extension này cho phép Seanime kết nối với AniMapper API để:
- Tìm kiếm anime từ ANIMEVIETSUB
- Lấy danh sách tập phim với pagination
- Xem anime online với server DU (mặc định)
- Tự động deduplication và sorting episodes

## ✨ Tính năng

- ✅ Tìm kiếm anime với bộ lọc year
- ✅ Direct metadata check (nhanh hơn khi có media ID)
- ✅ Provider: **ANIMEVIETSUB** (tốt nhất cho Việt Nam)
- ✅ Server: **AnimeVsub** (DU server - ổn định nhất)
- ✅ Phụ đề tiếng Việt chất lượng cao
- ✅ **Pagination support** - Load tất cả episodes không giới hạn
- ✅ **Auto deduplication** - Loại bỏ episodes trùng lặp
- ✅ **Smart sorting** - Sắp xếp thông minh (hỗ trợ special episodes)
- ✅ **HLS streaming** - M3U8 format cho chất lượng tốt nhất

## 📦 Cài đặt

1. Tải toàn bộ thư mục extension
2. Trong Seanime, vào **Settings** → **Extensions**
3. Chọn **Install Extension** và chọn thư mục này
4. Extension sẽ tự động được kích hoạt

## 🚀 Sử dụng

1. Sau khi cài đặt, vào trang anime bất kỳ trong Seanime
2. Chọn tab **Online Streaming**
3. Chọn **AniMapper Provider** từ danh sách providers
4. Chọn tập phim và server để xem

## 🔧 Cấu trúc

```
seanime-extensions/
├── metadata.json                    # Thông tin extension
├── index.js                         # Main provider implementation
├── online-streaming-provider.d.ts   # Type definitions
├── core.d.ts                        # Core API types
└── README.md                        # Hướng dẫn
```

## 📝 API Reference

Extension sử dụng các endpoint sau từ AniMapper API:

- `GET /api/v1/search` - Tìm kiếm anime
- `GET /api/v1/metadata` - Lấy thông tin chi tiết
- `GET /api/v1/stream/episodes` - Lấy danh sách tập
- `GET /api/v1/stream/source` - Lấy URL streaming

## 🔗 Links

- [Seanime Documentation](https://seanime.gitbook.io/seanime-extensions)
- [AniMapper API Documentation](https://animapper.net/docs)
- [AniMapper Website](https://animapper.net)

## ⚙️ Cấu hình

Extension tối ưu cho:
- **Provider**: ANIMEVIETSUB (duy nhất)
- **Server**: AnimeVsub (DU server - mặc định)

### Technical Details

- **Pagination**: Tự động load tất cả episodes (100/page)
- **Deduplication**: Loại bỏ episodes duplicate dựa trên episode number
- **Sorting**: Smart sorting hỗ trợ special episodes (195_1, 195-196-197, etc.)
- **Video Type**: HLS (M3U8) streaming
- **CORS**: Auto-handle với proxy headers

### Why ANIMEVIETSUB only?

- 🎯 **Nhiều anime nhất** - Coverage tốt nhất
- 🚀 **Server ổn định** - DU server reliable
- 📺 **Chất lượng cao** - Phụ đề VN tốt 
- ⚡ **Nhanh** - Response time tốt

## 🐛 Xử lý lỗi

Nếu gặp lỗi:

1. **Không tìm thấy anime**: Thử tìm kiếm với từ khóa khác
2. **Không có tập phim**: Provider có thể chưa cập nhật anime này
3. **Lỗi streaming**: Thử đổi server khác

## 📄 License

MIT License

## 👨‍💻 Author

Based on implementation by **Sinon (Hien Cao)**  
Adapted and enhanced for Seanime

## 🙏 Credits

- [Seanime](https://github.com/5rahim/seanime) - Self-hosted anime streaming platform
- [AniMapper](https://animapper.net) - API Mapping Anime/Manga dành cho người Việt
- [SinonCute](https://github.com/SinonCute/seanime-extensions) - Original implementation
