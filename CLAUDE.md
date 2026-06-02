# Chakra-Visualizer

火影忍者手势互动 Web App — MediaPipe 手势识别 + Canvas 2D 粒子渲染

## 技术栈
- React 19 + Vite
- MediaPipe Hands（21 个手部关键点）
- Canvas 2D API（粒子系统、特效渲染）
- 纯 CSS/SVG 动画

## 项目结构
```
src/
├── components/
│   ├── Camera.jsx      # 手势检测 + 粒子渲染核心（1100+ 行）
│   └── Tutorial.jsx    # 火影主题首页 + 忍术选择（750+ 行）
├── i18n.js             # 中英文翻译文件
├── LanguageContext.jsx  # 语言状态管理
├── App.jsx / App.css
└── main.jsx
public/assets/          # SVG 装饰 + 角色 PNG + 视频特效
```

## 关键架构

### Camera.jsx 核心模块
- **手势检测**：checkFist/checkScissor/checkRock/checkPalmDown/checkOpen/checkPinch/checkTiger/checkIndex
- **结印系统**：detectSeal() → pushSeal() → checkComboMatch()，3秒超时，8种手势映射地支
- **粒子系统**：统一 particles 数组，按 type 分发渲染（default/smoke/aura/debris/sharingan）
- **大招特效**：drawRasenshuriken/drawSusano/drawAmaterasu/drawTsukuyomi
- **原有特效**：drawHollowPurple/drawSharingan/drawShadowClone/drawEightGates/drawChibakuTensei
- **视频叠加**：rasengan/chidori/fireball 用 video 元素 + mix-blend-mode: screen

### 手势优先级链
```
fist → scissor → rock → palmDown → open → pinch → tiger → index
```

### 结印序列
```
螺旋手里剑: 子→丑→寅→卯
须佐能乎:   子→未→巳→午
天照:       子→丑→午→未
月读:       子→午→未
```

### 动画循环
`animateEffects()` → 绘制所有特效 → 统一粒子更新（switch on p.type）

## 开发注意
- HTTPS 必需（摄像头权限），Vite 配置了 basicSsl
- 手势检测用 `fingerClearlyUp()`（y坐标比较），比距离法更可靠
- 所有特效纯 Canvas 2D，不依赖外部图片/视频（除 3 个原有 mp4）
- 中英文双语用 `useLanguage()` + `t('key')` 访问翻译
