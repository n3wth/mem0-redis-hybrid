import SwiftUI

struct AddMemoryView: View {
    @ObservedObject var memoryStore: MemoryStore
    @Environment(\.dismiss) private var dismiss
    
    @State private var content: String = ""
    @State private var project: String = ""
    @State private var directory: String = ""
    @State private var tags: String = ""
    @State private var category: String = ""
    @State private var isExecutable: Bool = false
    @State private var isDangerous: Bool = false
    @State private var requiresSudo: Bool = false
    @State private var customData: [String: String] = [:]
    @State private var newCustomKey: String = ""
    @State private var newCustomValue: String = ""
    @State private var showingCustomData = false
    
    private var isFormValid: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
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
                            
                            TextField("Directory", text: $directory)
                                .textFieldStyle(.roundedBorder)
                        }
                        
                        TextField("Tags (comma-separated)", text: $tags)
                            .textFieldStyle(.roundedBorder)
                        
                        TextField("Category", text: $category)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                
                // Metadata
                Section("Metadata") {
                    VStack(alignment: .leading, spacing: 12) {
                        Toggle("Executable", isOn: $isExecutable)
                        Toggle("Dangerous", isOn: $isDangerous)
                        Toggle("Requires Sudo", isOn: $requiresSudo)
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
            .navigationTitle("Add Memory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveMemory()
                    }
                    .disabled(!isFormValid)
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
    
    private func saveMemory() {
        let memory = Memory(
            content: content.trimmingCharacters(in: .whitespacesAndNewlines),
            project: project.isEmpty ? nil : project,
            directory: directory.isEmpty ? nil : directory,
            tags: parseTags(),
            metadata: MemoryMetadata(
                executable: isExecutable ? true : nil,
                dangerous: isDangerous ? true : nil,
                requiresSudo: requiresSudo ? true : nil,
                category: category.isEmpty ? nil : category,
                customData: customData
            )
        )
        
        Task {
            await memoryStore.addMemory(memory)
            await MainActor.run {
                dismiss()
            }
        }
    }
}

// MARK: - Memory Preview View

struct MemoryPreviewView: View {
    let content: String
    let project: String?
    let directory: String?
    let tags: [String]
    let category: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(content)
                .font(.body)
                .lineLimit(3)
            
            HStack {
                if let project = project {
                    Label(project, systemImage: "folder")
                        .font(.caption)
                        .foregroundColor(.accentColor)
                }
                
                if let directory = directory {
                    Label(directory, systemImage: "folder.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let category = category {
                    Label(category, systemImage: "tag")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            
            if !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(tags, id: \.self) { tag in
                            Text(tag)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.1))
                                .cornerRadius(4)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
    }
}

#Preview {
    AddMemoryView(memoryStore: MemoryStore())
}
