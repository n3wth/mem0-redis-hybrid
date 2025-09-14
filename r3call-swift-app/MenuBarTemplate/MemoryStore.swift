import Foundation
import SwiftUI

struct Memory: Codable, Identifiable {
    let id: UUID
    var content: String
    let createdAt: Date
}

class MemoryStore: ObservableObject {
    @Published var memories: [Memory] = []
    private let fileURL: URL

    init() {
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.fileURL = documentsDirectory.appendingPathComponent("r3call-memories.json")
        loadMemories()
    }

    func addMemory(content: String) {
        let newMemory = Memory(id: UUID(), content: content, createdAt: Date())
        memories.insert(newMemory, at: 0)
        saveMemories()
    }

    func deleteMemory(at offsets: IndexSet) {
        memories.remove(atOffsets: offsets)
        saveMemories()
    }
    
    private func loadMemories() {
        do {
            let data = try Data(contentsOf: fileURL)
            memories = try JSONDecoder().decode([Memory].self, from: data)
        } catch {
            // File might not exist yet, which is fine
        }
    }

    private func saveMemories() {
        do {
            let data = try JSONEncoder().encode(memories)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("Failed to save memories: \(error.localizedDescription)")
        }
    }
}
