import SwiftUI

struct AddMemoryView: View {
    @State private var memoryContent: String = ""
    @Environment(\.presentationMode) var presentationMode
    var memoryStore: MemoryStore

    var body: some View {
        VStack {
            Text("Add a new memory")
                .font(.headline)
                .padding()

            TextEditor(text: $memoryContent)
                .padding()
                .frame(minHeight: 100)
                .border(Color.gray, width: 1)

            HStack {
                Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }

                Button("Save") {
                    if !memoryContent.isEmpty {
                        memoryStore.addMemory(content: memoryContent)
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
            .padding()
        }
        .padding()
        .frame(width: 300, height: 250)
    }
}

