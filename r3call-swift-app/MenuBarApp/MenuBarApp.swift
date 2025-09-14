import SwiftUI

// Data Model
struct Memory: Codable, Identifiable {
    let id: UUID
    var content: String
    let createdAt: Date
}

// Data Store
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
        } catch {}
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

// Add Memory Window View
struct AddMemoryView: View {
    @State private var memoryContent: String = ""
    @Environment(\.presentationMode) var presentationMode
    var memoryStore: MemoryStore

    var body: some View {
        VStack {
            Text("Add a new memory")
                .font(.headline)
                .padding()

            TextEditor(text: $memoryContent)
                .padding()
                .frame(minHeight: 100)
                .border(Color.gray, width: 1)

            HStack {
                Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }

                Button("Save") {
                    if !memoryContent.isEmpty {
                        memoryStore.addMemory(content: memoryContent)
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
            .padding()
        }
        .padding()
        .frame(width: 300, height: 250)
    }
}


@main
struct MenuBarApp: App {
    
    @StateObject private var memoryStore = MemoryStore()

    var body: some Scene {
        MenuBarExtra("R3call", systemImage: "star.fill") {
            Button("Add Memory...") {
                openAddMemoryWindow()
            }
            
            Divider()
            
            ForEach(memoryStore.memories.prefix(10)) { memory in
                Text(memory.content)
            }
            
            Divider()
            
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
        }
    }
    
    func openAddMemoryWindow() {
        var window: NSWindow!
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 300, height: 250),
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.setFrameAutosaveName("Add Memory")
        let contentView = AddMemoryView(memoryStore: memoryStore)
        window.contentView = NSHostingView(rootView: contentView)
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
