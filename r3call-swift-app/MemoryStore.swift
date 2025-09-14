import Foundation
import SQLite3

// MARK: - Memory Store
@MainActor
class MemoryStore: ObservableObject {
    @Published var memories: [Memory] = []
    @Published var filteredMemories: [Memory] = []
    @Published var searchText: String = ""
    @Published var selectedProject: String? = nil
    @Published var selectedTags: Set<String> = []
    @Published var sortOption: SortOption = .relevance
    @Published var sortOrder: SortOrder = .descending
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    private var db: OpaquePointer?
    private let dbPath: String
    
    init(dbPath: String? = nil) {
        self.dbPath = dbPath ?? self.getDefaultDBPath()
        Task {
            await loadMemories()
        }
    }
    
    deinit {
        closeDatabase()
    }
    
    // MARK: - Database Operations
    
    private func getDefaultDBPath() -> String {
        // Try to use the existing database from the r3call project
        let projectPath = "/Users/oliver/mcp-servers/r3call/data/memories.db"
        if FileManager.default.fileExists(atPath: projectPath) {
            return projectPath
        }
        
        // Fallback to Documents directory
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return documentsPath.appendingPathComponent("memories.db").path
    }
    
    private func openDatabase() -> Bool {
        if sqlite3_open(dbPath, &db) == SQLITE_OK {
            return true
        } else {
            print("Unable to open database. Error: \(String(cString: sqlite3_errmsg(db)))")
            return false
        }
    }
    
    private func closeDatabase() {
        if sqlite3_close(db) != SQLITE_OK {
            print("Error closing database: \(String(cString: sqlite3_errmsg(db)))")
        }
        db = nil
    }
    
    func loadMemories() async {
        isLoading = true
        errorMessage = nil
        
        guard openDatabase() else {
            errorMessage = "Failed to open database"
            isLoading = false
            return
        }
        
        let query = """
            SELECT id, content, user_id, created_at, updated_at, project, directory, 
                   tags, metadata, search_text, use_count, last_used
            FROM memories 
            ORDER BY created_at DESC
        """
        
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK {
            var loadedMemories: [Memory] = []
            
            while sqlite3_step(statement) == SQLITE_ROW {
                if let memory = parseMemoryFromStatement(statement) {
                    loadedMemories.append(memory)
                }
            }
            
            await MainActor.run {
                self.memories = loadedMemories
                self.applyFilters()
                self.isLoading = false
            }
        } else {
            await MainActor.run {
                self.errorMessage = "Failed to prepare query"
                self.isLoading = false
            }
        }
        
        sqlite3_finalize(statement)
        closeDatabase()
    }
    
    private func parseMemoryFromStatement(_ statement: OpaquePointer?) -> Memory? {
        guard let statement = statement else { return nil }
        
        let id = String(cString: sqlite3_column_text(statement, 0))
        let content = String(cString: sqlite3_column_text(statement, 1))
        let userId = String(cString: sqlite3_column_text(statement, 2))
        
        let createdAtString = String(cString: sqlite3_column_text(statement, 3))
        let updatedAtString = String(cString: sqlite3_column_text(statement, 4))
        
        let project = sqlite3_column_type(statement, 5) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(statement, 5))
        let directory = sqlite3_column_type(statement, 6) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(statement, 6))
        
        let tagsString = String(cString: sqlite3_column_text(statement, 7))
        let metadataString = String(cString: sqlite3_column_text(statement, 8))
        
        let searchText = sqlite3_column_type(statement, 9) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(statement, 9))
        let useCount = Int(sqlite3_column_int(statement, 10))
        
        let lastUsedString = sqlite3_column_type(statement, 11) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(statement, 11))
        
        // Parse dates
        let dateFormatter = ISO8601DateFormatter()
        let createdAt = dateFormatter.date(from: createdAtString) ?? Date()
        let updatedAt = dateFormatter.date(from: updatedAtString) ?? Date()
        let lastUsed = lastUsedString.flatMap { dateFormatter.date(from: $0) }
        
        // Parse tags
        let tags = parseJSONArray(tagsString) ?? []
        
        // Parse metadata
        let metadata = parseMetadata(metadataString)
        
        return Memory(
            id: id,
            content: content,
            userId: userId,
            createdAt: createdAt,
            updatedAt: updatedAt,
            project: project,
            directory: directory,
            tags: tags,
            metadata: metadata,
            searchText: searchText,
            useCount: useCount,
            lastUsed: lastUsed
        )
    }
    
    private func parseJSONArray(_ jsonString: String) -> [String]? {
        guard let data = jsonString.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode([String].self, from: data)
    }
    
    private func parseMetadata(_ jsonString: String) -> MemoryMetadata {
        guard let data = jsonString.data(using: .utf8) else {
            return MemoryMetadata()
        }
        
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(MemoryMetadata.self, from: data)
        } catch {
            print("Failed to parse metadata: \(error)")
            return MemoryMetadata()
        }
    }
    
    // MARK: - Memory Operations
    
    func addMemory(_ memory: Memory) async {
        guard openDatabase() else {
            errorMessage = "Failed to open database"
            return
        }
        
        let insertQuery = """
            INSERT INTO memories (id, content, user_id, created_at, updated_at, project, directory, tags, metadata, search_text, use_count, last_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, insertQuery, -1, &statement, nil) == SQLITE_OK {
            let dateFormatter = ISO8601DateFormatter()
            
            sqlite3_bind_text(statement, 1, memory.id, -1, nil)
            sqlite3_bind_text(statement, 2, memory.content, -1, nil)
            sqlite3_bind_text(statement, 3, memory.userId, -1, nil)
            sqlite3_bind_text(statement, 4, dateFormatter.string(from: memory.createdAt), -1, nil)
            sqlite3_bind_text(statement, 5, dateFormatter.string(from: memory.updatedAt), -1, nil)
            
            if let project = memory.project {
                sqlite3_bind_text(statement, 6, project, -1, nil)
            } else {
                sqlite3_bind_null(statement, 6)
            }
            
            if let directory = memory.directory {
                sqlite3_bind_text(statement, 7, directory, -1, nil)
            } else {
                sqlite3_bind_null(statement, 7)
            }
            
            let tagsData = try? JSONEncoder().encode(memory.tags)
            let tagsString = tagsData.flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
            sqlite3_bind_text(statement, 8, tagsString, -1, nil)
            
            let metadataData = try? JSONEncoder().encode(memory.metadata)
            let metadataString = metadataData.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
            sqlite3_bind_text(statement, 9, metadataString, -1, nil)
            
            if let searchText = memory.searchText {
                sqlite3_bind_text(statement, 10, searchText, -1, nil)
            } else {
                sqlite3_bind_null(statement, 10)
            }
            
            sqlite3_bind_int(statement, 11, Int32(memory.useCount))
            
            if let lastUsed = memory.lastUsed {
                sqlite3_bind_text(statement, 12, dateFormatter.string(from: lastUsed), -1, nil)
            } else {
                sqlite3_bind_null(statement, 12)
            }
            
            if sqlite3_step(statement) == SQLITE_DONE {
                await MainActor.run {
                    self.memories.insert(memory, at: 0)
                    self.applyFilters()
                }
            } else {
                await MainActor.run {
                    self.errorMessage = "Failed to add memory"
                }
            }
        } else {
            await MainActor.run {
                self.errorMessage = "Failed to prepare insert statement"
            }
        }
        
        sqlite3_finalize(statement)
        closeDatabase()
    }
    
    func updateMemory(_ memory: Memory) async {
        guard openDatabase() else {
            errorMessage = "Failed to open database"
            return
        }
        
        let updateQuery = """
            UPDATE memories 
            SET content = ?, updated_at = ?, project = ?, directory = ?, tags = ?, metadata = ?, search_text = ?, use_count = ?, last_used = ?
            WHERE id = ?
        """
        
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, updateQuery, -1, &statement, nil) == SQLITE_OK {
            let dateFormatter = ISO8601DateFormatter()
            
            sqlite3_bind_text(statement, 1, memory.content, -1, nil)
            sqlite3_bind_text(statement, 2, dateFormatter.string(from: memory.updatedAt), -1, nil)
            
            if let project = memory.project {
                sqlite3_bind_text(statement, 3, project, -1, nil)
            } else {
                sqlite3_bind_null(statement, 3)
            }
            
            if let directory = memory.directory {
                sqlite3_bind_text(statement, 4, directory, -1, nil)
            } else {
                sqlite3_bind_null(statement, 4)
            }
            
            let tagsData = try? JSONEncoder().encode(memory.tags)
            let tagsString = tagsData.flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
            sqlite3_bind_text(statement, 5, tagsString, -1, nil)
            
            let metadataData = try? JSONEncoder().encode(memory.metadata)
            let metadataString = metadataData.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
            sqlite3_bind_text(statement, 6, metadataString, -1, nil)
            
            if let searchText = memory.searchText {
                sqlite3_bind_text(statement, 7, searchText, -1, nil)
            } else {
                sqlite3_bind_null(statement, 7)
            }
            
            sqlite3_bind_int(statement, 8, Int32(memory.useCount))
            
            if let lastUsed = memory.lastUsed {
                sqlite3_bind_text(statement, 9, dateFormatter.string(from: lastUsed), -1, nil)
            } else {
                sqlite3_bind_null(statement, 9)
            }
            
            sqlite3_bind_text(statement, 10, memory.id, -1, nil)
            
            if sqlite3_step(statement) == SQLITE_DONE {
                await MainActor.run {
                    if let index = self.memories.firstIndex(where: { $0.id == memory.id }) {
                        self.memories[index] = memory
                        self.applyFilters()
                    }
                }
            } else {
                await MainActor.run {
                    self.errorMessage = "Failed to update memory"
                }
            }
        } else {
            await MainActor.run {
                self.errorMessage = "Failed to prepare update statement"
            }
        }
        
        sqlite3_finalize(statement)
        closeDatabase()
    }
    
    func deleteMemory(_ memory: Memory) async {
        guard openDatabase() else {
            errorMessage = "Failed to open database"
            return
        }
        
        let deleteQuery = "DELETE FROM memories WHERE id = ?"
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, deleteQuery, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, memory.id, -1, nil)
            
            if sqlite3_step(statement) == SQLITE_DONE {
                await MainActor.run {
                    self.memories.removeAll { $0.id == memory.id }
                    self.applyFilters()
                }
            } else {
                await MainActor.run {
                    self.errorMessage = "Failed to delete memory"
                }
            }
        } else {
            await MainActor.run {
                self.errorMessage = "Failed to prepare delete statement"
            }
        }
        
        sqlite3_finalize(statement)
        closeDatabase()
    }
    
    // MARK: - Search and Filtering
    
    func searchMemories(_ query: String) async {
        searchText = query
        applyFilters()
    }
    
    func applyFilters() {
        var filtered = memories
        
        // Apply search text filter
        if !searchText.isEmpty {
            filtered = filtered.filter { memory in
                memory.content.localizedCaseInsensitiveContains(searchText) ||
                memory.tags.contains { $0.localizedCaseInsensitiveContains(searchText) } ||
                (memory.project?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (memory.directory?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        // Apply project filter
        if let project = selectedProject {
            filtered = filtered.filter { $0.project == project }
        }
        
        // Apply tags filter
        if !selectedTags.isEmpty {
            filtered = filtered.filter { memory in
                !Set(memory.tags).isDisjoint(with: selectedTags)
            }
        }
        
        // Apply sorting
        filtered = sortMemories(filtered)
        
        filteredMemories = filtered
    }
    
    private func sortMemories(_ memories: [Memory]) -> [Memory] {
        return memories.sorted { first, second in
            let comparison: ComparisonResult
            
            switch sortOption {
            case .relevance:
                // For now, use use count as relevance
                comparison = first.useCount.compare(second.useCount)
            case .createdAt:
                comparison = first.createdAt.compare(second.createdAt)
            case .updatedAt:
                comparison = first.updatedAt.compare(second.updatedAt)
            case .useCount:
                comparison = first.useCount.compare(second.useCount)
            case .lastUsed:
                let firstLastUsed = first.lastUsed ?? Date.distantPast
                let secondLastUsed = second.lastUsed ?? Date.distantPast
                comparison = firstLastUsed.compare(secondLastUsed)
            case .content:
                comparison = first.content.compare(second.content)
            }
            
            return sortOrder == .ascending ? comparison == .orderedAscending : comparison == .orderedDescending
        }
    }
    
    // MARK: - Statistics
    
    func getMemoryStats() -> MemoryStats {
        let projects = Set(memories.compactMap { $0.project })
        let allTags = memories.flatMap { $0.tags }
        let tagSet = Set(allTags)
        
        let projectBreakdown = Dictionary(grouping: memories, by: { $0.project ?? "No Project" })
            .mapValues { $0.count }
        
        let tagBreakdown = Dictionary(grouping: allTags, by: { $0 })
            .mapValues { $0.count }
        
        let mostUsedMemory = memories.max { $0.useCount < $1.useCount }
        let recentMemories = memories.filter { $0.isRecent }.prefix(5).map { $0 }
        
        return MemoryStats(
            totalMemories: memories.count,
            totalProjects: projects.count,
            totalTags: tagSet.count,
            mostUsedMemory: mostUsedMemory,
            recentMemories: Array(recentMemories),
            projectBreakdown: projectBreakdown,
            tagBreakdown: tagBreakdown
        )
    }
    
    // MARK: - Available Filters
    
    var availableProjects: [String] {
        let projects = Set(memories.compactMap { $0.project })
        return Array(projects).sorted()
    }
    
    var availableTags: [String] {
        let allTags = Set(memories.flatMap { $0.tags })
        return Array(allTags).sorted()
    }
}
