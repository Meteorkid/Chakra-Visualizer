# Chakra-Visualizer

火影忍者手势互动 Web App — 21个忍术，6个角色，中英文双语，新手/大师模式

## 快速命令
```bash
npm run dev        # 启动开发服务器 (https://localhost:5173)
npm run build      # 生产构建
```

## 技术栈
- React 19 + Vite（HTTPS basicSsl）
- MediaPipe Hands（21 个手部关键点，CDN 加载）
- Canvas 2D API（粒子系统、特效渲染）
- React Context（LanguageContext + GameContext）

## 项目结构
```
src/
├── components/
│   ├── Camera.jsx       # 手势检测 + 粒子渲染 + 结印系统（1200+ 行）
│   └── Tutorial.jsx     # 角色分组首页 + 技能选择 + 手势指南（800+ 行）
├── i18n.js              # 中英文翻译（21个技能 × 2语言）
├── LanguageContext.jsx  # 语言状态 + t() 插值函数
├── GameContext.jsx      # 游戏模式 + 计分/连击/完美释放
├── App.jsx / main.jsx
public/assets/          # SVG 装饰 + 角色 PNG + 视频特效
```

## 核心架构

### 手势检测系统 v2
- **fingerScore()** — 三信号融合评分（y坐标+距离+角度），0-1分
- **isFingerUp/Down** — 统一阈值（从 GameContext config 读取）
- **palmDirection()** — 手掌方向检测（front/down/side）
- **手势防抖** — gestureHistory + stableGesture，连续N帧确认

### 手势优先级链（互斥）
```
fist → palmDown → open → scissor → rock → tiger → pinch → index
```

### 结印系统
- **detectSeal()** → 返回 { seal, gesture, emoji } 对象
- **pushSeal()** → 超时清空 + 去重 + checkComboMatch
- **ULT_SEQUENCES** — 13个大招的结印序列定义
- 屏幕底部显示：emoji + 地支 + 手势名 + 进度（N/M）

### 角色分组（7组 × 21技能）
```
🍥 鸣人: 螺旋丸/影分身/螺旋手里剑/超大玉螺旋丸/尾兽玉
⚡ 佐助: 千鸟/写轮眼/须佐能乎/天照/麒麟
🌀 鼬: 月读/十拳剑
🌸 小樱: 百豪之术/樱花冲
🏜️ 我爱罗: 砂缚柩/守鹤之盾
🔴 佩恩: 地爆天星/神罗天征
🌀 其他: 火球术/虚式紫/八门遁甲
```

### 游戏模式（GameContext）
- **Novice**: 阈值0.5, 超时5s, 显示手势名, 无计分
- **Master**: 阈值0.65, 超时2.5s, 计分+连击+完美释放+屏幕震动

### 粒子系统
- 统一 `particles` 数组，按 `p.type` 分发渲染
- 类型: default/smoke/aura/debris/sharingan
- 上限: PARTICLE_LIMIT=500
- 手离开画面后所有 power 值自动衰减

### 动画循环
`animateEffects()` → 屏幕震动 → 绘制特效 → HUD → 结印显示 → 粒子更新 → restore

## 开发注意
- HTTPS 必需（摄像头权限）
- 新增技能需要：i18n.js 翻译 + Tutorial.jsx 颜色/分组 + Camera.jsx 结印序列 + 特效绘制
- 结印序列不能有重复（ULT_SEQUENCES 中已定义13个）
- 所有特效纯 Canvas 2D，不依赖外部资源
- 翻译用 `t('key', { param: value })` 支持插值

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Chakra-Visualizer**

火影忍者手势互动 Web App — 通过摄像头识别手部动作，触发 21 种忍术特效。基于 MediaPipe Hands 手势识别，支持双手同时施法、中英文双语、新手/大师模式切换。面向火影忍者粉丝和 Web 交互体验爱好者。

**Core Value:** **手势识别准确触发忍术特效** — 用户做出正确手势时，屏幕立即呈现对应的忍术视觉效果。这是整个应用的核心体验，其他一切围绕它展开。

### Constraints

- **Tech Stack**: React 19 + Vite（已有），不引入新框架
- **Performance**: Canvas 2D 渲染需保持 60fps，粒子上限 350
- **Compatibility**: 需支持 Chrome/Edge（MediaPipe CDN 加载）
- **Security**: HTTPS 必需，无后端，无敏感数据
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
