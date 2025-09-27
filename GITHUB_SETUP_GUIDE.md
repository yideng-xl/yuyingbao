# GitHub 同步配置指南

## 🔐 身份验证设置

GitHub 现在要求使用 Personal Access Token (PAT) 进行身份验证，而不是密码。

### 步骤 1: 创建 Personal Access Token

1. 访问 GitHub: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置 Token 名称，例如："yuyingbao-development"
4. 设置过期时间（建议选择 90 天或自定义）
5. 选择权限范围（scopes）：
   - ✅ `repo` - 完整的仓库访问权限
   - ✅ `workflow` - 工作流权限（如果需要 GitHub Actions）
6. 点击 "Generate token"
7. **重要**: 复制生成的 token，页面刷新后将无法再次查看

### 步骤 2: 配置 Git 认证

#### 方式一：使用 Git Credential Manager（推荐）

```bash
# 推送时会自动弹出认证窗口
git push -u origin main
# 用户名：westxixia
# 密码：粘贴您的 Personal Access Token
```

#### 方式二：在 URL 中包含用户名

```
# 更新远程仓库 URL
git remote set-url origin https://yideng-xl@github.com/yideng-xl/yuyingbao.git

# 推送（只需要输入 token 作为密码）
git push -u origin main
```

#### 方式三：使用 Git Credential Store

```bash
# 配置 credential store（一次性配置）
git config --global credential.helper store

# 首次推送时输入认证信息
git push -u origin main
# 用户名：yideng-xl
# 密码：您的 Personal Access Token

# 认证信息会被保存，后续推送无需再次输入
```

### 步骤 3: 完成推送

```bash
cd /Users/xulei/Workspaces/QoderWorkspaces/yuyingbao
git push -u origin main
```

## 📋 当前配置状态

✅ Git 仓库已初始化
✅ 用户信息已配置
✅ 远程仓库已添加
✅ 文件已提交到本地
✅ README.md 和 .gitignore 已创建

待完成：
- 🔐 GitHub Personal Access Token 认证
- 📤 推送代码到远程仓库

## 🚀 后续使用

### 日常开发流程

```bash
# 1. 修改代码后，添加到暂存区
git add .

# 2. 提交更改
git commit -m "feat: 添加新功能"

# 3. 推送到 GitHub
git push origin main
```

### 版本管理流程

#### 创建版本标签
```bash
# 为v0.5版本创建标签
git tag -a v0.5.0 -m "Release version 0.5.0 - MVP版本"

# 推送标签到GitHub
git push origin v0.5.0

# 推送所有标签
git push origin --tags
```

#### 创建版本分支
```bash
# 为v0.6开发创建分支
git checkout -b release/v0.6

# 推送分支到GitHub
git push origin release/v0.6
```

#### 版本发布流程
```bash
# 1. 完成开发后，合并到main分支
git checkout main
git merge release/v0.6

# 2. 创建版本标签
git tag -a v0.6.0 -m "Release version 0.6.0 - 多宝宝支持版本"

# 3. 推送所有更改
git push origin main
git push origin v0.6.0
```

### 常用 Git 命令

```bash
# 查看状态
git status

# 查看提交历史
git log --oneline

# 查看标签
git tag -l

# 查看分支
git branch -a

# 拉取远程更新
git pull origin main

# 创建新分支
git checkout -b feature/new-feature

# 合并分支
git checkout main
git merge feature/new-feature
```

## 🔧 故障排除

### 认证失败
- 确保使用 Personal Access Token 而不是 GitHub 密码
- 检查 Token 权限是否包含 `repo` 范围
- 确认 Token 未过期

### 推送被拒绝
```bash
# 如果远程有更新，先拉取
git pull origin main --rebase
git push origin main
```

### 重置远程 URL
```bash
# 如果需要重新配置远程仓库
git remote remove origin
git remote add origin https://github.com/yideng-xl/yuyingbao.git
```

## 📦 版本发布最佳实践

### 版本命名规范
- 使用语义化版本控制 (SemVer): `主版本号.次版本号.修订号`
- v0.5.0: MVP版本发布
- v0.6.0: 多宝宝支持版本
- v1.0.0: 正式发布版本

### 版本文档管理
- 每个版本在 `/document` 目录下维护独立文档
- 版本文档包含: PRD、系统设计、API设计、数据库设计、发布说明
- 保持文档与代码版本同步

### 发布检查清单
- [ ] 代码测试通过
- [ ] 文档更新完成
- [ ] 版本标签创建
- [ ] GitHub Release发布
- [ ] 部署脚本更新

## 📞 需要帮助？

如果在配置过程中遇到问题，请：
1. 检查网络连接
2. 确认 GitHub 仓库已创建
3. 验证 Personal Access Token 权限
4. 查看错误信息并对应解决方案

---

*配置完成后，您的育婴宝项目就可以同步到 GitHub 了！* 🎉