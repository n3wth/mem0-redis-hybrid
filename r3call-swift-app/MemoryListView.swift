import SwiftUI

struct MemoryListView: View {
    @StateObject private var memoryStore = MemoryStore()
    @State private var showingAddMemory = false
    @State private var selectedMemory: Memory?
    @State private var showingFilters = false
    @State private var showingExportImport = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            // Search and Filters
            searchAndFiltersView
            
            // Content
            if memoryStore.isLoading {
                loadingView
            } else if memoryStore.filteredMemories.isEmpty {
                emptyStateView
            } else {
                memoryListView
            }
        }
        .frame(minWidth: 600, minHeight: 400)
        .sheet(isPresented: $showingAddMemory) {
            AddMemoryView(memoryStore: memoryStore)
        }
        .sheet(item: $selectedMemory) { memory in
            EditMemoryView(memory: memory, memoryStore: memoryStore)
        }
        .sheet(isPresented: $showingFilters) {
            FilterView(memoryStore: memoryStore)
        }
        .sheet(isPresented: $showingExportImport) {
            ExportImportView(memoryStore: memoryStore)
        }
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Memories")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("\(memoryStore.filteredMemories.count) of \(memoryStore.memories.count) memories")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                Button(action: { showingFilters.toggle() }) {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .font(.title2)
                }
                .buttonStyle(.borderless)
                .help("Filters")
                
                Button(action: { showingExportImport = true }) {
                    Image(systemName: "square.and.arrow.up.on.square")
                        .font(.title2)
                }
                .buttonStyle(.borderless)
                .help("Export / Import")
                
                Button(action: { showingAddMemory = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.accentColor)
                }
                .buttonStyle(.borderless)
                .help("Add Memory")
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
    }
    
    // MARK: - Search and Filters View
    
    private var searchAndFiltersView: some View {
        VStack(spacing: 12) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search memories...", text: $memoryStore.searchText)
                    .textFieldStyle(.plain)
                    .onSubmit {
                        Task {
                            await memoryStore.searchMemories(memoryStore.searchText)
                        }
                    }
                
                if !memoryStore.searchText.isEmpty {
                    Button(action: { memoryStore.searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.borderless)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(NSColor.controlBackgroundColor))
            .cornerRadius(8)
            
            // Active Filters
            if !memoryStore.selectedProject.isNil || !memoryStore.selectedTags.isEmpty {
                activeFiltersView
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
    
    private var activeFiltersView: some View {
        HStack {
            Text("Active filters:")
                .font(.caption)
                .foregroundColor(.secondary)
            
            if let project = memoryStore.selectedProject {
                FilterChip(title: project, systemImage: "folder") {
                    memoryStore.selectedProject = nil
                    memoryStore.applyFilters()
                }
            }
            
            ForEach(Array(memoryStore.selectedTags), id: \.self) { tag in
                FilterChip(title: tag, systemImage: "tag") {
                    memoryStore.selectedTags.remove(tag)
                    memoryStore.applyFilters()
                }
            }
            
            Spacer()
        }
    }
    
    // MARK: - Memory List View
    
    private var memoryListView: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(memoryStore.filteredMemories) { memory in
                    MemoryRowView(memory: memory) {
                        selectedMemory = memory
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading memories...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text(memoryStore.searchText.isEmpty ? "No memories yet" : "No memories found")
                .font(.title2)
                .fontWeight(.medium)
            
            Text(memoryStore.searchText.isEmpty ? "Add your first memory to get started" : "Try adjusting your search or filters")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            if memoryStore.searchText.isEmpty {
                Button("Add Memory") {
                    showingAddMemory = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

// MARK: - Memory Row View

struct MemoryRowView: View {
    let memory: Memory
    let onTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(memory.displayTitle)
                        .font(.headline)
                        .lineLimit(2)
                    
                    if let project = memory.project {
                        Text(project)
                            .font(.caption)
                            .foregroundColor(.accentColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.accentColor.opacity(0.1))
                            .cornerRadius(4)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(memory.formattedCreatedAt)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if memory.useCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                                .font(.caption2)
                            Text("\(memory.useCount)")
                                .font(.caption2)
                        }
                        .foregroundColor(.secondary)
                    }
                }
            }
            
            if !memory.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(memory.tags, id: \.self) { tag in
                            Text(tag)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.1))
                                .cornerRadius(4)
                        }
                    }
                    .padding(.horizontal, 1)
                }
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
        .onTapGesture {
            onTap()
        }
        .contextMenu {
            Button("Edit") {
                onTap()
            }
            
            Button("Copy Content") {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(memory.content, forType: .string)
            }
            
            Divider()
            
            Button("Delete", role: .destructive) {
                Task {
                    await MemoryStore().deleteMemory(memory)
                }
            }
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let systemImage: String
    let onRemove: () -> Void
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: systemImage)
                .font(.caption2)
            
            Text(title)
                .font(.caption)
            
            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.caption2)
            }
            .buttonStyle(.borderless)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.accentColor.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Extensions

extension Optional {
    var isNil: Bool {
        return self == nil
    }
}

#Preview {
    MemoryListView()
}
