import os

def generate_project_map(root_dir="src"):
    # Files to ignore
    ignored_files = {
        '.git', '.DS_Store', 'node_modules', '__pycache__', 
        '.env', '.vscode', 'dist', 'build', 'coverage'
    }
    
    # Extensions to include/focus on
    relevant_extensions = ('.ts', '.tsx', '.css', '.scss')

    def build_tree(path, indent=""):
        files = sorted(os.listdir(path))
        tree_str = ""
        
        for file in files:
            full_path = os.path.join(path, file)
            
            if full_path in ignored_files or not os.path.isdir(full_path) and not full_path.endswith(relevant_extensions):
                continue
                
            if os.path.isfile(full_path):
                tree_str += f"{indent}├── {file}\n"
            else:
                tree_str += f"{indent}├── {file}/\n"
                tree_str += build_tree(full_path, indent + "│   ")
        return tree_str

    print(f"### Project Structure: {root_dir}")
    if os.path.exists(root_dir):
        print(build_tree(root_dir))
    else:
        print("Source directory 'src' not found.")

if __name__ == "__main__":
    generate_project_map()