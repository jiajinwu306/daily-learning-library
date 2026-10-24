# 每日所学

私人使用的三类学习知识库，支持 Excel 技能、心理学技巧和法律知识。手机和电脑均可通过浏览器使用。

在线使用：[每日所学](https://jiajinwu306.github.io/daily-learning-library/) · [GitHub 仓库](https://github.com/jiajinwu306/daily-learning-library)

## 本地运行

需要 Node.js 20 或更新版本。在本目录运行：

```powershell
npm install
npm run dev
```

未设置 Supabase 环境变量时，会进入明确标识的**本机预览**。预览记录只保存在当前浏览器，不能跨设备同步，也不会在配置云端后自动迁移。正式记录请先完成下面的云端配置。

## 启用私人同步

1. 创建一个 Supabase 项目，在 SQL Editor 执行 [`supabase/schema.sql`](supabase/schema.sql)。
2. 在 Supabase Authentication 设置中关闭公开注册，再创建自己的账号。确保 Email/Password 登录已开启；也可以先用管理员后台创建账号。
3. 复制 `.env.example` 为 `.env.local`，填入项目 URL 和 **publishable/anon key**。不要把 service role key 放进前端环境变量。
4. 重启开发服务器，使用个人账号登录。记录通过行级安全策略限定为当前账号可读写。

如果忘记密码，可在登录页请求重置邮件。Supabase 的 Authentication URL Configuration 中需要将正式站点地址加入 Site URL 和 Redirect URLs。

## 发布到 GitHub Pages

项目包含 `.github/workflows/deploy.yml`。创建 GitHub 仓库并推送 `main` 后：

1. 在仓库 `Settings > Secrets and variables > Actions > Variables` 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。两者是浏览器可见的公开配置，**不要**填写 service role key。
2. 在 `Settings > Pages` 将 Source 设为 **GitHub Actions**。
3. 在 `Actions` 中手动运行 `Deploy to GitHub Pages`，或之后推送 `main` 自动发布。缺少云端配置时工作流会直接失败，防止发布仅本机保存的预览版。
4. 在 Supabase `Authentication > URL Configuration` 中，将 Pages 地址设为 Site URL，并加入 Redirect URLs，确保密码重置邮件回到正确页面。本项目已配置 `https://jiajinwu306.github.io/daily-learning-library/`。

也可以执行 `npm run build`，将 `dist/` 部署到其他静态托管服务，构建时同样需要设置两个 `VITE_` 环境变量。此应用使用单路径页面，无需额外路由回退配置。

首次上线建议在手机和电脑分别登录，新增一条测试记录并确认另一端可见。已登录页面会定时刷新记录，在重新聚焦窗口时也会刷新。全量导出为 JSON，可作为个人备份。

## 开发检查

```powershell
npm test
npm run build
```
