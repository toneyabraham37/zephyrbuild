import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

async function installMissingExtensions() {
	const dependencies = [
		'ms-vscode.cpptools', 'twxs.cmake', 'llvm-vs-code-extensions.vscode-clangd',
		'ms-vscode.cmake-tools', 'marus25.cortex-debug', 'plorefice.devicetree',
		'nordic-semiconductor.nrf-kconfig', 'jebbs.plantuml',
		'ms-vscode.vscode-serial-monitor'
	];

	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Checking & Installing Dependencies...',
			cancellable: false,
		},
		async (progress) => {
			let installedCount = 0;

			for (const extensionId of dependencies) {
				const extension = vscode.extensions.getExtension(extensionId);
				if (!extension) {
					progress.report({ message: `Installing ${extensionId}...` });
					await vscode.commands.executeCommand(
						'workbench.extensions.installExtension', extensionId);
					installedCount++;
				}
			}

			vscode.window.showInformationMessage(
				installedCount > 0 ?
					`Installed ${installedCount} missing extensions. Reload VS Code if needed.` :
					'All required extensions are already installed.');
		});
}

function getOrCreateTerminal() {
	let terminal =
		vscode.window.terminals.find(t => t.name === 'Zephyr Terminal');
	if (!terminal) {
		terminal = vscode.window.createTerminal('Zephyr Terminal');
	}
	terminal.show();
	return terminal;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Zephyr Build Extension Activated.');

	installMissingExtensions();

	const disposableTerminal =
		vscode.commands.registerCommand('zephyrbuild.openTerminal', () => {
			const terminal =
				vscode.window.terminals.find(t => t.name === 'Zephyr Terminal');
			if (terminal) {
				vscode.window.showWarningMessage('Zephyr Terminal is already open.');
			} else {
				getOrCreateTerminal();
			}
		});

	const disposableBuild =
		vscode.commands.registerCommand('zephyrbuild.runBuild', (args) => {
			const { boardName, cleanFlag, projectPath, configTarget } = args;
			if (!boardName) {
				vscode.window.showWarningMessage(
					'No board name provided. Build canceled.');
				return;
			}

			const cleanOption = cleanFlag ? `${cleanFlag} ` : '';
			const pathOption = projectPath ? ` ${projectPath}` : '';
			const configOption = configTarget ? ` -t ${configTarget}` : '';
			const terminal = getOrCreateTerminal();
			terminal.sendText(`west build ${cleanOption}-b ${boardName}${pathOption}${configOption}`
				.trim());
		});

	const disposableFlash =
		vscode.commands.registerCommand('zephyrbuild.runFlash', () => {
			const terminal = getOrCreateTerminal();
			terminal.sendText('west flash');
		});

	const disposableSelectProject =
		vscode.commands.registerCommand('zephyrbuild.selectProject', async () => {
			const folders = await vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: 'Select Project Folder'
			});
			if (folders && folders.length > 0) {
				const selectedPath = folders[0].fsPath;
				vscode.commands.executeCommand(
					'setContext', 'zephyrbuild.selectedProject', selectedPath);
				if (currentWebview) {
					currentWebview.webview.postMessage(
						{ command: 'updateProjectPath', path: selectedPath });
				}
			}
		});

	const provider = new BuildViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(
		BuildViewProvider.viewType, provider));

	context.subscriptions.push(
		disposableTerminal, disposableBuild, disposableFlash,
		disposableSelectProject);
}

let currentWebview: vscode.WebviewView | undefined;

class BuildViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'zephyrbuildView';
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) { }

	resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;
		currentWebview = webviewView;
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = this.getHtml();

		webviewView.webview.onDidReceiveMessage(message => {
			if (message.command === 'openTerminal') {
				vscode.commands.executeCommand('zephyrbuild.openTerminal');
			} else if (message.command === 'selectProject') {
				vscode.commands.executeCommand('zephyrbuild.selectProject');
			} else if (message.command === 'runBuild') {
				vscode.commands.executeCommand('zephyrbuild.runBuild', message);
			} else if (message.command === 'runFlash') {
				vscode.commands.executeCommand('zephyrbuild.runFlash');
			}
		});
	}

	getHtml() {
		return `
            <html>
                <body>
                    <h2>Zephyr Build</h2>
                    <button onclick="sendMessage('openTerminal')">Open Terminal</button>
                    <br>
                    <label for="boardName">Board Name:</label>
                    <input id="boardName" type="text" placeholder="sam_e54_xpro" />
                    <br>
                    <label for="projectPath">Project Path:</label>
                    <input id="projectPath" type="text" readonly />
                    <button onclick="sendMessage('selectProject')">Browse</button>
                    <br>
                    <label for="cleanBuild">Clean Build:</label>
                    <input id="cleanBuild" type="checkbox" />
                    <br>
                    <label for="configTarget">GUI/Menu Config:</label>
                    <select id="configTarget">
                      <option value="">None</option>
                      <option value="menuconfig">Menuconfig</option>
                      <option value="guiconfig">Guiconfig</option>
                    </select>
                    <br>
                    <button onclick="runBuild()">Run Build</button>
                    <button onclick="sendMessage('runFlash')">Run Flash</button>
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