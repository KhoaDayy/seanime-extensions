# AniMapper Provider Extension Example

Đây là ví dụ sử dụng extension trong môi trường test.

## Test Cases

### 1. Search Test
```javascript
// Test tìm kiếm anime
const opts = {
    media: {
        id: 16498,
        romajiTitle: "Shingeki no Kyojin",
        englishTitle: "Attack on Titan",
        synonyms: [],
        isAdult: false
    },
    query: "attack on titan",
    dub: false,
    year: 2013
}

const results = await provider.search(opts)
console.log("Search Results:", results)
```

### 2. Find Episodes Test
```javascript
// Test lấy danh sách tập
const mediaId = "16498" // Attack on Titan
const episodes = await provider.findEpisodes(mediaId)
console.log("Episodes:", episodes)
```

### 3. Get Stream Source Test
```javascript
// Test lấy nguồn streaming
const episode = {
    id: "ANIMEVIETSUB|shingeki-no-kyojin$12345|DU",
    number: 1,
    url: "",
    title: "Tập 1"
}

const server = "DU"
const source = await provider.findEpisodeServer(episode, server)
console.log("Stream Source:", source)
```

## Expected Results

### Search Results
```json
[
    {
        "id": "16498",
        "title": "Shingeki no Kyojin",
        "url": "",
        "subOrDub": "sub"
    }
]
```

### Episodes
```json
[
    {
        "id": "ANIMEVIETSUB|shingeki-no-kyojin$12345|DU",
        "number": 1,
        "url": "",
        "title": "Tập 1"
    },
    {
        "id": "ANIMEVIETSUB|shingeki-no-kyojin$12346|DU",
        "number": 2,
        "url": "",
        "title": "Tập 2"
    }
]
```

### Stream Source
```json
{
    "server": "DU",
    "headers": {
        "Referer": "https://animevietsub.page"
    },
    "videoSources": [
        {
            "url": "https://api.animapper.net/api/v1/stream/source/m3u8/abc123",
            "type": "m3u8",
            "quality": "DU",
            "subtitles": []
        }
    ]
}
```

## Notes

- Extension sử dụng ES5 syntax (không dùng arrow functions, let/const)
- Tất cả các async operations phải xử lý errors
- Console.log được dùng để debug
- Headers cần được set đúng cho CORS
