# Runa学习助手

<img src="outputs/DeepSeek-右侧栏版/icons/icon.png" width="96" alt="Runa 图标">

本地运行的 Edge 浏览器扩展，使用自己的 AI 接口辅助学习通课程学习。TypeScript 编写，无运行时框架和后端，无需助手账号。当前公开版：**1.14.1**。

[下载安装包](https://github.com/rUN114/runa-learning-assistant/releases/latest) · [反馈问题](https://github.com/rUN114/runa-learning-assistant/issues) · [第三方来源](THIRD_PARTY_NOTICES.md)

## 安装

1. 从 Releases 下载 Runa学习助手.zip 并解压。
2. 打开 edge://extensions，开启“开发人员模式”，选择“加载解压缩的扩展”。
3. 选择包含 manifest.json 的 DeepSeek-右侧栏版文件夹。
4. 点击扩展图标打开右侧栏，在设置中填写自己的接口地址、模型和 API Key。

已有安装请保留原加载路径，替换文件后重新加载扩展并刷新课程页面。目录名保留用于兼容历史安装；扩展界面名称为 Runa学习助手。

## 主要功能

- 单个课程标签绑定的右侧栏，可收起；搜题与课程助手分开。
- 同页多视频/音频任务识别、顺序播放、有限重试和待核对清单。
- 章节测验解析、语义选项映射、暂存/提交/停留选择，保留已有人工答案。
- 四次独立上下文判断，一致采用，有分歧追加复核；默认复核跟随主模型，可自行配置不同模型。
- 原生 PPT、部分书籍和计时阅读器适配，完成状态以平台回执为准。
- 已适配的教师讨论话题支持关闭、草稿、自动回复三种模式；发布状态不明时保留记录，避免自动重复发送。
- 本地进度恢复、逐题记录、JSON 导出；无内置题库。

接口 Key 存在浏览器扩展的本地存储中，不随软件包分发。使用 AI 功能时，题干、选项或讨论内容会发往自己配置的 AI 服务；AI 请求可能产生费用。

## 范围与验证

目前优先支持学习通，其他平台未完成适配。学校定制页面、自定义跨域编辑器、部分 PDF/阅读器、直播、带图片的讨论仍有缺口。平台目录的“√”不等于测验已提交；自动流程不保证平台计入学习时长。

同模型多次一致不能证明事实正确，时间、地点、否定词及复杂题仍可能答错。公开版用 Adobe 开源字体独立生成字形表，已移除原商业插件中授权不明确的表；历史字体的识别范围与本地 1.14.0 不完全相同，无法确认的字形会进入待核对流程。

回归检查使用隔离浏览器、虚构页面、模拟 AI 和网络回执。它们不证明真实 AI 正确率、真实课程提交或真实讨论发布成功。检查记录见 [验证记录](outputs/DeepSeek-右侧栏版/验证记录.md)。

## 开发

需要 Node.js 20 或更高版本。依次运行：

    npm ci
    npm run typecheck
    npm run build
    npm run check

修改 src/*.ts 后重新构建；不要直接编辑生成的 JavaScript。HTML、CSS、manifest、图标与第三方资源位于 outputs/DeepSeek-右侧栏版/，构建保留这些静态资源。

浏览器回归另需 Playwright 和已安装的 Edge：

    npm install --no-save --package-lock=false playwright
    npm run test:browser

测试使用临时独立浏览器资料目录，不读取日常浏览器账号或 Key。默认 Windows Edge 路径为 C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe；可通过环境变量 EDGE_EXECUTABLE 指定其他位置，或用 PLAYWRIGHT_MODULE 指定已有 Playwright 模块目录。测试日志和资料目录生成到忽略的 work/，请在测试后按需清理。

| 目录 | 用途 |
| --- | --- |
| src/ | AI、课程扫描、侧栏、讨论和进度管理源码 |
| scripts/ | 构建、浏览器回归入口、字体资源生成工具 |
| tests/ | 隔离回归和开源字体测试样本 |
| outputs/DeepSeek-右侧栏版/ | 可直接加载的扩展及使用说明 |

字形表可通过 node scripts/generate-font-table.cjs <SourceHanSansSC-Normal.otf> 重建。测试字体可通过 python scripts/generate-font-fixtures.py <SourceHanSansSC-Normal.otf> 重建，另需 fonttools；这些工具不是扩展运行依赖。字体来源和散列值见第三方声明。

## 许可与贡献

本项目自行编写的源码采用 [MIT](LICENSE) 许可。OCS、Typr.js、MD5 和字体资源保留各自许可，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。Runa 名称与人物图标是项目标识，源码 MIT 许可不授予这些标识的独占使用或商标权。

欢迎提交 Issue 和 Pull Request。反馈请附扩展版本、复现步骤及脱敏后的页面结构，勿上传 API Key、账户信息、带签名的课程链接或真实学习记录。
