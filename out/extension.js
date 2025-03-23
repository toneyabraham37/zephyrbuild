"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
async function installMissingExtensions() {
    const dependencies = [
        'ms-vscode.cpptools', 'twxs.cmake', 'llvm-vs-code-extensions.vscode-clangd',
        'ms-vscode.cmake-tools', 'marus25.cortex-debug', 'plorefice.devicetree',
        'nordic-semiconductor.nrf-kconfig', 'jebbs.plantuml',
        'ms-vscode.vscode-serial-monitor'
    ];
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Checking & Installing Dependencies...',
        cancellable: false,
    }, async (progress) => {
        let installedCount = 0;
        for (const extensionId of dependencies) {
            const extension = vscode.extensions.getExtension(extensionId);
            if (!extension) {
                progress.report({ message: `Installing ${extensionId}...` });
                await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
                installedCount++;
            }
        }
        vscode.window.showInformationMessage(installedCount > 0 ?
            `Installed ${installedCount} missing extensions. Reload VS Code if needed.` :
            'All required extensions are already installed.');
    });
}
function getOrCreateTerminal() {
    let terminal = vscode.window.terminals.find(t => t.name === 'Zephyr Terminal');
    if (!terminal) {
        terminal = vscode.window.createTerminal('Zephyr Terminal');
    }
    terminal.show();
    return terminal;
}
function findVenvDirectory(startPath) {
    let currentDir = startPath;
    while (currentDir !== path.parse(currentDir).root) {
        const venvPath = path.join(currentDir, '.venv');
        if (fs.existsSync(venvPath) && fs.statSync(venvPath).isDirectory()) {
            return venvPath;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}
function activate(context) {
    console.log('Zephyr Build Extension Activated.');
    installMissingExtensions();
    const disposableActivateVenv = vscode.commands.registerCommand('zephyrbuild.activateVenv', () => {
        const terminal = getOrCreateTerminal();
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const venvPath = findVenvDirectory(workspacePath);
        if (venvPath) {
            terminal.sendText('. ' + path.join(venvPath, 'bin', 'activate'));
            vscode.window.showInformationMessage('Virtual environment activated.');
        }
        else {
            vscode.window.showErrorMessage('No virtual environment (.venv) found.');
        }
    });
    context.subscriptions.push(disposableActivateVenv);
    const disposableDebug = vscode.commands.registerCommand('zephyrbuild.runDebug', () => {
        vscode.commands.executeCommand('workbench.action.debug.start');
    });
    context.subscriptions.push(disposableDebug);
    const disposableTerminal = vscode.commands.registerCommand('zephyrbuild.openTerminal', () => {
        const terminal = vscode.window.terminals.find(t => t.name === 'Zephyr Terminal');
        if (terminal) {
            vscode.window.showWarningMessage('Zephyr Terminal is already open.');
        }
        else {
            getOrCreateTerminal();
        }
    });
    const disposableBuild = vscode.commands.registerCommand('zephyrbuild.runBuild', (args) => {
        const { boardName, cleanFlag, projectPath, configTarget } = args;
        if (!boardName) {
            vscode.window.showWarningMessage('No board name provided. Build canceled.');
            return;
        }
        const cleanOption = cleanFlag ? `${cleanFlag} ` : '';
        const pathOption = projectPath ? ` ${projectPath}` : '';
        const configOption = configTarget ? ` -t ${configTarget}` : '';
        const terminal = getOrCreateTerminal();
        terminal.sendText(`west build ${cleanOption}-b ${boardName}${pathOption}${configOption}`
            .trim());
    });
    const disposableFlash = vscode.commands.registerCommand('zephyrbuild.runFlash', () => {
        const terminal = getOrCreateTerminal();
        terminal.sendText('west flash');
    });
    const disposableSelectProject = vscode.commands.registerCommand('zephyrbuild.selectProject', async () => {
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Project Folder'
        });
        if (folders && folders.length > 0) {
            const selectedPath = folders[0].fsPath;
            vscode.commands.executeCommand('setContext', 'zephyrbuild.selectedProject', selectedPath);
            if (currentWebview) {
                currentWebview.webview.postMessage({ command: 'updateProjectPath', path: selectedPath });
            }
        }
    });
    const provider = new BuildViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(BuildViewProvider.viewType, provider));
    context.subscriptions.push(disposableTerminal, disposableBuild, disposableFlash, disposableSelectProject);
}
let currentWebview;
class BuildViewProvider {
    _extensionUri;
    static viewType = 'zephyrbuildView';
    _view;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        currentWebview = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'openTerminal') {
                vscode.commands.executeCommand('zephyrbuild.openTerminal');
            }
            else if (message.command === 'selectProject') {
                vscode.commands.executeCommand('zephyrbuild.selectProject');
            }
            else if (message.command === 'runBuild') {
                vscode.commands.executeCommand('zephyrbuild.runBuild', message);
            }
            else if (message.command === 'runFlash') {
                vscode.commands.executeCommand('zephyrbuild.runFlash');
            }
            else if (message.command === 'activateVenv') {
                vscode.commands.executeCommand('zephyrbuild.activateVenv');
            }
            else if (message.command === 'runDebug') {
                vscode.commands.executeCommand('zephyrbuild.runDebug');
            }
        });
    }
    getHtml() {
        return `<html>
				<head>
					<style>
						body {
							font-family: Arial, sans-serif;
							padding: 15px;
							background-color: #1e1e1e;
							color: #d4d4d4;
						}
						h2 {
							color: #4fc3f7;
						}
						.container {
							display: flex;
							flex-direction: column;
							gap: 15px;
						}
						label {
							font-weight: bold;
							margin-bottom: 5px;
						}
						input, select, button {
							padding: 8px;
							font-size: 14px;
							border-radius: 4px;
							border: none;
							background-color: #252526;
							color: #d4d4d4;
						}
						button {
							cursor: pointer;
							background-color: #007acc;
							color: white;
						}
						button:hover {
							background-color: #005f99;
						}
						.checkbox-container {
							display: flex;
							align-items: center;
							gap: 10px;
						}
					</style>
				</head>
				<body>
					<h2>Zephyr Build</h2>
					<div class="container">
						<button onclick="sendMessage('activateVenv')">Activate Virtual Environment</button>
						<div class="gap"></div>
						<button onclick="sendMessage('openTerminal')">Open Zephyr Terminal</button>

						<div>
							<label for="boardName">Board Name:</label>
							<input id="boardName" type="text" placeholder="sam_e54_xpro" />
						</div>

						<div>
							<label for="projectPath">Project Path:</label>
							<input id="projectPath" type="text" readonly />
							<button onclick="sendMessage('selectProject')">Browse</button>
						</div>

						<div class="checkbox-container">
							<input id="cleanBuild" type="checkbox" />
							<label for="cleanBuild">Perform Clean Build</label>
						</div>

						<div>
							<label for="configTarget">Configuration:</label>
							<select id="configTarget">
								<option value="">None</option>
								<option value="menuconfig">Menuconfig</option>
								<option value="guiconfig">Guiconfig</option>
							</select>
						</div>

						<div>
							<button onclick="runBuild()">Run Build</button>
							<button onclick="sendMessage('runFlash')">Run Flash</button>
							<button onclick="sendMessage('runDebug')">Run Debugger</button>

						</div>
					</div>


					<script>
						const vscode = acquireVsCodeApi();

						function sendMessage(command) {
							vscode.postMessage({ command });
						}

						function runBuild() {
							const boardName = document.getElementById('boardName').value || 'sam_e54_xpro';
							const projectPath = document.getElementById('projectPath').value;
							const cleanBuild = document.getElementById('cleanBuild').checked ? '-p always' : '';
							const configTarget = document.getElementById('configTarget').value;
							vscode.postMessage({ command: "runBuild", boardName, cleanFlag: cleanBuild, projectPath, configTarget });
						}

						window.addEventListener('message', event => {
							if (event.data.command === 'updateProjectPath') {
								document.getElementById('projectPath').value = event.data.path;
							}
						});
					</script>
				</body>
				</html>`;
    }
}
//# sourceMappingURL=extension.js.map