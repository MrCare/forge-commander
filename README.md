# Forge Deploy

一个VSCode插件，用于在文件浏览器中右键执行自定义脚本。

## 功能

- 在文件浏览器中右键点击文件
- 选择"执行自定义脚本"选项
- 自动将文件名传递给脚本执行

## 使用方法

1. 在文件浏览器中右键点击任意文件
2. 从右键菜单中选择"执行自定义脚本"
3. 查看执行结果

## 命令

- `forge-deploy.helloWorld` - 显示Hello World消息
- `forge-deploy.executeScript` - 执行自定义脚本

## 安装

从VSCode市场安装或手动安装.vsix文件。

## 开发

```bash
# 安装依赖
pnpm install

# 编译
pnpm run compile

# 调试
按F5启动调试
```
