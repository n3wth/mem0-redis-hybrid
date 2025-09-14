import SwiftUI
import UniformTypeIdentifiers

struct ExportImportView: View {
    @ObservedObject var memoryStore: MemoryStore
    @Environment(\.dismiss) private var dismiss
    
    @State private var exportFormat: ExportFormat = .json
    @State private var includeMetadata: Bool = true
    @State private var selectedMemories: Set<String> = []
    @State private var showingFilePicker = false
    @State private var showingExportDialog = false
    @State private var exportData: Data?
    @State private var importData: Data?
    @State private var importError: String?
    @State private var isImporting = false
    @State private var isExporting = false
    
    enum ExportFormat: String, CaseIterable {
        case json = "json"
        case csv = "csv"
        case txt = "txt"
        
        var displayName: String {
            switch self {
            case .json: return "JSON"
            case .csv: return "CSV"
            case .txt: return "Plain Text"
            }
        }
        
        var fileExtension: String {
            return rawValue
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Export Section
                exportSection
                
                Divider()
                
                // Import Section
                importSection
                
                Spacer()
            }
            .padding()
            .navigationTitle("Export / Import")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
        .frame(minWidth: 500, minHeight: 400)
        .fileExporter(
            isPresented: $showingExportDialog,
            document: ExportDocument(data: exportData),
            contentType: UTType.json,
            defaultFilename: "memories_export"
        ) { result in
            switch result {
            case .success(let url):
                print("Export successful: \(url)")
            case .failure(let error):
                print("Export failed: \(error)")
            }
        }
        .fileImporter(
            isPresented: $showingFilePicker,
            allowedContentTypes: [.json, .commaSeparatedText, .plainText],
            allowsMultipleSelection: false
        ) { result in
            handleFileImport(result)
        }
    }
    
    // MARK: - Export Section
    
    private var exportSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Export Memories")
                .font(.headline)
                .fontWeight(.bold)
            
            VStack(alignment: .leading, spacing: 12) {
                // Export Format
                Picker("Format", selection: $exportFormat) {
                    ForEach(ExportFormat.allCases, id: \.self) { format in
                        Text(format.displayName)
                            .tag(format)
                    }
                }
                .pickerStyle(.segmentedControl)
                
                // Options
                Toggle("Include Metadata", isOn: $includeMetadata)
                
                // Memory Selection
                memorySelectionView
            }
            
            // Export Button
            Button(action: exportMemories) {
                HStack {
                    if isExporting {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "square.and.arrow.up")
                    }
                    Text(isExporting ? "Exporting..." : "Export Memories")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isExporting || selectedMemories.isEmpty)
        }
    }
    
    // MARK: - Import Section
    
    private var importSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Import Memories")
                .font(.headline)
                .fontWeight(.bold)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Select a file to import memories from")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let error = importError {
                    Text("Error: \(error)")
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(8)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(6)
                }
            }
            
            // Import Button
            Button(action: { showingFilePicker = true }) {
                HStack {
                    if isImporting {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "square.and.arrow.down")
                    }
                    Text(isImporting ? "Importing..." : "Import Memories")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(isImporting)
        }
    }
    
    // MARK: - Memory Selection View
    
    private var memorySelectionView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Select Memories to Export")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Button(selectedMemories.count == memoryStore.memories.count ? "Deselect All" : "Select All") {
                    if selectedMemories.count == memoryStore.memories.count {
                        selectedMemories.removeAll()
                    } else {
                        selectedMemories = Set(memoryStore.memories.map { $0.id })
                    }
                }
                .buttonStyle(.borderless)
                .font(.caption)
            }
            
            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(memoryStore.memories) { memory in
                        MemorySelectionRow(
                            memory: memory,
                            isSelected: selectedMemories.contains(memory.id)
                        ) { isSelected in
                            if isSelected {
                                selectedMemories.insert(memory.id)
                            } else {
                                selectedMemories.remove(memory.id)
                            }
                        }
                    }
                }
            }
            .frame(maxHeight: 200)
            .background(Color(NSColor.controlBackgroundColor))
            .cornerRadius(8)
        }
    }
    
    // MARK: - Helper Methods
    
    private func exportMemories() {
        isExporting = true
        
        Task {
            let memoriesToExport = memoryStore.memories.filter { selectedMemories.contains($0.id) }
            
            do {
                let data = try await generateExportData(memories: memoriesToExport)
                
                await MainActor.run {
                    self.exportData = data
                    self.showingExportDialog = true
                    self.isExporting = false
                }
            } catch {
                await MainActor.run {
                    self.importError = "Export failed: \(error.localizedDescription)"
                    self.isExporting = false
                }
            }
        }
    }
    
    private func generateExportData(memories: [Memory]) async throws -> Data {
        switch exportFormat {
        case .json:
            return try JSONEncoder().encode(ExportData(
                memories: memories,
                includeMetadata: includeMetadata,
                exportedAt: Date()
            ))
        case .csv:
            return try generateCSVData(memories: memories)
        case .txt:
            return try generateTextData(memories: memories)
        }
    }
    
    private func generateCSVData(memories: [Memory]) throws -> Data {
        var csv = "id,content,project,directory,tags,created_at,updated_at,use_count\n"
        
        for memory in memories {
            let tags = memory.tags.joined(separator: ";")
            let createdAt = ISO8601DateFormatter().string(from: memory.createdAt)
            let updatedAt = ISO8601DateFormatter().string(from: memory.updatedAt)
            
            csv += "\"\(memory.id)\",\"\(memory.content)\",\"\(memory.project ?? "")\",\"\(memory.directory ?? "")\",\"\(tags)\",\"\(createdAt)\",\"\(updatedAt)\",\"\(memory.useCount)\"\n"
        }
        
        return csv.data(using: .utf8) ?? Data()
    }
    
    private func generateTextData(memories: [Memory]) throws -> Data {
        var text = "r3call Memory Export\n"
        text += "Generated: \(DateFormatter.localizedString(from: Date(), dateStyle: .full, timeStyle: .short))\n"
        text += "Total Memories: \(memories.count)\n\n"
        text += String(repeating: "=", count: 50) + "\n\n"
        
        for (index, memory) in memories.enumerated() {
            text += "Memory \(index + 1)\n"
            text += String(repeating: "-", count: 20) + "\n"
            text += "ID: \(memory.id)\n"
            text += "Content: \(memory.content)\n"
            
            if let project = memory.project {
                text += "Project: \(project)\n"
            }
            
            if let directory = memory.directory {
                text += "Directory: \(directory)\n"
            }
            
            if !memory.tags.isEmpty {
                text += "Tags: \(memory.tags.joined(separator: ", "))\n"
            }
            
            text += "Created: \(memory.formattedCreatedAt)\n"
            text += "Updated: \(memory.formattedUpdatedAt)\n"
            text += "Use Count: \(memory.useCount)\n"
            
            if includeMetadata {
                text += "Metadata:\n"
                if let executable = memory.metadata.executable {
                    text += "  Executable: \(executable)\n"
                }
                if let dangerous = memory.metadata.dangerous {
                    text += "  Dangerous: \(dangerous)\n"
                }
                if let requiresSudo = memory.metadata.requiresSudo {
                    text += "  Requires Sudo: \(requiresSudo)\n"
                }
                if let category = memory.metadata.category {
                    text += "  Category: \(category)\n"
                }
                if !memory.metadata.customData.isEmpty {
                    text += "  Custom Data:\n"
                    for (key, value) in memory.metadata.customData {
                        text += "    \(key): \(value)\n"
                    }
                }
            }
            
            text += "\n" + String(repeating: "=", count: 50) + "\n\n"
        }
        
        return text.data(using: .utf8) ?? Data()
    }
    
    private func handleFileImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            
            Task {
                do {
                    let data = try Data(contentsOf: url)
                    try await importMemories(from: data)
                } catch {
                    await MainActor.run {
                        self.importError = "Failed to read file: \(error.localizedDescription)"
                    }
                }
            }
            
        case .failure(let error):
            importError = "File selection failed: \(error.localizedDescription)"
        }
    }
    
    private func importMemories(from data: Data) async throws {
        isImporting = true
        importError = nil
        
        do {
            let exportData = try JSONDecoder().decode(ExportData.self, from: data)
            
            for memory in exportData.memories {
                await memoryStore.addMemory(memory)
            }
            
            await MainActor.run {
                self.isImporting = false
            }
        } catch {
            await MainActor.run {
                self.importError = "Failed to import: \(error.localizedDescription)"
                self.isImporting = false
            }
        }
    }
}

// MARK: - Memory Selection Row

struct MemorySelectionRow: View {
    let memory: Memory
    let isSelected: Bool
    let onToggle: (Bool) -> Void
    
    var body: some View {
        HStack {
            Button(action: {
                onToggle(!isSelected)
            }) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .accentColor : .secondary)
            }
            .buttonStyle(.borderless)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(memory.displayTitle)
                    .font(.caption)
                    .lineLimit(1)
                
                if let project = memory.project {
                    Text(project)
                        .font(.caption2)
                        .foregroundColor(.accentColor)
                }
            }
            
            Spacer()
            
            Text(memory.formattedCreatedAt)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
        .cornerRadius(4)
    }
}

// MARK: - Export Document

struct ExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    
    let data: Data?
    
    init(data: Data?) {
        self.data = data
    }
    
    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.data = data
    }
    
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        guard let data = data else {
            throw CocoaError(.fileWriteInvalidData)
        }
        return FileWrapper(regularFileWithContents: data)
    }
}

// MARK: - Export Data

struct ExportData: Codable {
    let memories: [Memory]
    let includeMetadata: Bool
    let exportedAt: Date
    let version: String = "1.0"
}

#Preview {
    ExportImportView(memoryStore: MemoryStore())
}
