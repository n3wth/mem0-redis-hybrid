import Cocoa

struct Memory: Codable, Identifiable {
    let id: UUID
    var content: String
    let createdAt: Date
}

class MemoryStore {
    private var memories: [Memory] = []
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

    func getMemories() -> [Memory] {
        return memories
    }
    
    func deleteMemory(withId id: UUID) {
        memories.removeAll { $0.id == id }
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


// --- New View Controller ---
protocol AddMemoryDelegate: AnyObject {
    func didSave(content: String)
}

class AddMemoryViewController: NSViewController {
    weak var delegate: AddMemoryDelegate?
    private let textField = NSTextField()

    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 300, height: 120))
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        textField.frame = NSRect(x: 20, y: 60, width: 260, height: 24)
        textField.placeholderString = "Enter your memory here"
        view.addSubview(textField)

        let saveButton = NSButton(title: "Save", target: self, action: #selector(saveMemory))
        saveButton.frame = NSRect(x: 200, y: 20, width: 80, height: 24)
        view.addSubview(saveButton)

        let cancelButton = NSButton(title: "Cancel", target: self, action: #selector(cancel))
        cancelButton.frame = NSRect(x: 110, y: 20, width: 80, height: 24)
        view.addSubview(cancelButton)
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        view.window?.makeFirstResponder(textField)
    }

    @objc private func saveMemory() {
        let content = textField.stringValue
        if !content.isEmpty {
            delegate?.didSave(content: content)
            textField.stringValue = ""
            view.window?.close()
        }
    }

    @objc private func cancel() {
        textField.stringValue = ""
        view.window?.close()
    }
}

// --- New Window Controller ---
class AddMemoryWindowController: NSWindowController {
    convenience init(delegate: AddMemoryDelegate) {
        let viewController = AddMemoryViewController()
        viewController.delegate = delegate
        let window = NSWindow(contentViewController: viewController)
        window.title = "Add New Memory"
        window.styleMask.remove(.resizable)
        self.init(window: window)
    }
}


class AppDelegate: NSObject, NSApplicationDelegate, AddMemoryDelegate {
    var statusItem: NSStatusItem!
    var memoryStore = MemoryStore()
    private var addMemoryWindowController: AddMemoryWindowController?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "star.fill", accessibilityDescription: "R3call")
        }
        setupMenu()
    }

    func setupMenu() {
        let menu = NSMenu()
        menu.addItem(withTitle: "Add Memory...", action: #selector(addMemoryAction), keyEquivalent: "n")
        menu.addItem(NSMenuItem.separator())

        let recentMemories = memoryStore.getMemories().prefix(10)
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
        NSApp.activate(ignoringOtherApps: true)
        addMemoryWindowController = AddMemoryWindowController(delegate: self)
        addMemoryWindowController?.window?.center()
        addMemoryWindowController?.showWindow(self)
    }

    @objc func memoryAction(sender: NSMenuItem) {
        if NSEvent.modifierFlags.contains(.option), let memoryId = sender.representedObject as? UUID {
            memoryStore.deleteMemory(withId: memoryId)
            setupMenu()
        }
    }
    
    // MARK: - AddMemoryDelegate
    func didSave(content: String) {
        memoryStore.addMemory(content: content)
        setupMenu()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
