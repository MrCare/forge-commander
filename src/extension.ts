/*
 * @Author: Mr.Car
 * @Date: 2025-07-17 22:11:47
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('插件开始激活...');
    
    // 立即显示消息，证明插件已激活
    vscode.window.showInformationMessage('🎉 Forge Deploy 插件已成功激活！');
    
    // 注册Hello World命令
    const helloWorldDisposable = vscode.commands.registerCommand('forge-deploy.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Forge Deploy!');
    });
    
    // 注册执行脚本命令
    const executeScriptDisposable = vscode.commands.registerCommand('forge-deploy.executeScript', async (uri: vscode.Uri) => {
        console.log('执行脚本命令被触发，URI:', uri);
        
        if (!uri) {
            vscode.window.showErrorMessage('无法获取文件路径');
            return;
        }

        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        
        // 显示信息消息
        vscode.window.showInformationMessage(`🔧 正在对文件 "${fileName}" 执行脚本...`);

        // 让用户输入额外参数
        const extraArgs = await vscode.window.showInputBox({
            prompt: '输入脚本参数（可选）',
            placeHolder: '例如: --verbose --output=result.txt'
        });
        
        // 执行echo命令
        const command = `echo "处理文件: ${fileName}${extraArgs || ''}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`执行脚本时发生错误: ${error.message}`);
                return;
            }
            
            if (stderr) {
                vscode.window.showWarningMessage(`脚本执行警告: ${stderr}`);
            }
            
            // 显示执行结果
            vscode.window.showInformationMessage(`✅ 脚本执行完成: ${stdout.trim()}`);
            
            // 在输出面板中显示结果
            const outputChannel = vscode.window.createOutputChannel('自定义脚本输出');
            outputChannel.clear();
            outputChannel.appendLine(`=== 脚本执行日志 ===`);
            outputChannel.appendLine(`执行时间: ${new Date().toLocaleString()}`);
            outputChannel.appendLine(`文件路径: ${filePath}`);
            outputChannel.appendLine(`文件名: ${fileName}`);
            outputChannel.appendLine(`执行结果: ${stdout}`);
            outputChannel.appendLine(`=== 执行完成 ===`);
            outputChannel.show();
        });
    });
    
    context.subscriptions.push(helloWorldDisposable, executeScriptDisposable);
    console.log('插件激活完成');
}

export function deactivate() {
    console.log('插件已停用');
}