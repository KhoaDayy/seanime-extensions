# Contributing to AniMapper Provider

Cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án! 🎉

## Code of Conduct

Dự án này tuân theo Code of Conduct để tạo môi trường thân thiện cho mọi người.

## How Can I Contribute?

### Reporting Bugs

Nếu bạn tìm thấy bug:

1. **Check existing issues** - Bug có thể đã được report
2. **Create detailed report** - Include:
   - Mô tả chi tiết bug
   - Các bước reproduce
   - Expected behavior vs actual behavior
   - Screenshots nếu có
   - Environment info (OS, Seanime version, etc.)

### Suggesting Features

Để suggest feature mới:

1. **Check roadmap** - Xem feature đã được plan chưa
2. **Open feature request** với:
   - Mô tả rõ ràng feature
   - Use case và lợi ích
   - Possible implementation approach

### Pull Requests

#### Setup Development Environment

```bash
# Clone repo
git clone https://github.com/yourusername/seanime-animapper-extension.git
cd seanime-animapper-extension

# Không cần install dependencies (pure JavaScript)
# Chỉ cần text editor
```

#### Development Workflow

1. **Create branch**
   ```bash
   git checkout -b feature/your-feature-name
   # hoặc
   git checkout -b fix/bug-description
   ```

2. **Make changes**
   - Follow code style (ES5 syntax)
   - Add comments cho complex logic
   - Update documentation nếu cần

3. **Test thoroughly**
   - Test trong Seanime
   - Test với nhiều anime khác nhau
   - Test error cases

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # hoặc
   git commit -m "fix: resolve issue with..."
   ```

5. **Push và create PR**
   ```bash
   git push origin your-branch-name
   ```

#### Commit Message Convention

Sử dụng conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add support for multiple subtitles
fix: handle empty episode list gracefully
docs: update installation guide
refactor: simplify search logic
```

## Code Style Guidelines

### JavaScript

- **Use ES5 syntax** (no arrow functions, let/const)
- **Use `var` for variables**
- **Use `function` keyword**
- **Always use semicolons**
- **Use descriptive variable names**
- **Add JSDoc comments for functions**

Good:
```javascript
/**
 * Search for anime
 * @param {SearchOptions} opts - Search options
 * @returns {Promise<SearchResult[]>} Search results
 */
async search(opts) {
    var query = opts.query
    var results = []
    // ...
    return results
}
```

Bad:
```javascript
// ❌ Don't use arrow functions
const search = (opts) => {
    let query = opts.query  // ❌ Don't use let/const
    // ...
}
```

### Documentation

- Update README.md khi thay đổi features
- Update CHANGELOG.md cho mọi changes
- Add comments cho complex logic
- Keep examples up to date

## Testing

### Manual Testing Checklist

Trước khi submit PR, test:

- ✅ Search với nhiều keywords khác nhau
- ✅ Search với/không có year filter
- ✅ Load episodes cho nhiều anime
- ✅ Play nhiều episodes khác nhau
- ✅ Test tất cả servers (DU, HDX, SV)
- ✅ Test error cases (invalid ID, network errors, etc.)
- ✅ Check console logs không có errors
- ✅ Test trên Seanime version mới nhất

### Test Cases

Trong `EXAMPLE.md` có test cases mẫu. Đảm bảo code pass tất cả.

## Project Structure

```
seanime-extensions/
├── index.js                    # Main implementation
├── metadata.json               # Extension metadata
├── *.d.ts                      # Type definitions
├── README.md                   # Main documentation
├── INSTALL.md                  # Installation guide
├── CONFIG.md                   # Configuration guide
├── EXAMPLE.md                  # Usage examples
└── CHANGELOG.md                # Version history
```

## API Integration

Khi làm việc với AniMapper API:

1. **Always handle errors**
2. **Log meaningful messages**
3. **Check API responses**
4. **Handle rate limiting gracefully**

Example:
```javascript
try {
    var req = await fetch(apiUrl)
    if (!req.ok) {
        console.error("API request failed:", req.status)
        return []
    }
    var data = await req.json()
    // Process data...
} catch (e) {
    console.error("Error:", e)
    return []
}
```

## Documentation Updates

Khi thay đổi code, update:

- [ ] README.md - Nếu thay đổi features
- [ ] CHANGELOG.md - Luôn update
- [ ] CONFIG.md - Nếu thêm settings
- [ ] EXAMPLE.md - Nếu thay đổi API
- [ ] INSTALL.md - Nếu thay đổi cài đặt

## Questions?

- 💬 Open a discussion
- 📧 Email maintainers
- 🐛 Create an issue

## Recognition

Contributors sẽ được credit trong:
- README.md
- CHANGELOG.md
- GitHub contributors page

Thank you for contributing! 🙏
