import re
import json

files = ["BUKU I .txt", "BUKU II.txt", "last_part.txt"]
output_file = "www/data.js"
log_file = "debug_log.txt"

data = []
log_entries = []

current_bab = ""
current_bagian = ""
current_paragraf = ""
current_pasal = None
current_content = []

def normalize_pasal_number(text):
    text = text.replace(' ', '')
    text = text.replace('l', '1').replace('L', '1')
    text = text.replace('O', '0').replace('o', '0')
    return text

def is_pasal_header(line):
    # Pre-fix known typos
    if "Pasa7" in line:
        line = line.replace("Pasa7", "Pasal ")
    if "Pasai" in line:
        line = line.replace("Pasai", "Pasal ")
    if "Pasal2" in line:
        pass # Regex will catch `Pasal2l2` as `2l2`? No, regex needs space.
             # Wait, regex is `^Pasal\s+`. If `Pasal2`, no space.
    
    # Fix missing space after Pasal
    if re.match(r'^Pasal\d', line, re.IGNORECASE):
        line = line.replace("Pasal", "Pasal ")
    
    # Fix (1)Pasal case
    if "(1)Pasal" in line:
        # This usually means the previous line ended with (1)? Or (1) is garbage?
        # Treat as just Pasal
        line = line.replace("(1)Pasal", "Pasal") 

    # Fix Pasal T -> Pasal 7
    if "Pasal T" in line:
        line = line.replace("Pasal T", "Pasal 7")
    
    match = re.match(r'^Pasal\s+([0-9lLOo]+(?:\s+[0-9lLOo]+)*)(.*)', line, re.IGNORECASE)
    
    if match:
        number_part = match.group(1)
        remainder = match.group(2).strip()
        
        if remainder:
            if remainder[0].islower():
                return None
            if remainder[0] in [',', '.', ';', ':']:
                return None
            if remainder.startswith("dan ") or remainder.startswith("atau "):
                return None
            
        return number_part, remainder
        
    return None

def flush_pasal():
    global current_pasal, current_content
    if current_pasal:
        content_str = "\n".join(current_content).strip()
        data.append({
            "bab": current_bab,
            "bagian": current_bagian,
            "paragraf": current_paragraf,
            "pasal": current_pasal,
            "content": content_str
        })
    current_pasal = None
    current_content = []

for filename in files:
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"File not found: {filename}")
        continue
    
    line_num = 0
    for line in lines:
        line_num += 1
        line = line.strip()
        if not line:
            continue

        if line.upper().startswith("BAB "):
            flush_pasal()
            current_bab = line
            current_bagian = "" 
            current_paragraf = ""
            continue
        
        if line.startswith("Bagian "):
            flush_pasal()
            current_bagian = line
            current_paragraf = ""
            continue
            
        if line.startswith("Paragraf "):
            flush_pasal()
            current_paragraf = line
            continue

        temp_line = line
        pasal_info = is_pasal_header(temp_line)
        
        if pasal_info:
            flush_pasal()
            raw_num, remainder = pasal_info
            clean_num = normalize_pasal_number(raw_num)
            
            log_entries.append(f"Found Pasal {clean_num} in {filename} line {line_num}. Remainder: '{remainder}'")
            
            current_pasal = clean_num
            if remainder:
                current_content.append(remainder)
        else:
            if current_pasal:
                current_content.append(line)

flush_pasal()

unique_data = {}
for item in data:
    p = item['pasal']
    if p in unique_data:
        log_entries.append(f"WARNING: Duplicate Pasal {p} found. Overwriting.")
    unique_data[p] = item

def sort_key(k):
    try:
        return int(k)
    except:
        return 999999

sorted_pasals = sorted(unique_data.keys(), key=sort_key)
final_list = [unique_data[k] for k in sorted_pasals]

print(f"Total Unique Pasal found: {len(final_list)}")

with open(log_file, "w") as f:
    f.write("\n".join(log_entries))

js_content = f"const kuhpData = {json.dumps(final_list, indent=2)};"
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(js_content)
