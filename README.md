<!--
 * @Author: Mr.Car
 * @Date: 2025-07-17 22:11:47
-->
# Forge Deploy VSCode Extension

![演示](./demo.gif)

---

## 面向用户

- 一键部署 Solidity 智能合约到 Sepolia、Local 或自定义网络
- 支持合约自动验证（--verify）、广播（--broadcast）等选项
- 右键 .sol 文件，选择“部署智能合约”即可
- 自动识别合约、账户、网络，交互式参数输入

### 安装方法

1. 从 [VSCode 插件市场](https://marketplace.visualstudio.com/vscode) 搜索并安装 `forge-deploy`。
2. 或者下载 `.vsix` 文件后，在 VSCode 命令面板中运行 `Extensions: Install from VSIX...` 选择本地文件安装。
3. 安装后重启 VSCode。

---

## For Developers

- Node.js 版本要求：**>=18.x**
- 推荐包管理工具：**pnpm**（也可用 npm/yarn）
- TypeScript + VSCode API 开发
- 支持本地调试（F5）、热重载（pnpm run watch）
- 主要入口：`src/extension.ts`

### 项目本地测试

1. 安装依赖：`pnpm install`
2. 编译项目：`pnpm run compile`
3. 按 F5 启动 VSCode 扩展开发主机进行本地调试

如需要提交BUG修改或新特性开发，请通过 Pull Request（PR）方式提交。

---

## Changelog

### 0.0.3
- 初始版本：支持一键部署合约、账户/网络/参数交互选择、合约验证和广播选项

---

## ToDo List

- [ ] 中英文双语文档
- [ ] 国际化（i18n）支持
- [ ] 合约部署历史记录留存
- [ ] 能够自行配置rpc-url等关键参数
- [ ] 扩展目前 keystore 账户的管理方式，增加 secrect-key 的支持
- [ ] 扩展 test 和 script