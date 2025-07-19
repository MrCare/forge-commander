// 简单的测试文件
console.log('开始测试...');

// 模拟VSCode对象
const mockVSCode = {
    window: {
        showInformationMessage: (msg) => console.log('INFO:', msg)
    },
    commands: {
        registerCommand: (id, callback) => {
            console.log('注册命令:', id);
            return { dispose: () => {} };
        }
    }
};

// 模拟扩展上下文
const mockContext = {
    subscriptions: []
};

// 模拟require('vscode')
global.vscode = mockVSCode;

// 测试扩展代码
function activate(context) {
    console.log('插件开始激活...');
    
    // 立即显示消息，证明插件已激活
    vscode.window.showInformationMessage('🎉 Forge Deploy 插件已成功激活！');
    
    // 注册一个简单的命令
    const disposable = vscode.commands.registerCommand('forge-deploy.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Forge Deploy!');
    });
    
    context.subscriptions.push(disposable);
    console.log('插件激活完成');
}

// 运行测试
activate(mockContext);
console.log('测试完成'); 