# 第三方来源与许可

项目自身源码采用 MIT；以下组件和字体素材保留原许可。

## OCS

来源：https://github.com/ocsjs/ocsjs

固定提交：84be4cbf09181d697b15d83d8f0b8a7a2f11a788。src/glyph.ts 改编其位图字形渲染、参考表解析和匹配实现；部分页面适配参考其题型、分组小题、编辑器和任务分类思路。

Copyright (c) 2022 enncy，MIT。完整许可：outputs/DeepSeek-右侧栏版/lib/OCS-LICENSE.txt。

font_ref_cx.bin 来源：https://cdn.ocsjs.com/resources/font/font_ref_cx.bin，758936 字节，SHA256 CCD62711C2B401B8C851C28FD51B9903F14FB9D10EE6BAE2C043EB51CF05EC4F。其字形来源为 Source Han Sans，相关字体许可一并保留。

## Typr.js 与 MD5

lib/TyprMd5.js 从以下官方固定版本源码重新组合，未使用商业插件的合并包装代码：

- https://github.com/photopea/Typr.js/blob/15aa12ffa6cf39e8788562ea4af65b42317375fb/src/Typr.js
- https://github.com/photopea/Typr.js/blob/f4fcdeb8014edc75ab7296bd85ac9cde8cb30489/src/Typr.U.js
- https://github.com/blueimp/JavaScript-MD5/blob/v2.19.0/js/md5.min.js

MV3 兼容修改：window.TextEncoder、window.TextDecoder 改为 globalThis。

Typr.js 为 Copyright (c) 2016 Photopea，MD5 为 Copyright © 2011 Sebastian Tschan，两者采用 MIT。完整许可随扩展保留：lib/Typr-LICENSE.txt、lib/MD5-LICENSE.txt。

## Adobe Source Han Sans

官方来源：https://github.com/adobe-fonts/source-han-sans

使用资源：官方 release/OTF/SimplifiedChinese/SourceHanSansSC-Normal.otf。原字体 SHA256：7e5b7e586262f5e187c3397935b3a0dfbe28e08a916be0f60ec7fee2b50abd6d。

lib/font-table.js 由该字体通过 scripts/generate-font-table.cjs 独立生成，共 20902 个无冲突字形散列；不包含原商业插件的字形表。

tests/fixtures/*.otf 由该字体子集与码点置换生成，字体名称已改为 Runa Test Glyphs，生成过程见 scripts/generate-font-fixtures.py。

字体与衍生字形资源遵循 SIL Open Font License 1.1，不改授 MIT。完整许可：outputs/DeepSeek-右侧栏版/lib/SourceHanSans-LICENSE.txt。

## Runa 图标

图标由 AI 图像工具依照用户提供的人物参考图生成，使用银白发、月亮、星星和黑猫元素。公开包包含生成的项目图标，不包含原参考图片；未复制原商业插件的品牌图标。源码 MIT 许可不改变第三方对人物设计等可能拥有的权利。

## 开发依赖

TypeScript 与 Chrome 类型声明仅用于构建；Playwright 用于可选的隔离浏览器回归；fontTools 用于可选测试资源生成。各工具遵循上游自身许可，不作为扩展运行时脚本分发。
