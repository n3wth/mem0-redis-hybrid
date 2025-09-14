import SwiftUI

struct EditMemoryView: View {
    let memory: Memory
    @ObservedObject var memoryStore: MemoryStore
    @Environment(\.dismiss) private var dismiss
    
    @State private var content: String
    @State private var project: String
    @State private var directory: String
    @State private var tags: String
    @State private var category: String
    @State private var isExecutable: Bool
    @State private var isDangerous: Bool
    @State private var requiresSudo: Bool
    @State private var customData: [String: String]
    @State private var newCustomKey: String = ""
    @State private var newCustomValue: String = ""
    @State private var showingCustomData = false
    @State private var hasChanges = false
    
    private var isFormValid: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    init(memory: Memory, memoryStore: MemoryStore) {
        self.memory = memory
        self.memoryStore = memoryStore
        
        _content = State(initialValue: memory.content)
        _project = State(initialValue: memory.project ?? "")
        _directory = State(initialValue: memory.directory ?? "")
        _tags = State(initialValue: memory.tags.joined(separator: ", "))
        _category = State(initialValue: memory.metadata.category ?? "")
        _isExecutable = State(initialValue: memory.metadata.executable ?? false)
        _isDangerous = State(initialValue: memory.metadata.dangerous ?? false)
        _requiresSudo = State(initialValue: memory.metadata.requiresSudo ?? false)
        _customData = State(initialValue: memory.metadata.customData)
    }
    
    var body: some View {
        NavigationView {
            Form {
                // Basic Information
                Section("Memory Content") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Content")
                            .font(.headline)
                        
                        TextEditor(text: $content)
                            .frame(minHeight: 100)
                            .padding(8)
                            .background(Color(NSColor.controlBackgroundColor))
                            .cornerRadius(6)
                            .onChange(of: content) { _ in checkForChanges() }
                        
                        Text("\(content.count) characters")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Organization
                Section("Organization") {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            TextField("Project", text: $project)
                                .textFieldStyle(.roundedBorder)
                                .onChange(of: project) { _ in checkForChanges() }
                            
                            TextField("Directory", text: $directory)
                                .textFieldStyle(.roundedBorder)
                                .onChange(of: directory) { _ in checkForChanges() }
                        }
                        
                        TextField("Tags (comma-separated)", text: $tags)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: tags) { _ in checkForChanges() }
                        
                        TextField("Category", text: $category)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: category) { _ in checkForChanges() }
                    }
                }
                
                // Metadata
                Section("Metadata") {
                    VStack(alignment: .leading, spacing: 12) {
                        Toggle("Executable", isOn: $isExecutable)
                            .onChange(of: isExecutable) { _ in checkForChanges() }
                        
                        Toggle("Dangerous", isOn: $isDangerous)
                            .onChange(of: isDangerous) { _ in checkForChanges() }
                        
                        Toggle("Requires Sudo", isOn: $requiresSudo)
                            .onChange(of: requiresSudo) { _ in checkForChanges() }
                    }
                }
                
                // Custom Data
                Section("Custom Data") {
                    VStack(alignment: .leading, spacing: 12) {
                        Toggle("Add Custom Data", isOn: $showingCustomData)
                        
                        if showingCustomData {
                            customDataView
                        }
                    }
                }
                
                // Memory Statistics
                Section("Statistics") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Use Count:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(memory.useCount)")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        
                        HStack {
                            Text("Created:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(memory.formattedCreatedAt)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        
                        HStack {
                            Text("Last Updated:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(memory.formattedUpdatedAt)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        
                        if let lastUsed = memory.lastUsed {
                            HStack {
                                Text("Last Used:")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(DateFormatter.localizedString(from: lastUsed, dateStyle: .medium, timeStyle: .short))
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                        }
                    }
                }
                
                // Preview
                if !content.isEmpty {
                    Section("Preview") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Memory Preview")
                                .font(.headline)
                            
                            MemoryPreviewView(
                                content: content,
                                project: project.isEmpty ? nil : project,
                                directory: directory.isEmpty ? nil : directory,
                                tags: parseTags(),
                                category: category.isEmpty ? nil : category
                            )
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Edit Memory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if hasChanges {
                            // Show confirmation dialog
                            dismiss()
                        } else {
                            dismiss()
                        }
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveMemory()
                    }
                    .disabled(!isFormValid || !hasChanges)
                }
            }
        }
        .frame(minWidth: 500, minHeight: 600)
    }
    
    // MARK: - Custom Data View
    
    private var customDataView: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(customData.keys.sorted()), id: \.self) { key in
                HStack {
                    Text(key)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(customData[key] ?? "")
                        .font(.caption)
                    
                    Spacer()
                    
                    Button("Remove") {
                        customData.removeValue(forKey: key)
                        checkForChanges()
                    }
                    .buttonStyle(.borderless)
                    .foregroundColor(.red)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(4)
            }
            
            HStack {
                TextField("Key", text: $newCustomKey)
                    .textFieldStyle(.roundedBorder)
                
                TextField("Value", text: $newCustomValue)
                    .textFieldStyle(.roundedBorder)
                
                Button("Add") {
                    if !newCustomKey.isEmpty && !newCustomValue.isEmpty {
                        customData[newCustomKey] = newCustomValue
                        newCustomKey = ""
                        newCustomValue = ""
                        checkForChanges()
                    }
                }
                .buttonStyle(.bordered)
                .disabled(newCustomKey.isEmpty || newCustomValue.isEmpty)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func parseTags() -> [String] {
        return tags.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
    
    private func checkForChanges() {
        let newTags = parseTags()
        let newCustomData = customData
        
        hasChanges = content != memory.content ||
                    project != (memory.project ?? "") ||
                    directory != (memory.directory ?? "") ||
                    newTags != memory.tags ||
                    category != (memory.metadata.category ?? "") ||
                    isExecutable != (memory.metadata.executable ?? false) ||
                    isDangerous != (memory.metadata.dangerous ?? false) ||
                    requiresSudo != (memory.metadata.requiresSudo ?? false) ||
                    newCustomData != memory.metadata.customData
    }
    
    private func saveMemory() {
        let updatedMemory = Memory(
            id: memory.id,
            content: content.trimmingCharacters(in: .whitespacesAndNewlines),
            userId: memory.userId,
            createdAt: memory.createdAt,
            updatedAt: Date(),
            project: project.isEmpty ? nil : project,
            directory: directory.isEmpty ? nil : directory,
            tags: parseTags(),
            metadata: MemoryMetadata(
                executable: isExecutable ? true : nil,
                dangerous: isDangerous ? true : nil,
                requiresSudo: requiresSudo ? true : nil,
                category: category.isEmpty ? nil : category,
                lastUsed: memory.lastUsed,
                useCount: memory.useCount,
                customData: customData
            ),
            searchText: memory.searchText,
            useCount: memory.useCount,
            lastUsed: memory.lastUsed
        )
        
        Task {
            await memoryStore.updateMemory(updatedMemory)
            await MainActor.run {
                dismiss()
            }
        }
    }
}

#Preview {
    let sampleMemory = Memory(
        content: "Sample memory content for preview",
        project: "Sample Project",
        directory: "/path/to/directory",
        tags: ["sample", "preview", "test"],
        metadata: MemoryMetadata(
            executable: true,
            dangerous: false,
            requiresSudo: false,
            category: "Development",
            customData: ["key1": "value1", "key2": "value2"]
        )
    )
    
    EditMemoryView(memory: sampleMemory, memoryStore: MemoryStore())
}
