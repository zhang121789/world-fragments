# 世界碎片

这是当前最终版的个人旅行回忆网站，包含首页、碎片目的地、足迹地图和本地后台。

## 本地打开

1. 双击 `start-site.bat`。
2. 打开浏览器：
   - 前台：http://localhost:3000
   - 后台：http://localhost:3000/admin

后台需要密码登录。第一次使用默认密码来自 `ADMIN_PASSWORD` 环境变量；如果没有设置，会使用本地默认值。正式上线前请进入后台修改为强密码。

## 重要文件

- `server.js`：Node.js 服务。
- `package.json`：启动配置。
- `data/site.json`：网站内容数据。
- `data/auth.json`：后台密码数据。
- `public/`：前台、后台、样式、脚本、地图资源和网页使用图片。
- `public/uploads/`：上传图片。
- `public/uploads/optimized/`：上线前生成的优化图片。
- `照片/`：原始照片备份，不参与网页运行。

## 上线前检查

- 先备份 `data/site.json`、`data/auth.json` 和 `public/uploads/`。
- 后台密码必须改成强密码。
- 部署时使用 HTTPS。
- 建议放在 Nginx、宝塔、Cloudflare、Vercel 或支持 gzip/brotli 的平台后面。
- 如果再次大量上传原图，可以运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/optimize-uploads.ps1 -MaxSize 2200 -Quality 82
```

脚本会保留原图，生成优化副本，并自动备份 `data/site.json`。

## 不要手动删除

- `data/`
- `public/assets/`
- `public/uploads/`

如需替换照片，优先进入后台上传或替换，避免网页找不到图片。
