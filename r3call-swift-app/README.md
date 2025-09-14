# r3call Mac App

A native macOS menu bar application for managing your personal memory system. Built with SwiftUI and integrated with your existing r3call memory database.

## Features

### 🧠 Memory Management
- **View all memories** in a clean, organized interface
- **Add new memories** with rich metadata support
- **Edit existing memories** with full content and metadata editing
- **Delete memories** with confirmation
- **Search and filter** memories by content, project, tags, and more

### 📊 Smart Organization
- **Project-based organization** - group memories by project
- **Tag system** - add multiple tags to categorize memories
- **Directory tracking** - associate memories with file system locations
- **Custom metadata** - add your own key-value pairs
- **Usage statistics** - track how often memories are used

### 🔍 Advanced Search & Filtering
- **Real-time search** across memory content, tags, and metadata
- **Project filtering** - view memories by specific projects
- **Tag filtering** - filter by one or multiple tags
- **Multiple sort options** - by relevance, date, usage count, etc.
- **Smart suggestions** - see available projects and tags

### 📈 Analytics & Insights
- **Memory statistics** - total count, projects, tags
- **Usage tracking** - see most frequently used memories
- **Recent activity** - quick access to recently added memories
- **Project breakdown** - understand your memory distribution

### 🎨 Native macOS Experience
- **Menu bar integration** - always accessible from the menu bar
- **Native SwiftUI interface** - follows macOS design guidelines
- **Keyboard shortcuts** - efficient navigation and editing
- **Context menus** - right-click for quick actions
- **Drag and drop** - intuitive file and content handling

## Installation

### Prerequisites
- macOS 12.0 or later
- Xcode 14.0 or later (for building from source)

### Building from Source

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd r3call/r3call-swift-app
   ```

2. **Run the setup script**:
   ```bash
   ./setup_project.sh
   ```

3. **Add files to Xcode project**:
   - Open `MenuBarApp.xcodeproj` in Xcode
   - Add the following files to your project:
     - `MenuBarApp/Models/Memory.swift`
     - `MenuBarApp/Models/MemoryStore.swift`
     - `MenuBarApp/Views/MemoryListView.swift`
     - `MenuBarApp/Views/AddMemoryView.swift`
     - `MenuBarApp/Views/EditMemoryView.swift`
     - `MenuBarApp/Views/FilterView.swift`

4. **Add SQLite3 framework**:
   - Select your target in Xcode
   - Go to "Frameworks, Libraries, and Embedded Content"
   - Click "+" and add "libsqlite3.tbd"

5. **Build and run**:
   - Press Cmd+R to build and run the app

## Database Integration

The app automatically connects to your existing r3call memory database at:
```
/Users/oliver/mcp-servers/r3call/data/memories.db
```

If the database doesn't exist at that location, it will create a new one in your Documents folder.

### Database Schema

The app works with the following database structure:

```sql
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    project TEXT,
    directory TEXT,
    tags TEXT, -- JSON array
    metadata TEXT, -- JSON object
    search_text TEXT,
    use_count INTEGER DEFAULT 0,
    last_used DATETIME
);
```

## Usage

### Menu Bar Interface

1. **Click the menu bar icon** to open the popup
2. **View quick stats** - see total memories, projects, and tags
3. **Browse recent memories** - quick access to your latest memories
4. **Open full manager** - click "Manage Memories" for the full interface

### Full Memory Manager

1. **Search memories** - use the search bar to find specific memories
2. **Add new memory** - click the "+" button to add a new memory
3. **Edit memory** - click on any memory to edit its content and metadata
4. **Filter memories** - use the filter button to narrow down results
5. **Sort memories** - choose how to sort your memories

### Adding Memories

When adding a new memory, you can specify:
- **Content** - the main memory text
- **Project** - associate with a specific project
- **Directory** - link to a file system location
- **Tags** - add multiple tags for categorization
- **Category** - assign a general category
- **Metadata flags** - mark as executable, dangerous, requires sudo
- **Custom data** - add your own key-value pairs

## Keyboard Shortcuts

- `Cmd + F` - Focus search bar
- `Cmd + N` - Add new memory
- `Cmd + E` - Edit selected memory
- `Cmd + Delete` - Delete selected memory
- `Esc` - Close current view
- `Cmd + ,` - Open settings

## Architecture

### Models
- **Memory** - Core memory data structure
- **MemoryMetadata** - Extended metadata for memories
- **MemoryStore** - Database operations and state management

### Views
- **MemoryListView** - Main memory list interface
- **AddMemoryView** - Form for adding new memories
- **EditMemoryView** - Form for editing existing memories
- **FilterView** - Advanced filtering and sorting options

### Key Features
- **SQLite integration** - Direct database access for performance
- **SwiftUI** - Modern, declarative UI framework
- **Combine** - Reactive programming for data flow
- **Menu bar integration** - Native macOS menu bar app

## Development

### Project Structure
```
MenuBarApp/
├── Models/
│   ├── Memory.swift          # Core memory model
│   └── MemoryStore.swift     # Database operations
├── Views/
│   ├── MemoryListView.swift  # Main list interface
│   ├── AddMemoryView.swift   # Add memory form
│   ├── EditMemoryView.swift  # Edit memory form
│   └── FilterView.swift      # Filtering interface
├── Menu Bar Button/
│   └── MenuBarPopup.swift    # Menu bar popup
└── ...
```

### Adding New Features

1. **New views** - Add to the `Views/` directory
2. **New models** - Add to the `Models/` directory
3. **Database changes** - Update `MemoryStore.swift`
4. **UI updates** - Modify existing views or create new ones

### Testing

The app includes comprehensive error handling and validation:
- Database connection errors
- Invalid data handling
- User input validation
- Memory operation feedback

## Troubleshooting

### Common Issues

1. **Database not found** - The app will create a new database in Documents if the main one isn't found
2. **SQLite errors** - Check that the database file is not corrupted
3. **Build errors** - Ensure SQLite3 framework is properly linked
4. **Memory not saving** - Check that all required fields are filled

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
export R3CALL_DEBUG=1
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information

---

Built with ❤️ using SwiftUI and SQLite