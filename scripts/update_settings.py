import os
import json

# Get the current working directory
current_path = os.getcwd()

# Define the path to your settings.json file
settings_path = r"C:\zephyrproject\.vscode\launch.json"

# Load the current settings
with open(settings_path, 'r') as file:
    settings = json.load(file)

# Update the settings with the current path
settings['configurations'][0]['executable'] = current_path + r"\build\zephyr\zephyr.elf"

# Write the updated settings back to the file
with open(settings_path, 'w') as file:
    json.dump(settings, file, indent=4)

print("Updated settings.json with the current path.")
