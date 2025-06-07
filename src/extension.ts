// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const path = require('path');
import { getWebviewContent } from './webviewContent';

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

		const panel = vscode.window.createWebviewPanel(
			'imageEditor',
			'ImageMarkPengent',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.dirname(uri.fsPath))]
			}
		);

		const imageSrc = panel.webview.asWebviewUri(uri);
		panel.webview.html = getWebviewContent(imageSrc.toString());

		// WebViewからのメッセージ受信（保存処理）
		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.type === 'save-image' && message.dataUrl) {
				// ファイル保存ダイアログを表示
				const uriSave = await vscode.window.showSaveDialog({
					filters: { 'PNG Images': ['png'] },
					saveLabel: '画像として保存'
				});
				if (!uriSave) return;
				// dataUrlからbase64部分を抽出
				const base64 = message.dataUrl.replace(/^data:image\/png;base64,/, '');
				const buffer = Buffer.from(base64, 'base64');
				const fs = require('fs');
				fs.writeFile(uriSave.fsPath, buffer, (err: any) => {
					if (err) {
						vscode.window.showErrorMessage('画像の保存に失敗しました: ' + err.message);
					} else {
						vscode.window.showInformationMessage('画像を保存しました: ' + uriSave.fsPath);
					}
				});
			}
		});
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposableOpenImageEditor);
}

