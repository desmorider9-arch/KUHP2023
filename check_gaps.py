import json

with open("data.js", "r") as f:
    content = f.read()

json_str = content[content.find('['):content.rfind(']')+1]
data = json.loads(json_str)

found_ids = set()
for item in data:
    try:
        found_ids.add(int(item['pasal']))
    except:
        pass

missing = []
for i in range(1, 625):
    if i not in found_ids:
        missing.append(i)

print(f"Missing Pasals ({len(missing)}): {missing}")
