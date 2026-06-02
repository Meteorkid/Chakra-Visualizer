# Chakra-Visualizer 🔴

用双手施展实时忍术特效 — 基于 MediaPipe 手势识别的火影忍者互动 Web App。

对准摄像头，通过不同手势释放 8 种忍术，支持双手同时施法！

---

## 忍术列表

| 手势 | 忍术 | 效果 |
|------|------|------|
| ✌️ V sign（食指+中指伸直） | 写轮眼 Sharingan | 红色滤镜 + 旋转三勾玉 + 红色粒子 |
| 🤘 Rock sign（食指+中指+小指） | 影分身之术 Shadow Clone | 3 个半透明幽灵 + 烟雾粒子 |
| 👊 握拳 | 八门遁甲 Eight Gates | 颜色渐变 aura（青→绿→金）+ 能量爆发 |
| 🖐️ 手掌朝下 | 地爆天星 Chibaku Tensei | 黑色引力球 + 碎石粒子吸附 |
| 🖐️ 左手张开 | 螺旋丸 Rasengan | 蓝色查克拉漩涡视频特效 |
| 🖐️ 右手张开 | 千鸟 Chidori | 紫色闪电视频特效 |
| 👍 竖大拇指 | 火遁·火球术 Fireball | 火焰爆炸视频特效 |
| 🤏 捏合 | 虚式「紫」Hollow Purple | 自定义粒子系统 + 径向渐变 |

> 💡 双手同时使用可以叠加多个忍术！

---

## 技术栈

- React 19 + Vite
- MediaPipe Hands（21 个手部关键点实时追踪）
- Canvas 2D API（粒子渲染、引力模拟）
- 纯 CSS/SVG 火影主题 UI

---

## 快速开始

```bash
git clone https://github.com/Meteorkid/Chakra-Visualizer.git
cd Chakra-Visualizer
npm install
npm run dev
```

打开 **https://localhost:5173**（需允许摄像头权限）

> ⚠️ 浏览器会弹出 HTTPS 安全警告，点击「高级 → 继续访问」

---

## 项目结构

```
Chakra-Visualizer/
├── public/assets/           # 视频特效 + 角色图片 + SVG 装饰
├── src/
│   ├── components/
│   │   ├── Camera.jsx       # 手势检测 + 粒子渲染核心
│   │   └── Tutorial.jsx     # 火影主题首页 + 忍术选择
│   ├── App.jsx
│   ├── App.css / style.css
│   └── main.jsx
├── package.json
└── vite.config.js
```

---

## 致谢

原项目 [Jutsu-Visualizer](https://github.com/ubp-as/Jutsu-Visualizer) by Abdullah Salman
