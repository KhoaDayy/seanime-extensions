# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-01-21

### Major Refactoring - ANIMEVIETSUB Focus

- 🎯 **ANIMEVIETSUB Only**: Removed ANIMETVN (không hoạt động)
- 🚀 **DU Server Optimized**: Focus vào AnimeVsub (DU) server
- ⚡ **Direct Metadata Check**: Ưu tiên check metadata trước khi search (nhanh hơn)
- 📄 **Pagination Support**: Load  tất cả episodes, không giới hạn (100 episodes/page)
- 🔄 **Auto Deduplication**: Tự động loại bỏ episodes trùng lặp
- 📊 **Smart Sorting**: Sắp xếp thông minh hỗ trợ special episodes (195_1, 195-196-197, etc.)
- 🎬 **Better Episode Parsing**: Xử lý tốt hơn episode numbers với regex matching
- 🐛 **Improved Error Handling**: Chi tiết hơn với proper error codes

### Technical Improvements
- Refactored based on [SinonCute's implementation](https://github.com/SinonCute/seanime-extensions)
- Cleaner code với better separation of concerns
- More robust error handling
- Enhanced logging for debugging
- Integer conversion fixes cho episode numbers

## [1.0.0] - 2026-01-21 (Deprecated)

### Initial Release (Replaced by 1.0.1)

## [Roadmap]

### Planned Features
- 🔄 Auto-retry với exponential backoff
- 📊 Provider health checking
- 💾 Caching episode lists
- 🎯 Smart provider selection dựa trên availability
- 📈 Performance metrics
- 🌐 Multi-language support (English UI)
- 🎬 Support cho OVA và Special episodes
- 🔍 Advanced search filters
- ⭐ Quality selection (720p, 1080p, etc.)

### Future Improvements
- Add user preferences (favorite provider/server)
- Implement rate limiting
- Add retry logic for failed requests
- Support for batch episode loading
- Better error messages in Vietnamese
