import SwiftUI

@main
struct MenuBarTemplateApp: App {
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

            Button("View All Memories") {
                openAllMemoriesWindow()
            }
            
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
        }
    }
    
    func openAddMemoryWindow() {
        var window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 300, height: 250),
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.setFrameAutosaveName("Add Memory")
        window.contentView = NSHostingView(rootView: AddMemoryView(memoryStore: memoryStore))
        window.makeKeyAndOrderFront(nil)
    }
    
    func openAllMemoriesWindow() {
        // We will implement this view later
    }
}

