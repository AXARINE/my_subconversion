# sub2clash

订阅链接 → Clash Verge 配置 + 托盘一键更新。

## 依赖

- [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) · [Docker](https://www.docker.com/products/docker-desktop/) · [Bun](https://bun.sh/)

## 用法

```powershell
# 1. 启动 subconverter
docker run -d --name subconverter --restart=always -p 25500:25500 tindy2013/subconverter:latest

# 2. 填写订阅链接
echo "https://your-sub-url" > sub_links.txt

# 3. 命令行更新
.\sub2clash.ps1

# 或者启动托盘应用（左键点击更新）
.\tray.ps1
```

## 托盘

| 操作 | 说明 |
|------|------|
| 左键 | 更新订阅 |
| 右键 | 菜单（更新 / 开机自启 / 退出）|
| 图标色 | 🔵空闲 🟠更新中 🟢成功 🔴失败 |

## 文件

| 文件 | 用途 |
|------|------|
| `tray.py` / `tray.ps1` | 托盘应用 |
| `sub2clash.ts` / `sub2clash.ps1` | 核心逻辑 + 命令行入口 |
| `mihomo-reload.ps1` | 热重载 |
| `sub_links.txt` | 订阅链接（已 gitignore）|
| `my_direct.txt` | 直连域名（已 gitignore）|

## License

MIT
