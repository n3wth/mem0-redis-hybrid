
import Cocoa

struct Memory: Codable {
    let id: String
    let content: String
    let createdAt: String?
}

struct MemoriesResponse: Codable {
    let memories: [Memory]
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var memoriesMenu: NSMenu!

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "star.fill", accessibilityDescription: "R3call")
        }

        setupMenu()
        fetchMemorySummary()
    }

    func setupMenu() {
        memoriesMenu = NSMenu()
        updateMenuWith(count: 0, latestMemory: "Loading...")

        let refreshMenuItem = NSMenuItem(title: "Refresh", action: #selector(refreshMemories), keyEquivalent: "r")
        let quitMenuItem = NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        memoriesMenu.addItem(NSMenuItem.separator())
        memoriesMenu.addItem(refreshMenuItem)
        memoriesMenu.addItem(quitMenuItem)

        statusItem.menu = memoriesMenu
    }

    @objc func refreshMemories() {
        fetchMemorySummary()
    }

    func fetchMemorySummary() {
        let url = URL(string: "http://localhost:3030/memories?user_id=default")!
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let data = data, error == nil else {
                DispatchQueue.main.async {
                    self?.updateMenuWith(count: 0, latestMemory: "Error fetching memories")
                }
                return
            }

            do {
                let decodedResponse = try JSONDecoder().decode(MemoriesResponse.self, from: data)
                DispatchQueue.main.async {
                    let latest = decodedResponse.memories.first?.content ?? "No memories found"
                    self?.updateMenuWith(count: decodedResponse.memories.count, latestMemory: latest)
                }
            } catch {
                DispatchQueue.main.async {
                    self?.updateMenuWith(count: 0, latestMemory: "Failed to parse memories")
                }
            }
        }
        task.resume()
    }

    func updateMenuWith(count: Int, latestMemory: String) {
        // Clear old summary items
        memoriesMenu.removeAllItems()
        
        let countItem = NSMenuItem(title: "Total Memories: \(count)", action: nil, keyEquivalent: "")
        let latestMemoryItem = NSMenuItem(title: "Latest: \(latestMemory.prefix(30))...", action: nil, keyEquivalent: "")

        memoriesMenu.addItem(countItem)
        memoriesMenu.addItem(latestMemoryItem)

        // Re-add separator and static items
        memoriesMenu.addItem(NSMenuItem.separator())
        let refreshMenuItem = NSMenuItem(title: "Refresh", action: #selector(refreshMemories), keyEquivalent: "r")
        let quitMenuItem = NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        memoriesMenu.addItem(refreshMenuItem)
        memoriesMenu.addItem(quitMenuItem)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
