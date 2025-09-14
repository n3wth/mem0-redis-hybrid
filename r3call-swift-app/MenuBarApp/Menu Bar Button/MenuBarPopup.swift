import SwiftUI

struct MenuBarPopup: View {
    @StateObject private var memoryStore = MemoryStore()
    @State private var showingMemoryManager = false
        
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Image(systemName: "brain.head.profile")
                    .font(.title2)
                    .foregroundColor(.accentColor)
                
                Text("r3call")
                    .font(.headline)
                    .fontWeight(.bold)
                
                Spacer()
            }
            .padding(.horizontal)
            .padding(.top, 8)
            
            Divider()
            
            // Quick Stats
            quickStatsView
            
            Divider()
            
            // Recent Memories
            recentMemoriesView
            
            Divider()
            
            // Actions
            actionsView
        }
        .frame(width: 300, height: 400)
        .background(Color(NSColor.windowBackgroundColor))
        .sheet(isPresented: $showingMemoryManager) {
            MemoryManagerWindow()
        }
    }
    
    // MARK: - Quick Stats View
    
    private var quickStatsView: some View {
        VStack(spacing: 8) {
            let stats = memoryStore.getMemoryStats()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(stats.totalMemories)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Memories")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(stats.totalProjects)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Projects")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(stats.totalTags)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Tags")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Recent Memories View
    
    private var recentMemoriesView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Recent Memories")
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Button("View All") {
                    showingMemoryManager = true
                }
                .buttonStyle(.borderless)
                .font(.caption)
            }
            .padding(.horizontal)
            
            if memoryStore.memories.isEmpty {
                Text("No memories yet")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            } else {
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(memoryStore.memories.prefix(5), id: \.id) { memory in
                            RecentMemoryRowView(memory: memory)
                        }
                    }
                    .padding(.horizontal)
                }
                .frame(maxHeight: 120)
            }
        }
    }
    
    // MARK: - Actions View
    
    private var actionsView: some View {
        VStack(spacing: 8) {
            Button(action: {
                showingMemoryManager = true
            }) {
                HStack {
                    Image(systemName: "list.bullet")
                    Text("Manage Memories")
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.accentColor.opacity(0.1))
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
            
            HStack(spacing: 12) {
                Button(action: {
                    AboutWindow.show()
                }) {
                    HStack {
                        Image(systemName: "info.circle")
                        Text("About")
                    }
                }
                .buttonStyle(.borderless)
                
                Spacer()
                
                Button(action: {
                    SettingsWindow.show()
                }) {
                    HStack {
                        Image(systemName: "gear")
                        Text("Settings")
                    }
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
}

// MARK: - Recent Memory Row View

struct RecentMemoryRowView: View {
    let memory: Memory
    
    var body: some View {
        HStack(spacing: 8) {
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
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(memory.formattedCreatedAt)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                if memory.useCount > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption2)
                        Text("\(memory.useCount)")
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(4)
    }
}

// MARK: - Memory Manager Window

struct MemoryManagerWindow: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        MemoryListView()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
    }
}

struct MenuBarPopup_Previews: PreviewProvider {
    static var previews: some View {
        MenuBarPopup()
    }
}