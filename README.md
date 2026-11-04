# dsh-liang-backdrop · 梁圣滑杆背景

把「梁圣 → 小梁」的六张状态图钉在 DeepSeek Harness 窗口里当背景，用一个可拖拽的浮动面板控制等级、大小、位置和浓度。

- 背景是浮层，`pointer-events: none` 完全穿透，不挡任何点击
- 面板可拖动、可收起，位置和所有设置存在 `localStorage`
- 切级时交叉淡入，拖动滑杆实时跟手

## 安装

插件管理面板里添加插件，或命令行：

```bash
dsh plugin --profile desktop add dsh-liang-backdrop
```

安装后重启 DSH（或刷新页面）生效。卸载：

```bash
dsh plugin --profile desktop remove dsh-liang-backdrop
```

## 使用

面板贴在窗口左边缘垂直居中，抓手条上 `⠿` 可以拖到任意位置，双击复位。

```
⠿ 拖动                        ▾
┌────────┬────────┐
│ 梁祖   │ 梁神   │  ← 六个状态，点谁切谁
│ 梁圣   │ 梁子   │
│ 牢梁   │ 小难梁 │
└────────┴────────┘
━━━━━●━━━━━                    ← 等级滑杆
梁圣 4/6              ⇄  ◐
大小 ━━━●━━ 42                 ← 背景尺寸（vmin）
位置 ┌─┬─┬─┐
     │ │ │●┘                   ← 拖小球，背景跟着走
     └─┴─┴─┘
```

| 控件 | 作用 |
|---|---|
| 状态按钮 / 滑杆 | 6 级切换：小难梁 → 牢梁 → 梁子 → 梁圣 → 梁神 → 梁祖 |
| `⇄` | 反转方向（默认左 = 梁祖 → 右 = 小难梁） |
| `◐` | 背景浓度：淡 0.35 / 中 0.55 / 浓 0.80 |
| 大小 | 14–76，单位 `vmin`（视口短边的百分比），默认 42 |
| 位置 | 拖动定位画布里的小球，任意位置；中心点按尺寸动态夹取，整张图始终留在窗口内 |
| `▾` / `▸` | 收起 / 展开面板（收起后只剩 `⠿ 梁圣 ▸`） |

窗口宽度小于 640px 或高度小于 520px 时背景自动隐藏。

## 数据

所有设置存在 `localStorage` 的 `dsh.liang-backdrop:v1`：

```json
{ "level": 3, "reverse": true, "strength": 1, "size": 42,
  "px": 0.5, "py": 0.5, "collapsed": false, "x": null, "y": null }
```

`px` / `py` 是图片中心在窗口里的比例坐标，`x` / `y` 是控制面板的像素坐标（`null` = 默认位置）。

## 素材与授权

本包**不打包任何图片**。运行时按需从
[Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator)
的 `public/frames` 下载 6 张关键帧，缓存在安装目录的 `.frames-cache/`；如果是开发目录里有 `assets/frames/`，优先用本地的。

那个项目的**源码**是 MIT，但人像素材**不随 MIT 共享**，其 README 明确要求复用或二次发布前确认肖像与素材使用权。所以：

- 本包 tarball 只有代码（`files` 排除了 `assets/frames`）
- 想完全摆脱上游图床，把 `index.js` 里的 `FRAME_SOURCE` 换成你自己的 6 张方图即可

代码用 [MIT](LICENSE) 发布；素材归属与限制见 [NOTICE](NOTICE)。

## 结构

| 文件 | 作用 |
|---|---|
| `client.js` | 两处挂载：`shell.overlay` 的 `liang-backdrop`（背景）、`liang-backdrop-control`（面板） |
| `index.js` | Host 端 `webServer` 前缀路由 `/plugins/liang-backdrop/frames` |
| `cordis.patch.yml` | 插入 `liang-backdrop` 插件行 |
| `icon.svg` / `locale/*.json` | 插件市场图标与中英文元数据 |
