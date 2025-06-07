// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "imagemarkpengent" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('imagemarkpengent.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ImageMarkPengent!');
	});

	const disposableOpenImageEditor = vscode.commands.registerCommand('imagemarkpengent.openImageEditor', (uri: vscode.Uri) => {
		if (!uri || !uri.fsPath.match(/\.(png|jpg|jpeg)$/i)) {
			vscode.window.showWarningMessage('対応画像ファイル（.png, .jpg, .jpeg）を選択してください。');
			return;
		}
		vscode.window.showInformationMessage('画像編集コマンドが呼び出されました: ' + uri.fsPath);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposableOpenImageEditor);
}

// This method is called when your extension is deactivated
export function deactivate() {}
