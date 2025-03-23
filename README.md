# Zephyr Build Extension

This VS Code extension simplifies the process of building and flashing Zephyr firmware, particularly for Microchip devices. It provides a user-friendly sidebar interface to manage common Zephyr commands, automate dependency installation, and streamline your Zephyr development workflow.

## Features

* **Sidebar Interface:** A dedicated sidebar view for easy access to Zephyr build and flash commands.
* **Dependency Installation:** Automatically checks for and installs required VS Code extensions, ensuring a smooth development environment.
* **Terminal Integration:** Opens a dedicated Zephyr terminal for build and flash commands.
* **Project Path Selection:** Allows users to easily select the Zephyr project folder.
* **Build Configuration:** Provides options for board selection, clean builds, and configuration targets (menuconfig/guiconfig).
* **Flash Command:** A simple button to execute the `west flash` command.

**Screenshot:**

(You would add a screenshot here if you have one. For example: `![Zephyr Build Sidebar](images/zephyr-build-sidebar.png)`)

## Requirements

* Visual Studio Code (version 1.98.0 or later).
* Zephyr RTOS development environment set up on your system.
* `west` command-line tool installed and accessible in your system's PATH.

## Extension Settings

This extension does not currently contribute any VS Code settings.

## Known Issues

* Currently, the extension assumes that the `west` command is available in the system's PATH. Future versions may include settings to configure the `west` executable path.
* Error handling for build and flash commands is basic. Future versions will include more robust error reporting and user feedback.

## Release Notes

### 0.0.1

* Initial release of the Zephyr Build extension.
* Added sidebar view with build and flash controls.
* Implemented automatic dependency installation.
* Integrated terminal functionality for Zephyr commands.
* Added project path selection.
* Provided configuration options for build commands.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**