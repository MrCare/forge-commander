/*
 * @Author: Mr.Car
 * @Date: 2025-07-17 22:11:47
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as process from 'process';

interface ContractInfo {
    name: string;
    file: string;
    line: number;
}

interface AccountInfo {
    raw: string;
    accountName: string;
    // 其他字段可扩展
}

interface NetworkInfo {
    name: string;
    rpcUrl: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('插件开始激活...');
    
    // 立即显示消息，证明插件已激活
    vscode.window.showInformationMessage('🎉 Forge Deploy 插件已成功激活！');
    
    // 存储终端实例的全局变量
    let forgeTerminal: vscode.Terminal | undefined;
    
    // 预定义网络配置
    const networks: NetworkInfo[] = [
        { name: 'Sepolia', rpcUrl: 'https://eth-sepolia.public.blastapi.io' },
        { name: 'Local', rpcUrl: 'http://localhost:8545' },
        { name: 'Custom', rpcUrl: '' }
    ];
    
    // 注册Hello World命令
    const helloWorldDisposable = vscode.commands.registerCommand('forge-deploy.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Forge Deploy!');
    });
    
    // 搜索文件中的合约
    async function _findContractsInFile(filePath: string): Promise<ContractInfo[]> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const contracts: ContractInfo[] = [];
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // 匹配 contract 关键字后的合约名称
                const contractMatch = line.match(/contract\s+(\w+)/);
                if (contractMatch) {
                    contracts.push({
                        name: contractMatch[1],
                        file: path.basename(filePath),
                        line: i + 1
                    });
                }
            }
            
            return contracts;
        } catch (error) {
            console.error('读取文件失败:', error);
            return [];
        }
    }
    // 解析 cast wallet list 标准输出
    function __parseWalletAccounts(output: string): { raw: string; accountName: string }[] {
        // 每一行为一个账户，格式如：NFT (Local)
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => !!line)
            .map(line => {
                // 取括号前的内容
                const match = line.match(/^([^\(]+)\s*\(/);
                return {
                    raw: line,
                    accountName: match ? match[1].trim() : line
                };
            });
    }
    
    // 获取钱包账户列表
    async function _getWalletAccounts(): Promise<AccountInfo[]> {
        return new Promise((resolve, reject) => {
            // 获取当前 shell
            const shell = process.env.SHELL || '/bin/bash';
            // 用交互式 shell 执行 cast wallet list
            const command = `${shell} -c "cast wallet list"`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                const accounts = __parseWalletAccounts(stdout);
                resolve(accounts);
            });
        });
    }
    
    // 注册智能合约部署命令
    const deployContractDisposable = vscode.commands.registerCommand('forge-deploy.deployContract', async (uri: vscode.Uri) => {
        console.log('部署合约命令被触发，URI:', uri);
        
        if (!uri) {
            vscode.window.showErrorMessage('无法获取文件路径');
            return;
        }

        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        
        // 检查是否为测试或脚本文件
        if (fileName.endsWith('.t.sol') || fileName.endsWith('.s.sol')) {
            vscode.window.showWarningMessage('测试文件(.t.sol)和脚本文件(.s.sol)不支持部署操作');
            return;
        }
        
        try {
            // 1. 搜索文件中的合约
            vscode.window.showInformationMessage(`🔍 正在搜索文件 "${fileName}" 中的合约...`);
            const contracts = await _findContractsInFile(filePath);
            
            if (contracts.length === 0) {
                vscode.window.showErrorMessage('在文件中未找到任何合约');
                return;
            }
            
            // 2. 选择合约
            const contractNames = contracts.map(c => `${c.name} (${c.file}:${c.line})`);
            const selectedContract = await vscode.window.showQuickPick(contractNames, {
                placeHolder: '选择要部署的合约'
            });
            
            if (!selectedContract) {
                return;
            }
            
            const contractName = selectedContract.split(' ')[0];
            
            // 3. 选择网络
            const networkNames = networks.map(n => n.name);
            const selectedNetwork = await vscode.window.showQuickPick(networkNames, {
                placeHolder: '选择部署网络'
            });
            
            if (!selectedNetwork) {
                return;
            }
            
            let rpcUrl = networks.find(n => n.name === selectedNetwork)?.rpcUrl || '';
            
            // 如果是自定义网络，让用户输入 RPC URL
            if (selectedNetwork === 'Custom') {
                rpcUrl = await vscode.window.showInputBox({
                    prompt: '输入自定义 RPC URL',
                    placeHolder: '例如: https://mainnet.infura.io/v3/YOUR_KEY'
                }) || '';
                
                if (!rpcUrl) {
                    vscode.window.showErrorMessage('请输入有效的 RPC URL');
                    return;
                }
            }
            
            // 4. 选择账户
            vscode.window.showInformationMessage('🔗 正在获取钱包账户列表...');
            const accounts = await _getWalletAccounts();
            
            const accountOptions = accounts.map(acc => 
                `${acc.accountName}（${acc.raw}）`
            );
            
            const selectedAccount = await vscode.window.showQuickPick(accountOptions, {
                placeHolder: '选择部署账户'
            });
            
            if (!selectedAccount) {
                return;
            }

            // 解析出 accountName
            const selectedAccountName = accounts.find(acc => selectedAccount.startsWith(acc.accountName))?.accountName || '';
            
            // 6. 是否添加 --broadcast
            const broadcastPick = await vscode.window.showQuickPick(
                [
                    { label: '添加 --broadcast', value: true },
                    { label: '不添加 --broadcast', value: false }
                ],
                { placeHolder: '选择是否添加 --broadcast 选项' }
            );

            // 7. 是否添加 --verify
            const verifyPick = await vscode.window.showQuickPick(
                [
                    { label: '添加 --verify（合约验证）', value: true },
                    { label: '不添加 --verify', value: false }
                ],
                { placeHolder: '选择是否添加 --verify（合约验证）选项' }
            );

            // 8. 输入构造函数参数
            const constructorArgs = await vscode.window.showInputBox({
                prompt: '输入构造函数参数（可选）',
                placeHolder: '例如: "Token Name" "TKN" 18'
            });

            // 9. 构建部署命令
            const deployCommand = [
                'forge create',
                `${filePath}:${contractName}`,
                `--rpc-url ${rpcUrl}`,
                `--account ${selectedAccountName}`
            ];

            if (broadcastPick && broadcastPick.value) {
                deployCommand.push('--broadcast');
            }
            if (verifyPick && verifyPick.value) {
                deployCommand.push('--verify');
            }
            if (constructorArgs) {
                deployCommand.push(`--constructor-args ${constructorArgs}`);
            }

            const finalCommand = deployCommand.join(' ');

            // 8. 确认部署
            const confirmPick = await vscode.window.showQuickPick(
                [
                    { label: '确认部署', value: true },
                    { label: '取消', value: false }
                ],
                { placeHolder: `确认部署合约 "${contractName}" 到 ${selectedNetwork} 网络？` }
            );

            if (confirmPick && confirmPick.value) {
                if (!forgeTerminal) {
                    forgeTerminal = vscode.window.createTerminal('Forge Deploy Terminal');
                }
                forgeTerminal.show();
                forgeTerminal.sendText(finalCommand);

                vscode.window.showInformationMessage(
                    `🚀 部署命令已发送，请在终端中查看部署是否成功！`
                );
            }
            
        } catch (error) {
            vscode.window.showErrorMessage(`部署过程中发生错误: ${error}`);
        }
    });
    
    // 注册生成合约ABI JSON命令
    const inspectContractDisposable = vscode.commands.registerCommand('forge-deploy.inspectContract', async (uri: vscode.Uri) => {
        console.log('生成合约ABI JSON命令被触发，URI:', uri);
        
        if (!uri) {
            vscode.window.showErrorMessage('无法获取文件路径');
            return;
        }

        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);
        
        // 检查是否为测试或脚本文件
        if (fileName.endsWith('.t.sol') || fileName.endsWith('.s.sol')) {
            vscode.window.showWarningMessage('测试文件(.t.sol)和脚本文件(.s.sol)不支持ABI生成操作');
            return;
        }
        
        try {
            // 1. 搜索文件中的合约
            vscode.window.showInformationMessage(`🔍 正在搜索文件 "${fileName}" 中的合约...`);
            const contracts = await _findContractsInFile(filePath);
            
            if (contracts.length === 0) {
                vscode.window.showErrorMessage('在文件中未找到任何合约');
                return;
            }
            
            // 2. 选择合约
            const contractNames = contracts.map(c => `${c.name} (${c.file}:${c.line})`);
            const selectedContract = await vscode.window.showQuickPick(contractNames, {
                placeHolder: '选择要生成ABI的合约'
            });
            
            if (!selectedContract) {
                return;
            }
            
            const contractName = selectedContract.split(' ')[0];
            
            // 3. 输入输出文件名
            const defaultFileName = `${contractName}_abi.json`;
            const outputFileName = await vscode.window.showInputBox({
                prompt: '输入ABI JSON文件名',
                value: defaultFileName,
                placeHolder: '例如: MyContract_abi.json'
            });
            
            if (!outputFileName) {
                return;
            }
            
            // 4. 构建inspect命令
            const outputPath = path.join(fileDir, outputFileName);
            
            // 获取工作区根目录
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('无法获取工作区根目录');
                return;
            }
            
            // 计算相对于工作区根目录的路径
            const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
            
            // 构建forge inspect命令，使用相对路径格式 src/ContractName
            const inspectCommand = `forge inspect ${relativePath}:${contractName} abi --json > "${outputFileName}"`;
            
            // 5. 确认生成
            const confirmPick = await vscode.window.showQuickPick(
                [
                    { label: '确认生成', value: true },
                    { label: '取消', value: false }
                ],
                { placeHolder: `确认为合约 "${contractName}" 生成ABI JSON文件？` }
            );

            if (confirmPick && confirmPick.value) {
                if (!forgeTerminal) {
                    forgeTerminal = vscode.window.createTerminal({
                        name: 'Forge Deploy Terminal',
                        cwd: workspaceFolder.uri.fsPath
                    });
                }
                
                forgeTerminal.show();
                forgeTerminal.sendText(inspectCommand);

                vscode.window.showInformationMessage(
                    `📄 ABI JSON生成命令已发送，文件将保存为: ${outputFileName}`
                );
            }
            
        } catch (error) {
            vscode.window.showErrorMessage(`生成ABI JSON过程中发生错误: ${error}`);
        }
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
        const fileDir = path.dirname(filePath);
        
        // 显示信息消息
        vscode.window.showInformationMessage(`🔧 正在对文件 "${fileName}" 执行脚本...`);

        // 让用户输入额外参数
        const extraArgs = await vscode.window.showInputBox({
            prompt: '输入脚本参数（可选）',
            placeHolder: '例如: --verbose --output=result.txt'
        });
        
        // 构建要执行的命令
        const command = `echo "处理文件: ${fileName}${extraArgs || ''}" && echo "文件目录: ${fileDir}" && echo "执行时间: $(date)"`;
        
        // 检查是否已有 Forge 终端
        if (!forgeTerminal) {
            // 创建新的终端
            forgeTerminal = vscode.window.createTerminal({
                name: 'Forge Deploy Terminal',
                cwd: fileDir
            });
            console.log('创建新的 Forge 终端');
        } else {
            // 检查终端是否还存在
            try {
                // 尝试发送一个空命令来检查终端是否有效
                forgeTerminal.sendText('');
            } catch (error) {
                // 如果终端已关闭，重新创建
                forgeTerminal = vscode.window.createTerminal({
                    name: 'Forge Deploy Terminal',
                    cwd: fileDir
                });
                console.log('重新创建 Forge 终端');
            }
        }
        
        // 显示终端
        forgeTerminal.show();
        
        // 在终端中执行命令
        forgeTerminal.sendText(command);
        
        // 显示成功消息
        vscode.window.showInformationMessage(`✅ 命令已在 Forge 终端中执行！`);
    });
    
    // 注册清理终端命令
    const clearTerminalDisposable = vscode.commands.registerCommand('forge-deploy.clearTerminal', () => {
        if (forgeTerminal) {
            forgeTerminal.dispose();
            forgeTerminal = undefined;
            vscode.window.showInformationMessage('🗑️ Forge 终端已清理');
        } else {
            vscode.window.showInformationMessage('没有活动的 Forge 终端');
        }
    });
    
    context.subscriptions.push(
        helloWorldDisposable, 
        deployContractDisposable,
        inspectContractDisposable,
        executeScriptDisposable, 
        clearTerminalDisposable
    );
    console.log('插件激活完成');
}

export function deactivate() {
    console.log('插件已停用');
}