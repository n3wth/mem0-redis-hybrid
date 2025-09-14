import SwiftUI

struct FilterView: View {
    @ObservedObject var memoryStore: MemoryStore
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedProject: String?
    @State private var selectedTags: Set<String> = []
    @State private var sortOption: SortOption = .relevance
    @State private var sortOrder: SortOrder = .descending
    
    var body: some View {
        NavigationView {
            Form {
                // Project Filter
                Section("Project") {
                    Picker("Project", selection: $selectedProject) {
                        Text("All Projects")
                            .tag(nil as String?)
                        
                        ForEach(memoryStore.availableProjects, id: \.self) { project in
                            Text(project)
                                .tag(project as String?)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                // Tags Filter
                Section("Tags") {
                    if memoryStore.availableTags.isEmpty {
                        Text("No tags available")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    } else {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                            ForEach(memoryStore.availableTags, id: \.self) { tag in
                                TagToggleView(
                                    tag: tag,
                                    isSelected: selectedTags.contains(tag)
                                ) { isSelected in
                                    if isSelected {
                                        selectedTags.insert(tag)
                                    } else {
                                        selectedTags.remove(tag)
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Sorting Options
                Section("Sorting") {
                    VStack(alignment: .leading, spacing: 12) {
                        Picker("Sort By", selection: $sortOption) {
                            ForEach(SortOption.allCases, id: \.self) { option in
                                Text(option.displayName)
                                    .tag(option)
                            }
                        }
                        .pickerStyle(.menu)
                        
                        Picker("Order", selection: $sortOrder) {
                            ForEach(SortOrder.allCases, id: \.self) { order in
                                Text(order.displayName)
                                    .tag(order)
                            }
                        }
                        .pickerStyle(.segmentedControl)
                    }
                }
                
                // Active Filters Summary
                Section("Active Filters") {
                    VStack(alignment: .leading, spacing: 8) {
                        if selectedProject == nil && selectedTags.isEmpty {
                            Text("No filters applied")
                                .foregroundColor(.secondary)
                                .font(.caption)
                        } else {
                            if let project = selectedProject {
                                FilterSummaryItem(
                                    icon: "folder",
                                    title: "Project",
                                    value: project
                                )
                            }
                            
                            if !selectedTags.isEmpty {
                                FilterSummaryItem(
                                    icon: "tag",
                                    title: "Tags",
                                    value: "\(selectedTags.count) selected"
                                )
                            }
                        }
                    }
                }
                
                // Statistics
                Section("Statistics") {
                    let stats = memoryStore.getMemoryStats()
                    
                    VStack(alignment: .leading, spacing: 8) {
                        StatisticRow(title: "Total Memories", value: "\(stats.totalMemories)")
                        StatisticRow(title: "Projects", value: "\(stats.totalProjects)")
                        StatisticRow(title: "Tags", value: "\(stats.totalTags)")
                        
                        if let mostUsed = stats.mostUsedMemory {
                            StatisticRow(
                                title: "Most Used",
                                value: "\(mostUsed.useCount) times"
                            )
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        applyFilters()
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button("Clear All") {
                        clearAllFilters()
                    }
                }
            }
        }
        .frame(minWidth: 400, minHeight: 500)
        .onAppear {
            loadCurrentFilters()
        }
    }
    
    // MARK: - Helper Methods
    
    private func loadCurrentFilters() {
        selectedProject = memoryStore.selectedProject
        selectedTags = memoryStore.selectedTags
        sortOption = memoryStore.sortOption
        sortOrder = memoryStore.sortOrder
    }
    
    private func applyFilters() {
        memoryStore.selectedProject = selectedProject
        memoryStore.selectedTags = selectedTags
        memoryStore.sortOption = sortOption
        memoryStore.sortOrder = sortOrder
        memoryStore.applyFilters()
        dismiss()
    }
    
    private func clearAllFilters() {
        selectedProject = nil
        selectedTags.removeAll()
        sortOption = .relevance
        sortOrder = .descending
    }
}

// MARK: - Tag Toggle View

struct TagToggleView: View {
    let tag: String
    let isSelected: Bool
    let onToggle: (Bool) -> Void
    
    var body: some View {
        Button(action: {
            onToggle(!isSelected)
        }) {
            HStack {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .accentColor : .secondary)
                
                Text(tag)
                    .font(.caption)
                    .foregroundColor(.primary)
                
                Spacer()
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                isSelected ? Color.accentColor.opacity(0.1) : Color.clear
            )
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(
                        isSelected ? Color.accentColor : Color.secondary.opacity(0.3),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Filter Summary Item

struct FilterSummaryItem: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.accentColor)
                .frame(width: 16)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Statistic Row

struct StatisticRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Extensions

extension SortOption {
    var displayName: String {
        switch self {
        case .relevance:
            return "Relevance"
        case .createdAt:
            return "Created Date"
        case .updatedAt:
            return "Updated Date"
        case .useCount:
            return "Use Count"
        case .lastUsed:
            return "Last Used"
        case .content:
            return "Content"
        }
    }
}

extension SortOrder {
    var displayName: String {
        switch self {
        case .ascending:
            return "Ascending"
        case .descending:
            return "Descending"
        }
    }
}

#Preview {
    FilterView(memoryStore: MemoryStore())
}
