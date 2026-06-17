# sub2clash

一键订阅转 Clash Verge 配置 + 系统托盘快捷更新。

## 功能

- 从订阅链接自动拉取节点（通过 subconverter）
- 注入 ACL4SSR 全量分流规则（国内直连 / 国外代理 / 广告拦截）
- 自定义直连域名
- 系统托盘一键更新（左键点击即可）
- 通过 Mihomo 命名管道 API 热重载（无需重启 Clash Verge）
- 开机自启

## 前置条件

- [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Bun](https://bun.sh/)（运行时）

## 快速开始

### 1. 启动 subconverter

```powershell
docker run -d --name subconverter --restart=always -p 25500:25500 tindy2013/subconverter:latest
```

### 2. 配置订阅链接

编辑 `sub_links.txt`，每行放一个订阅链接：

```
https://your-provider.com/sub?token=your_token
```

### 3. 配置直连域名（可选）

编辑 `my_direct.txt`，每行放一个域名：

```
bilibili.com
zhihu.com
```

### 4. 运行

```powershell
# 命令行更新
.\sub2clash.ps1

# 启动托盘应用
.\tray.ps1
```

### 5. 打包成独立 exe（可选）

```powershell
uv run --with pyinstaller --with pillow --with pystray pyinstaller --onefile --windowed --hidden-import=pystray._win32 --name sub2clash-tray tray.py
```

生成的 `dist/sub2clash-tray.exe` 不需要 Python 环境，可直接运行。

## 托盘应用

| 操作 | 说明 |
|------|------|
| 左键点击 | 更新订阅 |
| 右键菜单 | 更新订阅 / 开机自启 / 退出 |
| 图标颜色 | 🔵 空闲 🟠 更新中 🟢 成功 🔴 失败 |

## 文件说明

| 文件 | 用途 |
|------|------|
| `tray.py` | 系统托盘应用 |
| `sub2clash.ts` | 核心逻辑（拉取→规则→部署→热重载） |
| `mihomo-reload.ps1` | Mihomo 命名管道热重载 |
| `sub2clash.ps1` | 命令行入口 |
| `tray.ps1` | 托盘应用启动器 |
| `sub_links.txt` | 订阅链接（git 忽略） |
| `my_direct.txt` | 直连域名（git 忽略） |

## 原理

```
subconverter (Docker)
    ↓ 拉取订阅 + 注入 ACL4SSR 规则
sub2clash.ts
    ↓ YAML 解析 → 代理组重构 → 规则组名映射 → 直连域名注入
Clash Verge profiles 目录
    ↓ NamedPipeClientStream → PUT /configs?force=true
Mihomo 内核热重载
```

## License

MIT
