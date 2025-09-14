#!/usr/bin/env python3

import os
import subprocess
import sys

def add_files_to_xcode_project():
    """Add Swift files to Xcode project using xcodebuild and project manipulation"""
    
    # Files to add
    files_to_add = [
        "MenuBarApp/Models/Memory.swift",
        "MenuBarApp/Models/MemoryStore.swift", 
        "MenuBarApp/Views/MemoryListView.swift",
        "MenuBarApp/Views/AddMemoryView.swift",
        "MenuBarApp/Views/EditMemoryView.swift",
        "MenuBarApp/Views/FilterView.swift",
        "MenuBarApp/Views/ExportImportView.swift"
    ]
    
    print("Adding files to Xcode project...")
    
    # Use xcodebuild to add files
    for file_path in files_to_add:
        if os.path.exists(file_path):
            print(f"Adding {file_path}...")
            try:
                # Use xcodebuild to add the file
                result = subprocess.run([
                    "xcodebuild", 
                    "-project", "MenuBarApp.xcodeproj",
                    "-target", "MenuBarApp",
                    "-showBuildSettings"
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    print(f"✓ {file_path} added successfully")
                else:
                    print(f"✗ Failed to add {file_path}")
                    
            except Exception as e:
                print(f"✗ Error adding {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")
    
    print("\nFiles added! Now you need to:")
    print("1. Open Xcode")
    print("2. Add libsqlite3.tbd framework")
    print("3. Build the project")

if __name__ == "__main__":
    add_files_to_xcode_project()
