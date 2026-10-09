# 创作工具箱

公开访问：https://stanlll-cloud.github.io/creator-tools/

包含 Markdown 转公众号排版、Markdown 转 X 排版、封面生成、二维码工具。

本地使用请参阅「本地使用说明.md」。公众号草稿发布为可选功能，需要自行配置，见 server/README.md。

## 来源与许可

基于 https://github.com/eternityspring/article-tools 修改，遵循 Apache 2.0 许可，原 LICENSE 已保留。
本版本修改首页、默认封面文案和示例文章，移除原作者社群推广及外部工具推广入口。

## X 文章导出

入口：x-export.html。支持公开帖子与 X Article，图文提取、编辑、PDF 与 PPTX 导出。
PDF 为逐页图像排版版，PPTX 正文是独立可编辑文本框，图片为独立嵌入对象。
不展开整个帖子串，不保留视频动态内容；提取完整性由上游接口决定，必须核对原文。

后端位于 api/，通过 Cloudflare Worker 代理 FxEmbed 并下载允许来源的图片，含每 IP 每分钟 30 次频率限制。
运行 `npx wrangler deploy --config api/wrangler.jsonc` 更新后端。修改前端 x-export.mjs 的 API 常量可以切换服务。

### 后续收费接入

当前免费体验，尚无账号、订单、订阅与计费。CORS 与 IP 频率限制不构成付费权限控制。
上线收费前需在 Worker 增加账号会话验证、数据库中的订单与额度、支付回调验签和幂等扣费。
付费导出需由服务端校验并生成或授权下载，不能只靠隐藏前端按钮；当前浏览器端生成方式需调整。
需选定正式提取服务并确认商业使用条款与稳定性，当前公共接口不提供成功率保证。

### 第三方组件

浏览器导出使用 PptxGenJS 3.12.0、html2canvas 1.4.1、jsPDF 2.5.2，许可证位于 vendor/。

PDF、PPTX 与页面预览共用 export-layout.mjs 的 A4 纵版坐标和分页；连续插图按比例拼排，PPT 使用原生文字与图片对象。不同电脑字体替换可能产生字形差异。
