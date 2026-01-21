# Configuration Guide

## Extension Settings

Cấu hình cho AniMapper Provider extension.

## Available Settings

### Provider Priority

Thứ tự ưu tiên của providers (sẽ thử theo thứ tự):

```javascript
providers: [
    "ANIMEVIETSUB",  // Mặc định - thường có nhiều anime nhất
    "ANIMETVN"       // Dự phòng
]
```

### Server Priority

Thứ tự ưu tiên của servers:

```javascript
servers: [
    "DU",   // Mặc định - thường nhanh và ổn định
    "HDX",  // Chất lượng cao
    "SV"    // Server dự phòng
]
```

## API Configuration

Base URL của AniMapper API:
```
https://api.animapper.net/api/v1
```

## Customization

Nếu bạn muốn tùy chỉnh extension, có thể chỉnh sửa các giá trị trong `index.js`:

```javascript
constructor() {
    this.api = "https://api.animapper.net/api/v1"
    this.providers = ["ANIMEVIETSUB", "ANIMETVN"]
    this.defaultProvider = "ANIMEVIETSUB"
    this.defaultServer = "DU"
}
```

## CORS Headers

Một số server yêu cầu CORS headers:

```javascript
headers: {
    "Referer": "https://animevietsub.page"
}
```

Extension tự động xử lý việc này dựa trên response từ API.

## Rate Limiting

AniMapper API có rate limiting. Extension tự động xử lý và retry khi cần.

## Troubleshooting

### Lỗi Search

Nếu tìm kiếm không trả về kết quả:
1. Kiểm tra internet connection
2. Thử search với từ khóa tiếng Anh
3. Kiểm tra API status tại https://animapper.net

### Lỗi Streaming

Nếu không load được video:
1. Thử đổi server khác (HDX, SV)
2. Check console logs trong Seanime
3. Verify episode còn available trên provider

### Debug Mode

Để enable debug logging, check console output trong Seanime settings.

## Advanced Configuration

### Timeout Settings

Mặc định timeout là do Seanime quản lý. Extension handle gracefully.

### Retry Logic

Hiện tại extension không tự động retry. Sẽ được thêm trong version sau.

### Cache

Không có caching hiện tại. Episode lists được fetch mỗi lần.

## Support

Nếu gặp vấn đề:
1. Check [AniMapper Status](https://animapper.net)
2. Review [Seanime Extensions Docs](https://seanime.gitbook.io/seanime-extensions)
3. Open issue trên GitHub repository
