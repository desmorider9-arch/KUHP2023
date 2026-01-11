import re

# Read the generated JS file (hacky parsing)
with open("data.js", "r") as f:
    content = f.read()

# exact json content
json_str = content[content.find('['):content.rfind(']')+1]
import json
data = json.loads(json_str)

counts = {}
for item in data:
    p = item['pasal']
    if p not in counts:
        counts[p] = 0
    counts[p] += 1

duplicates = [p for p, c in counts.items() if c > 1]
print(f"Total entries: {len(data)}")
print(f"Unique Pasals: {len(counts)}")
print(f"Duplicates: {len(duplicates)}")
print(f"First 10 duplicates: {duplicates[:10]}")

# Print detail of first duplicate
if duplicates:
    first_dup = duplicates[0]
    print(f"--- Detail for Pasal {first_dup} ---")
    for item in data:
        if item['pasal'] == first_dup:
            print(f"Bab: {item['bab']}, Content start: {item['content'][:50]}...")
