import SwiftUI
import AppKit

// --- Data Model & Store ---
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
        NotificationCenter.default.post(name: .memoriesChanged, object: nil)
    }
    
    func deleteMemory(withId id: UUID) {
        memories.removeAll { $0.id == id }
        saveMemories()
        NotificationCenter.default.post(name: .memoriesChanged, object: nil)
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

extension Notification.Name {
    static let memoriesChanged = Notification.Name("memoriesChanged")
}

// --- Add Memory Window (SwiftUI View) ---
struct AddMemoryView: View {
    @State private var memoryContent: String = ""
    var memoryStore: MemoryStore
    var window: NSWindow?

    var body: some View {
        VStack {
            Text("Add a new memory").font(.headline).padding()
            TextEditor(text: $memoryContent)
                .padding()
                .frame(minHeight: 100)
                .border(Color.gray, width: 1)
            HStack {
                Button("Cancel") { window?.close() }
                Button("Save") {
                    if !memoryContent.isEmpty {
                        memoryStore.addMemory(content: memoryContent)
                        window?.close()
                    }
                }
            }.padding()
        }.padding().frame(width: 300, height: 250)
    }
}

// --- Main Application Logic (AppKit AppDelegate) ---
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    let memoryStore = MemoryStore()
    var addMemoryWindow: NSWindow?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "star.fill", accessibilityDescription: "R3call")
        }
        setupMenu()
        
        NotificationCenter.default.addObserver(self, selector: #selector(setupMenu), name: .memoriesChanged, object: nil)
    }

    @objc func setupMenu() {
        let menu = NSMenu()
        
        menu.addItem(withTitle: "Add Memory...", action: #selector(addMemoryAction), keyEquivalent: "n")
        menu.addItem(NSMenuItem.separator())

        let recentMemories = memoryStore.memories.prefix(10)
        if recentMemories.isEmpty {
            menu.addItem(withTitle: "No memories yet.", action: nil, keyEquivalent: "")
        } else {
            recentMemories.forEach { memory in
                let menuItem = NSMenuItem(title: memory.content, action: #selector(memoryAction), keyEquivalent: "")
                menuItem.representedObject = memory.id
                menu.addItem(menuItem)
            }
        }
        
        menu.addItem(NSMenuItem.separator())
        menu.addItem(withTitle: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        
        statusItem.menu = menu
    }

    @objc func addMemoryAction() {
        if addMemoryWindow == nil {
            let contentView = AddMemoryView(memoryStore: memoryStore)
            let hostingView = NSHostingView(rootView: contentView)
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 300, height: 250),
                styleMask: [.titled, .closable],
                backing: .buffered, defer: false
            )
            window.center()
            window.setFrameAutosaveName("Add Memory")
            window.contentView = hostingView
            addMemoryWindow = window
            // Pass the window reference to the view
            (hostingView.rootView as! AddMemoryView).window = window
        }

        NSApp.activate(ignoringOtherApps: true)
        addMemoryWindow?.makeKeyAndOrderFront(nil)
    }

    @objc func memoryAction(sender: NSMenuItem) {
        if NSEvent.modifierFlags.contains(.option), let memoryId = sender.representedObject as? UUID {
            memoryStore.deleteMemory(withId: memoryId)
        }
    }
}

// --- Application Entry Point ---
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
