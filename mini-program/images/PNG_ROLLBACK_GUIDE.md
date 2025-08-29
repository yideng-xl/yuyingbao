# PNG 格式回滚指南

## 📋 回滚原因

微信小程序报错提示："只支持png jpg jpeg格式"，因此需要将SVG格式回滚到PNG格式。

## ✅ 完成的回滚操作

### 1. 🧭 底部导航图标 (app.json)
**已回滚为**:
- home.svg → home.png
- home-active.svg → home-active.png  
- record.svg → record.png
- record-active.svg → record-active.png
- stats.svg → stats.png
- stats-active.svg → stats-active.png
- knowledge.svg → knowledge.png
- knowledge-active.svg → knowledge-active.png
- profile.svg → profile.png
- profile-active.svg → profile-active.png

### 2. 👤 头像图片引用
**修改的文件**:
- pages/index/index.wxml
- pages/profile/profile.wxml  
- pages/profile/profile.js

**回滚内容**:
- default-avatar.svg → default-avatar.png
- baby-default.svg → baby-default.png
- baby-boy.svg → baby-boy.png
- baby-girl.svg → baby-girl.png

### 3. 📚 知识库文章配图 (pages/knowledge/knowledge.js)
**已创建PNG文件**:
- article-newborn-feeding.png (新生儿喂养指南)
- article-diaper-guide.png (大便颜色解读)
- article-growth-chart.png (成长发育里程碑)  
- article-solid-food.png (辅食添加指南)

## 📊 文件状态

### PNG文件 (已存在)
| 类型 | 文件名 | 状态 |
|------|--------|------|
| 导航图标 | home.png, home-active.png | ✅ 已存在 |
| 导航图标 | record.png, record-active.png | ✅ 已存在 |
| 导航图标 | stats.png, stats-active.png | ✅ 已存在 |
| 导航图标 | knowledge.png, knowledge-active.png | ✅ 已存在 |
| 导航图标 | profile.png, profile-active.png | ✅ 已存在 |
| 头像图片 | default-avatar.png | ✅ 已存在 |
| 头像图片 | baby-default.png, baby-boy.png, baby-girl.png | ✅ 已存在 |

### PNG文件 (新创建)
| 类型 | 文件名 | 状态 |
|------|--------|------|
| 文章配图 | article-newborn-feeding.png | ✅ 已创建 |
| 文章配图 | article-diaper-guide.png | ✅ 已创建 |
| 文章配图 | article-growth-chart.png | ✅ 已创建 |
| 文章配图 | article-solid-food.png | ✅ 已创建 |

## 🗑️ 可删除文件

### SVG文件 (可删除)
由于微信小程序不支持SVG格式，以下SVG文件可以安全删除：

**导航图标**:
- home.svg, home-active.svg
- record.svg, record-active.svg
- stats.svg, stats-active.svg
- knowledge.svg, knowledge-active.svg  
- profile.svg, profile-active.svg

**头像图片**:
- default-avatar.svg
- baby-default.svg, baby-boy.svg, baby-girl.svg

**功能图标**:
- feeding-breastfeeding.svg
- feeding-bottle.svg
- feeding-formula.svg
- feeding-solid.svg
- diaper.svg
- growth.svg

**文章配图**:
- article-newborn-feeding.svg
- article-diaper-guide.svg
- article-growth-chart.svg
- article-solid-food.svg

### 删除命令
```bash
# 删除所有SVG文件
del d:\AI\QoderWorkspaces\yuyingbao\mini-program\images\*.svg
```

## ✅ 验证检查

### 需要测试的功能
- [ ] 底部导航图标正常显示
- [ ] 图标选中/未选中状态切换
- [ ] 用户头像正常加载
- [ ] 宝宝头像根据性别正确显示  
- [ ] 知识库文章配图正确展示
- [ ] 小程序编译无报错

## 📝 总结

**回滚时间**: 2025年8月25日  
**修改文件**: 5个代码文件  
**创建文件**: 4个PNG配图文件  
**状态**: ✅ 回滚完成，符合微信小程序格式要求

现在所有图片引用都使用PNG格式，符合微信小程序的格式限制要求。