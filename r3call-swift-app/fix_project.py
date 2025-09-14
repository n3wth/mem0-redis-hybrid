#!/usr/bin/env python3

import os
import re
import uuid

def fix_xcode_project():
    """Properly add Swift files to Xcode project"""
    
    project_file = "MenuBarApp.xcodeproj/project.pbxproj"
    
    if not os.path.exists(project_file):
        print("❌ Project file not found!")
        return
    
    print("📁 Reading Xcode project file...")
    
    # Read the project file
    with open(project_file, 'r') as f:
        content = f.read()
    
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
    
    # Generate unique IDs for the files
    file_refs = {}
    build_files = {}
    
    for file_path in files_to_add:
        if os.path.exists(file_path):
            # Generate unique IDs (24 characters)
            file_ref_id = str(uuid.uuid4()).replace('-', '').upper()[:24]
            build_file_id = str(uuid.uuid4()).replace('-', '').upper()[:24]
            
            file_refs[file_path] = file_ref_id
            build_files[file_path] = build_file_id
            
            print(f"✅ {file_path} - ID: {file_ref_id}")
        else:
            print(f"❌ File not found: {file_path}")
    
    if not file_refs:
        print("❌ No files to add!")
        return
    
    # Add file references to PBXFileReference section
    print("📝 Adding file references...")
    
    # Find the end of PBXFileReference section
    file_ref_pattern = r'(/\* End PBXFileReference section \*/)'
    
    new_file_refs = ""
    for file_path, file_id in file_refs.items():
        filename = os.path.basename(file_path)
        new_file_refs += f'\t\t{file_id} /* {filename} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{filename}"; sourceTree = "<group>"; }};\n'
    
    content = re.sub(file_ref_pattern, new_file_refs + r'\1', content)
    
    # Add build files to PBXBuildFile section
    print("🔨 Adding build files...")
    
    build_file_pattern = r'(/\* End PBXBuildFile section \*/)'
    
    new_build_files = ""
    for file_path, build_file_id in build_files.items():
        filename = os.path.basename(file_path)
        file_ref_id = file_refs[file_path]
        new_build_files += f'\t\t{build_file_id} /* {filename} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_ref_id} /* {filename} */; }};\n'
    
    content = re.sub(build_file_pattern, new_build_files + r'\1', content)
    
    # Add files to the main group
    print("📂 Adding files to main group...")
    
    # Find the main group and add files
    main_group_pattern = r'(4180AEB12839753F0054FEA9 /\* Assets\.xcassets \*/ = \{isa = PBXFileReference; lastKnownFileType = folder\.assetcatalog; path = Assets\.xcassets; sourceTree = "<group>"; \};)'
    
    new_group_files = ""
    for file_path, file_id in file_refs.items():
        filename = os.path.basename(file_path)
        new_group_files += f'\t\t\t\t{file_id} /* {filename} */,\n'
    
    content = re.sub(main_group_pattern, new_group_files + r'\1', content)
    
    # Add files to build phases
    print("⚙️ Adding files to build phases...")
    
    # Find the Sources build phase
    sources_pattern = r'(4180AEAE2839753E0054FEA9 /\* MenuBarApp\.swift in Sources \*/ = \{isa = PBXBuildFile; fileRef = 4180AEAD2839753E0054FEA9 /\* MenuBarApp\.swift \*/; \};)'
    
    new_sources = ""
    for file_path, build_file_id in build_files.items():
        filename = os.path.basename(file_path)
        new_sources += f'\t\t\t{build_file_id} /* {filename} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[file_path]} /* {filename} */; }};\n'
    
    content = re.sub(sources_pattern, new_sources + r'\1', content)
    
    # Write the updated content
    print("💾 Writing updated project file...")
    
    with open(project_file, 'w') as f:
        f.write(content)
    
    print("✅ All files added successfully!")
    print("\nNext steps:")
    print("1. Open Xcode")
    print("2. Add libsqlite3.tbd framework")
    print("3. Build the project")

if __name__ == "__main__":
    fix_xcode_project()
