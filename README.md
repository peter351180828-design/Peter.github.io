# 个人摄影档案 V3

这是一个面向个人长期使用的摄影档案网站。

## V3 架构

- GitHub Pages：托管 HTML / CSS / JavaScript
- Supabase Database：保存照片元数据与 EXIF
- Supabase Storage：保存网页 JPEG
- Supabase Auth：保护管理后台
- 浏览器端 exifr：上传前读取 EXIF

V3 不再需要 Node、Express、npm、服务器、`uploads/` 或 `photos.json`。

## 第一次部署

请直接双击打开：

**`部署说明.html`**

这份说明针对零基础用户编写，不需要命令行。

## 你唯一需要在 GitHub 修改的文件

`assets/js/config.js`

填写：

1. Supabase Project URL
2. Supabase Publishable key
3. 你希望显示的网站名字

不要把 Supabase Secret key 放进任何网页文件。

## 上传后发生什么

1. 浏览器读取原文件 EXIF。
2. 只保存相机、镜头、焦段、光圈、快门、ISO、曝光补偿、拍摄时间等字段。
3. 不保存 GPS 纬度/经度。
4. 浏览器生成最长边约 2560px 的 JPEG。
5. 生成后的网页 JPEG 上传到 Supabase Storage。
6. EXIF 与系列信息写入 Supabase Database。
7. 首页、档案、作品详情、统计自动读取同一套数据。

## 支持的上传格式

当前后台选择器支持：JPEG、PNG、WebP。

如果你最看重 EXIF 完整度，建议优先使用相机导出的 JPEG。社交平台转存图和部分修图 App 可能已经移除 EXIF。

RAW 原片建议继续保存在本地硬盘 / NAS，不要直接上传到网站。

## 日常入口

- 首页：`index.html`
- 全部照片：`archive.html`
- 数据统计：`stats.html`
- 管理后台：`admin.html`

部署完成以后，你日常主要只需要使用 `admin.html`。
