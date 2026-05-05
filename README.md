# 华强买瓜素材雷达

一个面向 B 站华强买瓜相关视频 Up 主的统计网站，用来做三件事：

- 看这个梗最近有没有新变体
- 找值得拆解学习的高表现样本
- 快速查看常见标签、作者分布、时长结构

## 技术栈

- Next.js 16 + App Router
- TypeScript
- Prisma
- Tailwind CSS 4
- MySQL

## 数据来源

- B 站接口：`/home/base/bilibili-mcp`
- 已部署 REST API：默认 `http://127.0.0.1:8012`
- 本地数据库配置参考：`/home/base/greenlab`
- 当前 `.env.example` 默认按本机访问 MySQL 3306 编写；如果和 `/home/base/docker-compose.yml` 放在同一 Docker 网络内，可把 `DATABASE_URL` 主机改成 `shared-mysql`

## 已实现内容

- 首页数据总览
- 月度投稿 / 播放趋势图
- 时长分布图
- 常见标签统计
- 高覆盖 Up 主榜单
- 学习样本推荐卡片
- 完整素材库列表页
- 一键同步脚本：搜索视频 → 拉取详情 → 补抓部分 AI 字幕 → 写入本地 MySQL

## 快速开始

1. 安装依赖

   `npm install`

2. 复制环境变量

   `cp .env.example .env`

3. 创建数据库（如果还没有）

   `mysql -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS gua CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`

4. 生成 Prisma Client

   `npm run prisma:generate`

5. 初始化数据库结构

   `npm run prisma:migrate -- --name init`

6. 启动开发环境

   `npm run dev`

7. 首次抓取样本

   - 方式一：打开首页点击“抓取最新样本”
   - 方式二：命令行执行 `npm run sync`

## 环境变量

关键配置见 `.env.example`：

- `DATABASE_URL`：本地 MySQL 连接串
- `BILIBILI_API_BASE_URL`：Bilibili MCP Flask API 地址
- `BILIBILI_SYNC_KEYWORDS`：默认抓取关键词
- `BILIBILI_SYNC_PAGES`：每个关键词抓取页数
- `BILIBILI_SYNC_PAGE_SIZE`：每页数量
- `BILIBILI_SUBTITLE_LIMIT`：单次同步最多补抓多少条字幕

## Docker 部署

项目现在包含 `Dockerfile`，并已适配 `output: "standalone"` 的 Next.js 自托管方式。

如果接入 `/home/base/docker-compose.yml`：

- 服务名建议使用 `gua`
- 容器内数据库地址应改为 `shared-mysql`
- 容器内 B 站接口地址应改为 `http://bilibili-mcp:8001`
- 首次部署前请确认 MySQL 中已存在 `gua` 数据库

## 后续可继续扩展

- 给素材库加搜索、筛选、排序
- 增加按标签 / Up 主 / 分区的详情页
- 做标题模板分析和字幕高频句提取
- 增加定时同步任务
- 增加“最近 7 天新样本”与“冷门高互动样本”榜单
