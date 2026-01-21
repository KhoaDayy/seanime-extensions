# Project Summary - AniMapper Provider for Seanime

## 📋 Overview

**AniMapper Provider** là một extension cho Seanime, cho phép xem anime online sử dụng AniMapper API - API Mapping Anime/Manga được thiết kế đặc biệt cho người Việt Nam.

## 🎯 Mục Đích

Extension này giải quyết vấn đề:
- Thiếu nguồn streaming anime có phụ đề tiếng Việt trong Seanime
- Cần tích hợp API Việt Nam vào ecosystem Seanime
- Cung cấp nhiều lựa chọn server và provider cho người dùng

## 🏗️ Kiến Trúc

### Core Components

1. **index.js** - Main implementation
   - `Provider` class với 4 methods chính:
     - `getSettings()` - Cấu hình provider
     - `search()` - Tìm kiếm anime
     - `findEpisodes()` - Lấy danh sách tập
     - `findEpisodeServer()` - Lấy URL streaming

2. **metadata.json** - Extension metadata
   - ID, name, version
   - Type: `onlinestream-provider`
   - Language support: Vietnamese & English

3. **Type Definitions**
   - `online-streaming-provider.d.ts` - Provider interfaces
   - `core.d.ts` - Seanime core APIs

### Data Flow

```
User Search
    ↓
Search API → Filter results with streaming
    ↓
Select Anime
    ↓
Metadata API → Get providers
    ↓
Episodes API → Get episode list
    ↓
Select Episode
    ↓
Source API → Get streaming URL
    ↓
Video Player
```

## 🔌 API Integration

### AniMapper API Endpoints Used

| Endpoint | Purpose | Parameters |
|----------|---------|------------|
| `/search` | Tìm kiếm anime | title, mediaType, limit, year |
| `/metadata` | Thông tin chi tiết | id |
| `/stream/episodes` | Danh sách tập | id, provider |
| `/stream/source` | URL streaming | episodeData, provider, server |

### Providers Supported

- **ANIMEVIETSUB** (Primary) - Nhiều anime nhất
- **ANIMETVN** (Fallback) - Provider dự phòng

### Servers Available

- **DU** (Default) - Nhanh, ổn định
- **HDX** - Chất lượng cao
- **SV** - Dự phòng

## 💡 Key Features

1. **Smart Search**
   - Auto-filter kết quả có streaming
   - Support year filtering
   - Fallback gracefully khi không có results

2. **Multi-Provider Support**
   - Tự động chọn provider tốt nhất
   - Fallback giữa providers

3. **Flexible Server Selection**
   - User có thể chọn server
   - Auto-select server mặc định

4. **Error Handling**
   - Comprehensive try-catch blocks
   - Detailed error logging
   - User-friendly error messages

5. **Type Safety**
   - Full TypeScript definitions
   - IntelliSense support khi develop

## 📁 File Structure

```
seanime-extensions/
├── 📄 index.js                         # Main implementation (235 lines)
├── 📄 metadata.json                    # Extension metadata
├── 📄 online-streaming-provider.d.ts   # Type definitions
├── 📄 core.d.ts                        # Core API types
├── 📄 package.json                     # NPM metadata
├── 📄 .gitignore                       # Git ignore rules
│
├── 📚 Documentation
│   ├── README.md                       # Main documentation
│   ├── INSTALL.md                      # Installation guide
│   ├── CONFIG.md                       # Configuration guide
│   ├── EXAMPLE.md                      # Usage examples
│   ├── CHANGELOG.md                    # Version history
│   ├── CONTRIBUTING.md                 # Contribution guidelines
│   └── LICENSE                         # MIT License
│
└── 📋 This file (PROJECT_SUMMARY.md)
```

## 🔧 Technical Details

### Language & Syntax
- **JavaScript ES5** (compatible với Seanime's Goja engine)
- No arrow functions, let/const
- Traditional function declarations
- Promises with async/await

### Dependencies
- **Zero external dependencies**
- Uses only Seanime's built-in APIs:
  - `fetch()` - HTTP requests
  - `console` - Logging
  - `LoadDoc()` - HTML parsing (not used yet)

### Code Quality
- Comprehensive error handling
- Detailed logging for debugging
- Type definitions for development
- Comments in Vietnamese for clarity

## 🚀 How It Works

### 1. Search Flow

```javascript
User enters: "attack on titan"
    ↓
API: https://api.animapper.net/api/v1/search?title=attack+on+titan&mediaType=ANIME
    ↓
Filter: Only show results with streamingProviders
    ↓
Return: [{id: "16498", title: "Shingeki no Kyojin", ...}]
```

### 2. Episode Loading Flow

```javascript
User selects anime ID: "16498"
    ↓
GET metadata to find available providers: ANIMEVIETSUB ✓
    ↓
GET episodes with provider: ANIMEVIETSUB
    ↓
Return: [{id: "ANIMEVIETSUB|shingeki-no-kyojin$12345|DU", number: 1, ...}]
```

### 3. Streaming Flow

```javascript
User clicks episode
    ↓
Parse ID: provider="ANIMEVIETSUB", episodeData="...", server="DU"
    ↓
GET stream source from API
    ↓
Return: {url: "https://...", type: "m3u8", headers: {...}}
```

## 📊 Statistics

- **Total Files**: 13
- **Code Files**: 3 (index.js, *.d.ts)
- **Documentation**: 7 files
- **Configuration**: 3 files
- **Total Lines of Code**: ~235 (index.js)
- **Size**: ~7.7 KB (index.js)

## 🎨 Design Decisions

1. **ES5 Syntax**: Vì Seanime sử dụng Goja JavaScript engine (không support ES6+)

2. **Custom Episode ID Format**: `provider|episodeData|server`
   - Lưu provider và server trong episode ID
   - Không cần re-fetch metadata khi get stream

3. **No Caching**: Keep it simple
   - Future enhancement
   - Avoid stale data issues

4. **Vietnamese Comments**: Dễ hiểu cho developers Việt Nam

5. **Comprehensive Logging**: Giúp debugging và user support

## 🔮 Future Enhancements

Xem CHANGELOG.md cho roadmap chi tiết:

- Auto-retry với exponential backoff
- Provider health checking
- Episode list caching
- Quality selection (720p, 1080p)
- Multi-language UI support
- User preferences storage
- Batch episode loading
- Better error messages

## 🧪 Testing

### Manual Testing
- Test search với nhiều keywords
- Test tất cả servers
- Test error cases
- Verify CORS headers
- Check console logs

### Test Anime IDs
- 16498 (Attack on Titan)
- 21 (One Piece)
- 20 (Naruto)

## 📖 Documentation Status

| File | Status | Coverage |
|------|--------|----------|
| README.md | ✅ Complete | Main docs |
| INSTALL.md | ✅ Complete | Installation |
| CONFIG.md | ✅ Complete | Configuration |
| EXAMPLE.md | ✅ Complete | Usage examples |
| CHANGELOG.md | ✅ Complete | Version history |
| CONTRIBUTING.md | ✅ Complete | Contribution guide |

## 🤝 Integration Points

### With Seanime
- Settings → Extensions → Install
- Anime page → Online Streaming tab
- Provider selection dropdown
- Video player integration

### With AniMapper
- REST API calls
- JSON responses
- CORS handling
- M3U8 streaming URLs

## 🎓 Learning Resources

- [Seanime Extensions Docs](https://seanime.gitbook.io/seanime-extensions)
- [AniMapper API Docs](https://animapper.net/docs)
- [HLS Streaming Guide](https://en.wikipedia.org/wiki/HTTP_Live_Streaming)

## 📞 Support & Community

- GitHub Issues for bugs
- Discussions for questions
- Discord for community chat
- Email for private inquiries

## 🏆 Credits

- **Seanime**: Self-hosted anime streaming platform
- **AniMapper**: API provider
- **Contributors**: Community developers

## 📝 License

MIT License - Free to use, modify, and distribute

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-21  
**Status**: Production Ready ✅
