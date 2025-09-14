import Foundation

// MARK: - Memory Model
struct Memory: Identifiable, Codable, Hashable {
    let id: String
    let content: String
    let userId: String
    let createdAt: Date
    let updatedAt: Date
    let project: String?
    let directory: String?
    let tags: [String]
    let metadata: MemoryMetadata
    let searchText: String?
    let useCount: Int
    let lastUsed: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case content
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case project
        case directory
        case tags
        case metadata
        case searchText = "search_text"
        case useCount = "use_count"
        case lastUsed = "last_used"
    }
    
    init(id: String = UUID().uuidString,
         content: String,
         userId: String = "default",
         createdAt: Date = Date(),
         updatedAt: Date = Date(),
         project: String? = nil,
         directory: String? = nil,
         tags: [String] = [],
         metadata: MemoryMetadata = MemoryMetadata(),
         searchText: String? = nil,
         useCount: Int = 0,
         lastUsed: Date? = nil) {
        self.id = id
        self.content = content
        self.userId = userId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.project = project
        self.directory = directory
        self.tags = tags
        self.metadata = metadata
        self.searchText = searchText
        self.useCount = useCount
        self.lastUsed = lastUsed
    }
}

// MARK: - Memory Metadata
struct MemoryMetadata: Codable, Hashable {
    var executable: Bool?
    var dangerous: Bool?
    var requiresSudo: Bool?
    var category: String?
    var lastUsed: Date?
    var useCount: Int?
    var customData: [String: String]
    
    enum CodingKeys: String, CodingKey {
        case executable
        case dangerous
        case requiresSudo = "requires_sudo"
        case category
        case lastUsed = "last_used"
        case useCount = "use_count"
        case customData
    }
    
    init(executable: Bool? = nil,
         dangerous: Bool? = nil,
         requiresSudo: Bool? = nil,
         category: String? = nil,
         lastUsed: Date? = nil,
         useCount: Int? = nil,
         customData: [String: String] = [:]) {
        self.executable = executable
        self.dangerous = dangerous
        self.requiresSudo = requiresSudo
        self.category = category
        self.lastUsed = lastUsed
        self.useCount = useCount
        self.customData = customData
    }
}

// MARK: - Search Options
struct SearchOptions {
    var fuzzy: Bool = false
    var project: String?
    var directory: String?
    var tags: [String] = []
    var limit: Int = 50
    var offset: Int = 0
    var sortBy: SortOption = .relevance
    var sortOrder: SortOrder = .descending
}

enum SortOption: String, CaseIterable {
    case relevance = "relevance"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case useCount = "use_count"
    case lastUsed = "last_used"
    case content = "content"
}

enum SortOrder: String, CaseIterable {
    case ascending = "asc"
    case descending = "desc"
}

// MARK: - Memory Statistics
struct MemoryStats {
    let totalMemories: Int
    let totalProjects: Int
    let totalTags: Int
    let mostUsedMemory: Memory?
    let recentMemories: [Memory]
    let projectBreakdown: [String: Int]
    let tagBreakdown: [String: Int]
}

// MARK: - Memory Extensions
extension Memory {
    var displayTitle: String {
        let maxLength = 50
        if content.count <= maxLength {
            return content
        } else {
            return String(content.prefix(maxLength)) + "..."
        }
    }
    
    var formattedCreatedAt: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdAt)
    }
    
    var formattedUpdatedAt: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: updatedAt)
    }
    
    var tagString: String {
        return tags.joined(separator: ", ")
    }
    
    var isRecent: Bool {
        let oneWeekAgo = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: Date()) ?? Date()
        return createdAt > oneWeekAgo
    }
    
    var isFrequentlyUsed: Bool {
        return useCount > 5
    }
}
