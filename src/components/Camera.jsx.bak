import { useEffect, useRef } from "react";
import { useGame } from "../GameContext";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

export default function CameraComponent({ onBack }){
  const { config, onSealSuccess, onSealInterrupted, onUltRelease, score, combo, perfectCount } = useGame();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fxCanvasRef = useRef(null);
  const rasenganRef = useRef(null);
  const chidoriRef = useRef(null);
  const fireballRef = useRef(null);

  // 原有忍术 refs
  const power = useRef([0,0]);
  const wasOpen = useRef([false,false]);
  const wasTiger = useRef([false,false]);
  const fireballPower = useRef([0,0]);
  const hollowPurpleSize = useRef(0);
  const hollowPurplePos = useRef({ x: 0, y: 0 });
  const wasPinching = useRef(false);
  const particles = useRef([]);
  const animFrameRef = useRef(null);

  // 写轮眼 refs
  const sharinganPower = useRef([0,0]);
  const wasScissor = useRef([false,false]);
  const sharinganSize = useRef(0);

  // 影分身 refs
  const shadowClonePower = useRef([0,0]);
  const wasRock = useRef([false,false]);
  const cloneHandData = useRef(null);

  // 八门遁甲 refs
  const eightGatesPower = useRef([0,0]);
  const wasFist = useRef([false,false]);
  const gatesCenter = useRef({ x: 0, y: 0 });

  // 地爆天星 refs
  const chibakuPower = useRef([0,0]);
  const wasPalmDown = useRef([false,false]);
  const chibakuSphereSize = useRef(0);
  const chibakuPos = useRef({ x: 0, y: 0 });

  // ========== 手势防抖 ==========
  const gestureHistory = useRef([]);     // 最近 N 帧的手势记录
  const stableGesture = useRef(null);    // 稳定后的手势
  // configRef.current.gestureFrames 从 config 读取

  // ========== 粒子限制 ==========
  const PARTICLE_LIMIT = 350; // 120fps 下降低以保证帧预算

  // ========== 帧级时间缓存（避免每个draw函数重复调用Date.now） ==========
  const frameTimeRef = useRef(0);
  const frameTimeSecRef = useRef(0);

  // ========== 结印系统 refs ==========
  const comboBuffer = useRef([]);
  const comboTimer = useRef(null);
  const lastGestureTime = useRef(0);
  const comboDisplay = useRef([]);
  const ultCooldown = useRef(0);
  const ultActive = useRef(null);
  const ultTimer = useRef(0);
  const ultPos = useRef({ x: 0, y: 0 });

  // ========== 结印模式 ==========
  const sealMode = useRef(false);
  const pinchHoldTime = useRef(0);
  const lastPinchState = useRef(false);
  const SEAL_MODE_HOLD = 2000;

  // ========== 用 ref 桥接 React state，解决 useEffect 闭包过期 ==========
  const configRef = useRef(config);
  configRef.current = config;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const perfectCountRef = useRef(perfectCount);
  perfectCountRef.current = perfectCount;

  // ========== 手势检测系统（v2 优化版）==========

  // 统一手指伸直评分：综合 y 坐标 + 距离两个信号，返回 0-1 分数
  // 1 = 完全伸直，0 = 完全弯曲
  function fingerScore(pts, tipIdx, pipIdx, mcpIdx){
    const tip = pts[tipIdx];
    const pip = pts[pipIdx];
    const mcp = pts[mcpIdx];
    const wrist = pts[0];

    // 信号1: y 坐标比较（tip 比 pip/mcp 高 = 伸直）
    const yScore = (tip.y < pip.y ? 0.5 : 0) + (tip.y < mcp.y ? 0.5 : 0);

    // 信号2: 距离比较（tip 离手腕比 pip 远 = 伸直）
    const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    const dScore = tipDist > pipDist * 1.05 ? 0.5 : tipDist > pipDist ? 0.25 : 0;

    // 信号3: 手指角度（tip 在 mcp-pip 延长线上 = 伸直）
    const angle = Math.atan2(tip.y - mcp.y, tip.x - mcp.x);
    const pipAngle = Math.atan2(pip.y - mcp.y, pip.x - mcp.x);
    const rawDiff = Math.abs(angle - pipAngle);
    const angleDiff = rawDiff > Math.PI ? Math.PI * 2 - rawDiff : rawDiff;
    const aScore = angleDiff < 0.5 ? 0.5 : angleDiff < 1.0 ? 0.25 : 0;

    return Math.min(1, yScore + dScore + aScore);
  }

  // 判断手指是否伸直（阈值 0.6）
  function isFingerUp(pts, tipIdx, pipIdx, mcpIdx){
    return fingerScore(pts, tipIdx, pipIdx, mcpIdx) >= configRef.current.scoreThreshold;
  }

  // 判断手指是否弯曲（阈值 0.35）
  function isFingerDown(pts, tipIdx, pipIdx, mcpIdx){
    return fingerScore(pts, tipIdx, pipIdx, mcpIdx) < 0.35;
  }

  // 手掌方向检测：返回 'front' | 'down' | 'side'
  function palmDirection(pts){
    const wrist = pts[0];
    const mcp9 = pts[9]; // 中指根部
    // 手掌朝前：中指根部在手腕上方
    // 手掌朝下：中指根部在手腕下方
    const dy = mcp9.y - wrist.y;
    const dx = mcp9.x - wrist.x;
    if(dy > 0.08) return 'down';
    if(Math.abs(dx) > 0.15) return 'side';
    return 'front';
  }

  // 拇指伸直检测（特殊处理，拇指运动方向不同）
  function isThumbUp(pts){
    const thumbTip = pts[4];
    const thumbIp = pts[3];
    const thumbMcp = pts[2];
    // 拇指向上：tip.y < mcp.y 且有一定距离
    return thumbTip.y < thumbMcp.y - 0.04 &&
           Math.hypot(thumbTip.x - thumbMcp.x, thumbTip.y - thumbMcp.y) > 0.03;
  }

  function isThumbClosed(pts){
    const thumbTip = pts[4];
    const indexMcp = pts[5];
    // 拇指弯曲：tip 靠近食指根部
    return Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y) < 0.08;
  }

  // ========== 手势判定函数 ==========

  function checkFist(pts){
    return isFingerDown(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17) &&
           isThumbClosed(pts);
  }

  function checkOpen(pts){
    // 四指全部伸直 + 拇指不握拳
    return isFingerUp(pts, 8, 6, 5) &&
           isFingerUp(pts, 12, 10, 9) &&
           isFingerUp(pts, 16, 14, 13) &&
           isFingerUp(pts, 20, 18, 17);
  }

  function checkScissor(pts){
    return isFingerUp(pts, 8, 6, 5) &&
           isFingerUp(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17);
  }

  function checkRock(pts){
    return isFingerUp(pts, 8, 6, 5) &&
           isFingerUp(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerUp(pts, 20, 18, 17);
  }

  function checkTiger(pts){
    return isThumbUp(pts) &&
           isFingerDown(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17);
  }

  function checkPinch(pts){
    const thumbTip = pts[4];
    const indexTip = pts[8];
    const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    return dist < 0.06 &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17);
  }

  function checkPalmDown(pts){
    // 四指伸直 + 手掌朝下方向
    return isFingerUp(pts, 8, 6, 5) &&
           isFingerUp(pts, 12, 10, 9) &&
           isFingerUp(pts, 16, 14, 13) &&
           isFingerUp(pts, 20, 18, 17) &&
           palmDirection(pts) === 'down';
  }

  function checkIndex(pts){
    return isFingerUp(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17);
  }

  function checkGun(pts){
    // 申 — 手枪：拇指+食指伸直，中指/无名指/小指弯曲
    return isThumbUp(pts) &&
           isFingerUp(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerDown(pts, 20, 18, 17);
  }

  function checkPhone(pts){
    // 酉 — 电话：拇指+小指伸直，食指/中指/无名指弯曲
    return isThumbUp(pts) &&
           isFingerDown(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerUp(pts, 20, 18, 17);
  }

  function checkPinky(pts){
    // 戌 — 小指：只有小指伸直
    return isFingerDown(pts, 8, 6, 5) &&
           isFingerDown(pts, 12, 10, 9) &&
           isFingerDown(pts, 16, 14, 13) &&
           isFingerUp(pts, 20, 18, 17);
  }

  // ========== 双手结印检测 ==========

  function checkDoubleSube(hands){
    // 子 — 双手拇指重叠，其他手指交叉
    if(hands.length < 2) return false;
    const [l, r] = hands;
    const lThumb = l[4], rThumb = r[4];
    const lWrist = l[0], rWrist = r[0];
    // 两拇指尖靠近（重叠）
    const thumbDist = Math.hypot(lThumb.x - rThumb.x, lThumb.y - rThumb.y);
    // 两拇指都向上
    const lThumbUp = lThumb.y < l[2].y - 0.03;
    const rThumbUp = rThumb.y < r[2].y - 0.03;
    // 其他手指弯曲
    const lClosed = isFingerDown(l, 8, 6, 5) && isFingerDown(l, 12, 10, 9);
    const rClosed = isFingerDown(r, 8, 6, 5) && isFingerDown(r, 12, 10, 9);
    return thumbDist < 0.12 && lThumbUp && rThumbUp && lClosed && rClosed;
  }

  function checkDoubleUshi(hands){
    // 丑 — 双手手指交叉，左手在上
    if(hands.length < 2) return false;
    const [l, r] = hands;
    // 两手掌心相对，手指伸直
    const lOpen = isFingerUp(l, 8, 6, 5) && isFingerUp(l, 12, 10, 9);
    const rOpen = isFingerUp(r, 8, 6, 5) && isFingerUp(r, 12, 10, 9);
    // 两手中指根部靠近（交叉点）
    const crossDist = Math.hypot(l[9].x - r[9].x, l[9].y - r[9].y);
    // 左手在右手上方
    const leftAbove = l[9].y < r[9].y;
    return lOpen && rOpen && crossDist < 0.15 && leftAbove;
  }

  function checkDoubleTora(hands){
    // 寅 — 双手合十，手指伸直朝上
    if(hands.length < 2) return false;
    const [l, r] = hands;
    // 两手掌心相对
    const lPalm = l[9], rPalm = r[9];
    const palmDist = Math.hypot(lPalm.x - rPalm.x, lPalm.y - rPalm.y);
    // 手指都向上
    const lUp = isFingerUp(l, 8, 6, 5) && isFingerUp(l, 12, 10, 9) && isFingerUp(l, 16, 14, 13);
    const rUp = isFingerUp(r, 8, 6, 5) && isFingerUp(r, 12, 10, 9) && isFingerUp(r, 16, 14, 13);
    // 两手靠近（合十）
    return palmDist < 0.12 && lUp && rUp;
  }

  function checkDoubleUma(hands){
    // 午 — 双手手掌重叠
    if(hands.length < 2) return false;
    const [l, r] = hands;
    // 两手中指根部非常靠近（重叠）
    const overlapDist = Math.hypot(l[9].x - r[9].x, l[9].y - r[9].y);
    // 手指伸直
    const lOpen = isFingerUp(l, 8, 6, 5) && isFingerUp(l, 12, 10, 9);
    const rOpen = isFingerUp(r, 8, 6, 5) && isFingerUp(r, 12, 10, 9);
    return overlapDist < 0.08 && lOpen && rOpen;
  }

  // ========== 结印系统 ==========

  const SEAL_NAMES = {
    '子': { seal: '子', gesture: '握拳',   emoji: '👊' },
    '丑': { seal: '丑', gesture: '张掌',   emoji: '🖐️' },
    '寅': { seal: '寅', gesture: 'V字',    emoji: '✌️' },
    '卯': { seal: '卯', gesture: '竖拇指', emoji: '👍' },
    '辰': { seal: '辰', gesture: '摇滚',   emoji: '🤘' },
    '巳': { seal: '巳', gesture: '捏合',   emoji: '🤏' },
    '午': { seal: '午', gesture: '掌朝下', emoji: '🖐️↓' },
    '未': { seal: '未', gesture: '食指',   emoji: '☝️' },
    '申': { seal: '申', gesture: '手枪',   emoji: '🤙' },
    '酉': { seal: '酉', gesture: '电话',   emoji: '🤙' },
    '戌': { seal: '戌', gesture: '小指',   emoji: '🤙' },
    '亥': { seal: '亥', gesture: '双掌',   emoji: '🙏' },
  };

  function detectSeal(pts){
    let raw = null;
    if(checkFist(pts))     raw = '子';
    else if(checkPalmDown(pts)) raw = '午';
    else if(checkGun(pts))      raw = '申';
    else if(checkPhone(pts))    raw = '酉';
    else if(checkPinky(pts))    raw = '戌';
    else if(checkOpen(pts))     raw = '丑';
    else if(checkScissor(pts))  raw = '寅';
    else if(checkTiger(pts))    raw = '卯';
    else if(checkRock(pts))     raw = '辰';
    else if(checkPinch(pts))    raw = '巳';
    else if(checkIndex(pts))    raw = '未';

    gestureHistory.current.push(raw);
    if(gestureHistory.current.length > configRef.current.gestureFrames){
      gestureHistory.current.shift();
    }

    if(gestureHistory.current.length >= configRef.current.gestureFrames){
      const allSame = gestureHistory.current.every(g => g === raw);
      if(allSame && raw !== null){
        if(raw !== stableGesture.current){
          stableGesture.current = raw;
          return SEAL_NAMES[raw];
        }
        return null;
      }
    }

    if(raw === null) stableGesture.current = null;
    return null;
  }

  // 大招结印序列定义（确保无重复）
  const ULT_SEQUENCES = {
    'rasenshuriken': ['子','丑','寅','卯'],  // 4印
    'susano':        ['子','未','巳','午'],  // 4印
    'amaterasu':     ['子','丑','午','未'],  // 4印
    'tsukuyomi':     ['子','午','未'],        // 3印
    'rasengan-big':  ['丑','巳'],            // 2印
    'bijuu-dama':    ['卯','卯'],            // 2印（竖拇指×2）
    'kirin':         ['寅','未'],            // 2印
    'totsuka':       ['巳','卯'],            // 2印
    'byakugou':      ['丑','辰'],            // 2印
    'sakura-impact': ['子','寅'],            // 2印
    'sand-coffin':   ['午','子'],            // 2印
    'sand-shield':   ['丑','未'],            // 2印
    'shinra':        ['午','未'],            // 2印
  };

  // 检查缓冲区是否匹配任何大招序列
  function checkComboMatch(buffer){
    for(const [ultName, seq] of Object.entries(ULT_SEQUENCES)){
      const bufSlice = buffer.slice(-seq.length);
      if(bufSlice.length === seq.length && bufSlice.every((s,i) => s.seal === seq[i])){
        return ultName;
      }
    }
    return null;
  }

  // 推入结印并检查匹配
  function pushSeal(sealObj){
    const now = Date.now();
    if(now - lastGestureTime.current > configRef.current.sealTimeout){
      if(comboBuffer.current.length > 0 && onSealInterrupted) onSealInterrupted();
      comboBuffer.current = [];
      comboDisplay.current = [];
    }
    lastGestureTime.current = now;

    // 去重：连续相同地支不重复推入
    if(comboBuffer.current.length > 0 && comboBuffer.current[comboBuffer.current.length-1].seal === sealObj.seal){
      return null;
    }

    comboBuffer.current.push(sealObj);
    comboDisplay.current = [...comboBuffer.current];
    if(onSealSuccess) onSealSuccess();

    if(comboBuffer.current.length > 6){
      comboBuffer.current.shift();
    }

    return checkComboMatch(comboBuffer.current);
  }

  // ========== 粒子生成函数 ==========

  function spawnParticles(x, y, size){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 8; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.025,
        size: (3 + Math.random() * 6) * (size / 80),
        color: Math.random() > 0.5 ? `rgba(80,160,255,` : `rgba(200,60,255,`,
        type: "default"
      });
    }
  }

  function spawnSharinganParticles(x, y, size){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 6; i++){
      const angle = Math.random() * Math.PI * 2;
      const dist = size * 0.3 + Math.random() * size * 0.5;
      particles.current.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI/2) * 1.2,
        vy: Math.sin(angle + Math.PI/2) * 1.2,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        size: 2 + Math.random() * 4,
        type: "sharingan"
      });
    }
  }

  function spawnSmokeParticles(x, y){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 8; i++){
      particles.current.push({
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 1.5,
        life: 1,
        decay: 0.004 + Math.random() * 0.006,
        size: 25 + Math.random() * 45,
        type: "smoke"
      });
    }
  }

  function spawnAuraParticles(x, y, power){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    const count = Math.floor(8 + power * 12);
    for(let i = 0; i < count; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + power * 8 + Math.random() * 4;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: 2 + Math.random() * 5,
        type: "aura"
      });
    }
  }

  function spawnDebrisParticles(x, y, size){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 6; i++){
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 350;
      particles.current.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        life: 1,
        decay: 0.002 + Math.random() * 0.004,
        size: 3 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        targetX: x, targetY: y,
        type: "debris"
      });
    }
  }

  // ========== 绘制函数 ==========

  function drawHollowPurple(ctx, x, y, size){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current * 2;
    const alpha = Math.min(1, size / 40);

    // 外层大气（多层深紫扩散）
    for(let layer = 0; layer < 3; layer++){
      const lr = size * (3.5 + layer * 1.2);
      const la = 0.12 - layer * 0.03;
      const atmGrad = ctx.createRadialGradient(x, y, 0, x, y, lr);
      atmGrad.addColorStop(0, `rgba(80,0,180,${la * alpha})`);
      atmGrad.addColorStop(0.5, `rgba(50,0,140,${la * 0.5 * alpha})`);
      atmGrad.addColorStop(1, `rgba(30,0,80,0)`);
      ctx.beginPath(); ctx.arc(x, y, lr, 0, Math.PI * 2);
      ctx.fillStyle = atmGrad; ctx.fill();
    }

    // 扭曲同心圆（带断续效果）
    for(let ring = 0; ring < 6; ring++){
      const ringR = size * (0.5 + ring * 0.35);
      const wobble = Math.sin(time * 1.5 + ring * 0.8) * size * 0.1;
      // 断续圆环
      const segments = 4 + ring;
      const segArc = (Math.PI * 2 / segments) * 0.6;
      for(let s = 0; s < segments; s++){
        const sa = time * (0.4 + ring * 0.1) + (s / segments) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, ringR + wobble, sa, sa + segArc);
        ctx.strokeStyle = `rgba(160,60,255,${(0.3 - ring * 0.04) * alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 蓝色层（更深更饱和，带脉冲）
    const bluePulse = Math.sin(time * 2) * 0.05 + 0.95;
    const blueGrad = ctx.createRadialGradient(x - size*0.4, y, 0, x - size*0.4, y, size * 1.8);
    blueGrad.addColorStop(0, `rgba(15,50,220,${0.9 * alpha * bluePulse})`);
    blueGrad.addColorStop(0.4, `rgba(10,35,200,${0.6 * alpha})`);
    blueGrad.addColorStop(0.7, `rgba(5,20,160,${0.25 * alpha})`);
    blueGrad.addColorStop(1, `rgba(0,10,120,0)`);
    ctx.beginPath(); ctx.arc(x - size*0.12, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = blueGrad; ctx.fill();

    // 红色层（更深更饱和，带脉冲）
    const redPulse = Math.sin(time * 2 + Math.PI) * 0.05 + 0.95;
    const redGrad = ctx.createRadialGradient(x + size*0.4, y, 0, x + size*0.4, y, size * 1.8);
    redGrad.addColorStop(0, `rgba(200,0,15,${0.9 * alpha * redPulse})`);
    redGrad.addColorStop(0.4, `rgba(160,0,10,${0.6 * alpha})`);
    redGrad.addColorStop(0.7, `rgba(100,0,5,${0.25 * alpha})`);
    redGrad.addColorStop(1, `rgba(60,0,0,0)`);
    ctx.beginPath(); ctx.arc(x + size*0.12, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = redGrad; ctx.fill();

    // 蓝红交界处电弧（蓝红碰撞融合）
    for(let i = 0; i < 6; i++){
      const arcAngle = time * 3 + i * 1.1;
      const arcY = y + Math.sin(arcAngle) * size * 0.6;
      const arcX = x + Math.sin(time * 1.5 + i) * size * 0.15;
      const arcLen = size * (0.3 + Math.sin(time * 4 + i * 2) * 0.2);
      ctx.beginPath();
      ctx.moveTo(arcX - arcLen * 0.5, arcY);
      // 锯齿形电弧
      for(let j = 0; j < 4; j++){
        const jx = arcX - arcLen * 0.5 + (j + 1) * arcLen * 0.25;
        const jy = arcY + (j % 2 === 0 ? -1 : 1) * size * 0.05;
        ctx.lineTo(jx, jy);
      }
      ctx.strokeStyle = `rgba(200,150,255,${0.35 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 环绕粒子（更多更密，带拖尾）
    for(let i = 0; i < 24; i++){
      const angle = (i / 24) * Math.PI * 2 + time * (0.8 + (i % 3) * 0.2);
      const orbitWobble = Math.sin(time * 2 + i * 0.5) * size * 0.18;
      const rx = x + Math.cos(angle) * (size * 1.1 + orbitWobble);
      const ry = y + Math.sin(angle) * (size * 0.5 + orbitWobble * 0.3);
      const dotR = size * 0.06 + Math.sin(time * 3 + i) * size * 0.025;

      // 拖尾
      const tailAngle = angle - 0.15;
      const tx = x + Math.cos(tailAngle) * (size * 1.1 + orbitWobble);
      const ty = y + Math.sin(tailAngle) * (size * 0.5 + orbitWobble * 0.3);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = i < 12
        ? `rgba(30,80,220,${0.2 * alpha})`
        : `rgba(180,40,200,${0.2 * alpha})`;
      ctx.lineWidth = dotR * 0.8;
      ctx.stroke();

      ctx.beginPath(); ctx.arc(rx, ry, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < 12
        ? `rgba(20,70,220,${0.95 * alpha})`
        : `rgba(170,40,220,${0.95 * alpha})`;
      ctx.fill();
    }

    // 碎片飞散效果（更多，不规则形状）
    for(let i = 0; i < 16; i++){
      const fAngle = time * 0.8 + (i / 16) * Math.PI * 2;
      const fDist = size * (1.3 + Math.sin(time * 1.2 + i * 1.3) * 0.5);
      const fx = x + Math.cos(fAngle) * fDist;
      const fy = y + Math.sin(fAngle) * fDist;
      const fSize = 2 + Math.sin(time * 2 + i) * 1.5;
      const fRot = time * 2 + i;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(fRot);
      // 不规则碎片形状
      ctx.beginPath();
      ctx.moveTo(-fSize, -fSize * 0.3);
      ctx.lineTo(fSize * 0.5, -fSize);
      ctx.lineTo(fSize, fSize * 0.2);
      ctx.lineTo(fSize * 0.3, fSize);
      ctx.lineTo(-fSize * 0.5, fSize * 0.5);
      ctx.closePath();
      ctx.fillStyle = i < 8
        ? `rgba(60,120,255,${0.5 * alpha})`
        : `rgba(200,100,255,${0.5 * alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // 核心球体（紫色更深，融合感）
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(255,255,255,${1.0 * alpha})`);
    coreGrad.addColorStop(0.12, `rgba(230,200,255,${0.98 * alpha})`);
    coreGrad.addColorStop(0.35, `rgba(140,30,220,${0.92 * alpha})`);
    coreGrad.addColorStop(0.6, `rgba(90,10,180,${0.8 * alpha})`);
    coreGrad.addColorStop(0.85, `rgba(50,0,120,${0.4 * alpha})`);
    coreGrad.addColorStop(1, `rgba(30,0,80,0)`);
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 内部蓝红旋转纹理（融合漩涡）
    for(let i = 0; i < 3; i++){
      const swAngle = time * 2 + i * Math.PI * 2 / 3;
      const swR = size * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, swR, swAngle, swAngle + Math.PI * 0.6);
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(60,120,255,${0.3 * alpha})`
        : `rgba(200,40,40,${0.3 * alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 内核白热核心（更亮，带脉冲）
    const innerPulse = Math.sin(time * 4) * 0.1 + 0.9;
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.35);
    innerGrad.addColorStop(0, `rgba(255,255,255,${1.0 * alpha * innerPulse})`);
    innerGrad.addColorStop(0.4, `rgba(255,230,255,${0.7 * alpha})`);
    innerGrad.addColorStop(0.8, `rgba(220,180,255,${0.2 * alpha})`);
    innerGrad.addColorStop(1, `rgba(180,120,255,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad; ctx.fill();

    // 闪光高光（十字星芒）
    const hlAlpha = Math.min(0.7, size / 50) * innerPulse;
    // 主闪光
    ctx.beginPath(); ctx.arc(x - size * 0.12, y - size * 0.12, size * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${hlAlpha})`; ctx.fill();
    // 星芒
    for(let i = 0; i < 4; i++){
      const sa = (i / 4) * Math.PI * 2 + time * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(sa) * size * 0.3, y + Math.sin(sa) * size * 0.3);
      ctx.strokeStyle = `rgba(255,255,255,${hlAlpha * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSharingan(ctx, cx, cy, size, totalPower){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current * 3;

    // 写轮眼脉冲效果：尺寸微微缩放
    const pulseTime = frameTimeSecRef.current * 4;
    const pulseScale = 1 + Math.sin(pulseTime) * 0.04;
    const s = size * pulseScale;

    // 全屏红色滤镜
    ctx.fillStyle = `rgba(180,0,0,${totalPower * 0.18})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 红色虹膜
    const irisGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
    irisGrad.addColorStop(0, `rgba(180,0,0,0.95)`);
    irisGrad.addColorStop(0.7, `rgba(150,0,0,0.8)`);
    irisGrad.addColorStop(1, `rgba(100,0,0,0)`);
    ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad; ctx.fill();

    // 内环
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(80,0,0,0.6)`;
    ctx.lineWidth = 2.5; ctx.stroke();

    // 三勾玉
    for(let i = 0; i < 3; i++){
      const angle = time + (i * Math.PI * 2 / 3);
      const tx = cx + Math.cos(angle) * s * 0.35;
      const ty = cy + Math.sin(angle) * s * 0.35;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle + Math.PI / 2);
      // 勾玉身体
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.13, 0, Math.PI * 1.5);
      ctx.fillStyle = `rgba(0,0,0,0.95)`;
      ctx.fill();
      // 勾玉尾巴
      ctx.beginPath();
      ctx.moveTo(Math.cos(Math.PI * 1.5) * s * 0.13, Math.sin(Math.PI * 1.5) * s * 0.13);
      ctx.quadraticCurveTo(s * 0.22, -s * 0.06, s * 0.09, s * 0.06);
      ctx.fillStyle = `rgba(0,0,0,0.95)`;
      ctx.fill();
      ctx.restore();
    }

    // 瞳孔
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,1)`;
    ctx.fill();

    // 瞳孔内环
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180,0,0,0.75)`;
    ctx.lineWidth = 2; ctx.stroke();

    ctx.restore();
  }

  function drawShadowClone(ctx, pts, power){
    if(!pts || power < 0.01) return;
    const time = frameTimeSecRef.current * 3;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 分身配置：位置偏移 + 透明度 + 色调偏移
    const clones = [
      {dx:90, dy:-30, alpha:0.55, hue:210},
      {dx:-70, dy:45, alpha:0.4, hue:220},
      {dx:110, dy:55, alpha:0.25, hue:230},
      {dx:-50, dy:-50, alpha:0.15, hue:240}
    ];

    clones.forEach((clone, ci) => {
      const cAlpha = clone.alpha * power;

      // 每个分身的烟雾登场光晕
      const smokeR = 40 + Math.sin(time + ci * 2) * 10;
      const smokeGrad = ctx.createRadialGradient(
        pts[0].x * w + clone.dx, pts[0].y * h + clone.dy, 0,
        pts[0].x * w + clone.dx, pts[0].y * h + clone.dy, smokeR
      );
      smokeGrad.addColorStop(0, `rgba(200,200,255,${0.12 * cAlpha})`);
      smokeGrad.addColorStop(0.6, `rgba(160,180,255,${0.05 * cAlpha})`);
      smokeGrad.addColorStop(1, `rgba(100,120,200,0)`);
      ctx.beginPath();
      ctx.arc(pts[0].x * w + clone.dx, pts[0].y * h + clone.dy, smokeR, 0, Math.PI * 2);
      ctx.fillStyle = smokeGrad; ctx.fill();

      ctx.save();
      ctx.globalAlpha = cAlpha;

      // 骨架连接线 — 路径批处理（2次stroke代替42次）
      // 外发光层
      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([a, b]) => {
        ctx.moveTo(pts[a].x * w + clone.dx, pts[a].y * h + clone.dy);
        ctx.lineTo(pts[b].x * w + clone.dx, pts[b].y * h + clone.dy);
      });
      ctx.strokeStyle = `rgba(100,140,255,0.25)`;
      ctx.lineWidth = 6;
      ctx.stroke();
      // 主线层
      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([a, b]) => {
        ctx.moveTo(pts[a].x * w + clone.dx, pts[a].y * h + clone.dy);
        ctx.lineTo(pts[b].x * w + clone.dx, pts[b].y * h + clone.dy);
      });
      ctx.strokeStyle = `rgba(180,200,255,1)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 关节点光晕 — 批量路径
      ctx.beginPath();
      pts.forEach((p) => {
        ctx.moveTo(p.x * w + clone.dx + 7, p.y * h + clone.dy);
        ctx.arc(p.x * w + clone.dx, p.y * h + clone.dy, 7, 0, Math.PI * 2);
      });
      ctx.fillStyle = `rgba(100,160,255,0.15)`;
      ctx.fill();
      // 关节点核心 — 批量路径
      ctx.beginPath();
      pts.forEach((p, pi) => {
        const pulseR = 3 + Math.sin(time * 3 + pi * 0.5) * 1;
        ctx.moveTo(p.x * w + clone.dx + pulseR, p.y * h + clone.dy);
        ctx.arc(p.x * w + clone.dx, p.y * h + clone.dy, pulseR, 0, Math.PI * 2);
      });
      ctx.fillStyle = `rgba(200,220,255,1)`;
      ctx.fill();

      // 查克拉拖尾粒子
      for(let i = 0; i < 3; i++){
        const tp = pts[9 + i * 4] || pts[0]; // 腕部、肘部等关键点
        const tx = tp.x * w + clone.dx + Math.sin(time * 2 + ci + i) * 15;
        const ty = tp.y * h + clone.dy + Math.cos(time * 1.5 + ci + i) * 10;
        const tr = 4 + Math.sin(time * 4 + i) * 2;
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,180,255,${0.3 * cAlpha})`;
        ctx.fill();
      }

      ctx.restore();
    });

    // 分身之间的查克拉连接线
    if(clones.length >= 2 && power > 0.3){
      ctx.save();
      ctx.globalAlpha = 0.08 * power;
      ctx.strokeStyle = `rgba(150,180,255,1)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      const anchor = pts[0];
      for(let i = 0; i < clones.length; i++){
        ctx.beginPath();
        ctx.moveTo(anchor.x * w, anchor.y * h);
        ctx.lineTo(anchor.x * w + clones[i].dx, anchor.y * h + clones[i].dy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawEightGates(ctx, x, y, pwr){
    if(pwr < 0.01) return;
    ctx.save();
    const time = frameTimeSecRef.current * 2;

    // 颜色渐变：青→绿→金（更饱和）
    let r, g, b;
    if(pwr < 0.33){
      const t = pwr / 0.33;
      r = 0; g = Math.floor(180 + 75 * t); b = 255;
    } else if(pwr < 0.66){
      const t = (pwr - 0.33) / 0.33;
      r = Math.floor(220 * t); g = 255; b = Math.floor(255 - 180 * t);
    } else {
      const t = (pwr - 0.66) / 0.34;
      r = 255; g = Math.floor(220 - 80 * t); b = 0;
    }

    // 外层火焰 aura（不规则边缘，像燃烧）
    const auraR = 120 + pwr * 200;
    for(let i = 0; i < 12; i++){
      const angle = (i / 12) * Math.PI * 2 + time * 0.5;
      const flicker = Math.sin(time * 3 + i * 1.7) * 0.2 + 0.8;
      const fr = auraR * flicker;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * fr * 0.6,
        y + Math.sin(angle) * fr * 0.6,
        x + Math.cos(angle) * fr,
        y + Math.sin(angle) * fr
      );
      ctx.quadraticCurveTo(
        x + Math.cos(angle + 0.3) * fr * 0.7,
        y + Math.sin(angle + 0.3) * fr * 0.7,
        x, y
      );
      ctx.fillStyle = `rgba(${r},${g},${b},${0.12 * pwr})`;
      ctx.fill();
    }

    // 主 aura 渐变
    const auraGrad = ctx.createRadialGradient(x, y, 0, x, y, auraR);
    auraGrad.addColorStop(0, `rgba(${r},${g},${b},${0.7 * pwr})`);
    auraGrad.addColorStop(0.3, `rgba(${r},${g},${b},${0.45 * pwr})`);
    auraGrad.addColorStop(0.6, `rgba(${r},${g},${b},${0.15 * pwr})`);
    auraGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad; ctx.fill();

    // 蒸汽/热浪效果（上升的扭曲线条）
    for(let i = 0; i < 6; i++){
      const sx = x + Math.sin(time + i * 2) * 30 * pwr;
      const sy = y - 30 - i * 25 * pwr;
      const sw = 15 + Math.sin(time * 2 + i) * 8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(0.08 - i * 0.01) * pwr})`;
      ctx.fill();
    }

    // 内核白光（更亮）
    const coreR = 30 + pwr * 45;
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
    coreGrad.addColorStop(0, `rgba(255,255,255,${1.0 * pwr})`);
    coreGrad.addColorStop(0.3, `rgba(255,255,240,${0.8 * pwr})`);
    coreGrad.addColorStop(0.7, `rgba(${r},${g},${b},${0.3 * pwr})`);
    coreGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 能量线（批处理：3次stroke代替24次）
    const energyLines = [];
    for(let i = 0; i < 8; i++){
      const angle = time + (i * Math.PI * 2 / 8);
      const pulse = Math.sin(time * 3 + i) * 0.3 + 0.7;
      const len = (60 + pwr * 140) * pulse;
      energyLines.push({angle, len});
    }
    // 外发光层
    ctx.beginPath();
    energyLines.forEach(({angle, len}) => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    });
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.15 * pwr})`;
    ctx.lineWidth = 8 + pwr * 10;
    ctx.stroke();
    // 主线层
    ctx.beginPath();
    energyLines.forEach(({angle, len}) => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    });
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.8 * pwr})`;
    ctx.lineWidth = 3 + pwr * 4;
    ctx.stroke();
    // 白色高光线层
    ctx.beginPath();
    energyLines.forEach(({angle, len}) => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len * 0.7, y + Math.sin(angle) * len * 0.7);
    });
    ctx.strokeStyle = `rgba(255,255,255,${0.25 * pwr})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 爆发扩散波
    const wavePhase = (time * 2) % 1;
    const waveR = auraR * wavePhase;
    const waveAlpha = (1 - wavePhase) * 0.3 * pwr;
    ctx.beginPath();
    ctx.arc(x, y, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${waveAlpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  function drawChibakuTensei(ctx, x, y, size, pwr){
    if(size < 2 || x == null || y == null) return;
    ctx.save();
    const time = frameTimeSecRef.current * 2;

    // 引力场暗域（多层扩散）
    for(let layer = 0; layer < 3; layer++){
      const lr = size * (3.5 + layer * 1.5);
      const la = 0.12 - layer * 0.03;
      const fieldGrad = ctx.createRadialGradient(x, y, 0, x, y, lr);
      fieldGrad.addColorStop(0, `rgba(5,0,15,${la * pwr})`);
      fieldGrad.addColorStop(0.5, `rgba(10,0,25,${la * 0.5 * pwr})`);
      fieldGrad.addColorStop(1, `rgba(5,0,10,0)`);
      ctx.beginPath(); ctx.arc(x, y, lr, 0, Math.PI * 2);
      ctx.fillStyle = fieldGrad; ctx.fill();
    }

    // 引力牵引线（从外向内螺旋）
    for(let i = 0; i < 12; i++){
      const a = time * 0.8 + (i / 12) * Math.PI * 2;
      const outerR = size * (2.5 + Math.sin(time + i) * 0.8);
      const innerR = size * 1.1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * outerR, y + Math.sin(a) * outerR);
      // 贝塞尔曲线向内弯曲
      const cp1a = a + 0.3;
      ctx.quadraticCurveTo(
        x + Math.cos(cp1a) * (outerR * 0.6),
        y + Math.sin(cp1a) * (outerR * 0.6),
        x + Math.cos(a + 0.8) * innerR,
        y + Math.sin(a + 0.8) * innerR
      );
      ctx.strokeStyle = `rgba(100,30,180,${0.15 * pwr})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 轨道碎片（被吸引的岩石碎片）
    for(let i = 0; i < 16; i++){
      const orbitSpeed = 0.6 + (i % 4) * 0.2;
      const a = time * orbitSpeed + (i / 16) * Math.PI * 2;
      const decay = Math.abs(Math.sin(time * 0.3 + i * 0.7)); // 螺旋靠近
      const orbitR = size * (1.5 + (1 - decay) * 2.5);
      const dx = x + Math.cos(a) * orbitR;
      const dy = y + Math.sin(a) * orbitR * 0.7; // 椭圆轨道

      // 碎片（不规则多边形）
      const fSize = 3 + Math.sin(i * 3.7) * 2;
      const fAngle = time * 2 + i;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(fAngle);
      ctx.beginPath();
      ctx.moveTo(-fSize, -fSize * 0.5);
      ctx.lineTo(fSize * 0.3, -fSize);
      ctx.lineTo(fSize, 0);
      ctx.lineTo(fSize * 0.5, fSize);
      ctx.lineTo(-fSize * 0.3, fSize * 0.7);
      ctx.closePath();
      ctx.fillStyle = `rgba(60,20,100,${0.7 * pwr * decay})`;
      ctx.fill();
      // 碎片边缘紫色高光
      ctx.strokeStyle = `rgba(140,60,220,${0.3 * pwr * decay})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 暗能量触须（从核心向外延伸的不稳定能量）
    for(let i = 0; i < 8; i++){
      const ta = time * 1.2 + (i / 8) * Math.PI * 2;
      const tLen = size * (1.2 + Math.sin(time * 3 + i * 1.5) * 0.5);
      const tWobble = Math.sin(time * 4 + i * 2) * size * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(ta + 0.5) * tLen * 0.5 + tWobble,
        y + Math.sin(ta + 0.5) * tLen * 0.5,
        x + Math.cos(ta) * tLen,
        y + Math.sin(ta) * tLen
      );
      ctx.strokeStyle = `rgba(80,0,160,${0.25 * pwr})`;
      ctx.lineWidth = 2 + Math.sin(time * 2 + i) * 1;
      ctx.stroke();
    }

    // 核心球体（黑色更深 + 紫色裂纹）
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(0,0,0,1)`);
    coreGrad.addColorStop(0.3, `rgba(5,0,10,1)`);
    coreGrad.addColorStop(0.6, `rgba(20,0,40,0.95)`);
    coreGrad.addColorStop(0.85, `rgba(50,0,80,0.6)`);
    coreGrad.addColorStop(1, `rgba(30,0,50,0)`);
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 核心表面裂纹（紫色光芒从内部渗出）
    for(let i = 0; i < 6; i++){
      const ca = (i / 6) * Math.PI * 2 + time * 0.15;
      const cLen = size * (0.3 + Math.sin(time * 1.5 + i * 1.2) * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ca) * size * 0.2, y + Math.sin(ca) * size * 0.2);
      const mid = size * 0.5;
      ctx.lineTo(x + Math.cos(ca + 0.15) * mid, y + Math.sin(ca + 0.15) * mid);
      ctx.lineTo(x + Math.cos(ca) * cLen, y + Math.sin(ca) * cLen);
      ctx.strokeStyle = `rgba(160,60,255,${0.5 * pwr})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 多层能量环（带旋转断点）
    for(let ring = 0; ring < 3; ring++){
      const rr = size * (1 + ring * 0.18);
      const segments = 4 + ring * 2;
      const segLen = (Math.PI * 2) / segments;
      for(let s = 0; s < segments; s++){
        const sa = time * (0.5 - ring * 0.15) + s * segLen;
        ctx.beginPath();
        ctx.arc(x, y, rr, sa, sa + segLen * 0.65);
        ctx.strokeStyle = `rgba(140,60,220,${(0.6 - ring * 0.15) * pwr})`;
        ctx.lineWidth = 2.5 - ring * 0.5;
        ctx.stroke();
      }
    }

    // 吸收粒子（从外飞向核心）
    for(let i = 0; i < 20; i++){
      const life = ((time * 1.5 + i * 0.35) % 1); // 0→1 生命周期
      const pAngle = (i / 20) * Math.PI * 2 + time * 0.3;
      const pR = size * 3.5 * (1 - life); // 从外飞入
      const px = x + Math.cos(pAngle) * pR;
      const py = y + Math.sin(pAngle) * pR;
      const pSize = 2 + life * 2;
      const pAlpha = life < 0.1 ? life / 0.1 : (1 - life);
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,100,255,${pAlpha * 0.7 * pwr})`;
      ctx.fill();
    }

    // 内部白热核心（更亮）
    const hlGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.25);
    hlGrad.addColorStop(0, `rgba(255,220,255,${0.9 * pwr})`);
    hlGrad.addColorStop(0.5, `rgba(200,150,255,${0.4 * pwr})`);
    hlGrad.addColorStop(1, `rgba(150,80,200,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad; ctx.fill();

    ctx.restore();
  }

  // ========== 大招特效绘制函数 ==========

  function drawRasenshuriken(ctx, x, y, size, progress){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current * 4; // 更快旋转
    const r = size * (0.5 + progress * 0.5);
    const alpha = Math.min(1, progress * 1.5);

    // 扩散光晕
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    outerGlow.addColorStop(0, `rgba(30,120,255,${0.15 * alpha})`);
    outerGlow.addColorStop(0.5, `rgba(20,80,200,${0.05 * alpha})`);
    outerGlow.addColorStop(1, `rgba(10,40,150,0)`);
    ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow; ctx.fill();

    // 风刃线条（6条主风刃 + 每条3条细线）
    for(let i = 0; i < 6; i++){
      const baseAngle = time + (i * Math.PI / 3);
      for(let j = 0; j < 3; j++){
        const offset = (j - 1) * 0.15;
        const len = r * (1.8 + j * 0.3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        const cx1 = x + Math.cos(baseAngle + offset) * len * 0.5;
        const cy1 = y + Math.sin(baseAngle + offset) * len * 0.5;
        const ex = x + Math.cos(baseAngle + offset) * len;
        const ey = y + Math.sin(baseAngle + offset) * len;
        ctx.quadraticCurveTo(cx1 + Math.sin(time * 3) * 5, cy1 + Math.cos(time * 3) * 5, ex, ey);
        ctx.strokeStyle = `rgba(180,220,255,${(0.3 - j * 0.08) * alpha})`;
        ctx.lineWidth = 3 - j;
        ctx.stroke();
      }
    }

    // 旋转手里剑叶片（6片，更尖锐）
    for(let i = 0; i < 6; i++){
      const angle = time * 2.5 + (i * Math.PI / 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // 叶片主体
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.9, -r * 0.18);
      ctx.quadraticCurveTo(r * 1.15, 0, r * 0.9, r * 0.18);
      ctx.closePath();
      const leafGrad = ctx.createLinearGradient(0, 0, r, 0);
      leafGrad.addColorStop(0, `rgba(80,180,255,${0.9 * alpha})`);
      leafGrad.addColorStop(0.7, `rgba(30,100,220,${0.7 * alpha})`);
      leafGrad.addColorStop(1, `rgba(20,60,180,${0.3 * alpha})`);
      ctx.fillStyle = leafGrad;
      ctx.fill();
      // 叶片高光边
      ctx.strokeStyle = `rgba(150,220,255,${0.6 * alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 旋转同心圆纹理
    for(let i = 0; i < 3; i++){
      const ringR = r * (0.25 + i * 0.15);
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,200,255,${(0.2 - i * 0.05) * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 中心螺旋丸核心
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.45);
    coreGrad.addColorStop(0, `rgba(255,255,255,${1.0 * alpha})`);
    coreGrad.addColorStop(0.2, `rgba(220,240,255,${0.95 * alpha})`);
    coreGrad.addColorStop(0.5, `rgba(80,180,255,${0.7 * alpha})`);
    coreGrad.addColorStop(0.8, `rgba(20,80,200,${0.4 * alpha})`);
    coreGrad.addColorStop(1, `rgba(10,40,150,0)`);
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 外层能量环（双层）
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(100,200,255,${0.5 * alpha})`;
    ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(60,160,240,${0.3 * alpha})`;
    ctx.lineWidth = 1.5; ctx.stroke();

    ctx.restore();
  }

  function drawSusano(ctx, x, y, size, progress){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current;
    const p = progress;

    // 外层查克拉火焰 aura（不规则燃烧边缘）
    if(p > 0.2){
      const auraAlpha = Math.min(1, (p - 0.2) / 0.3);
      for(let i = 0; i < 14; i++){
        const a = (i / 14) * Math.PI * 2;
        const flicker = Math.sin(time * 3 + i * 1.7) * 0.2 + 0.8;
        const flr = size * 1.5 * flicker;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * flr * 0.3, y + Math.sin(a) * flr * 0.3);
        ctx.quadraticCurveTo(
          x + Math.cos(a + 0.2) * flr * 0.7,
          y + Math.sin(a + 0.2) * flr * 0.7 - flr * 0.15,
          x + Math.cos(a) * flr,
          y + Math.sin(a) * flr
        );
        ctx.quadraticCurveTo(
          x + Math.cos(a - 0.3) * flr * 0.5,
          y + Math.sin(a - 0.3) * flr * 0.5 + flr * 0.1,
          x + Math.cos(a) * flr * 0.3,
          y + Math.sin(a) * flr * 0.3
        );
        ctx.fillStyle = `rgba(100,20,200,${0.08 * auraAlpha * p})`;
        ctx.fill();
      }
    }

    // 最外层扩散光晕
    const shellGrad = ctx.createRadialGradient(x, y - size * 0.3, 0, x, y - size * 0.3, size * 1.8);
    shellGrad.addColorStop(0, `rgba(100,30,200,${0.2 * p})`);
    shellGrad.addColorStop(0.5, `rgba(60,15,140,${0.08 * p})`);
    shellGrad.addColorStop(1, `rgba(30,5,80,0)`);
    ctx.beginPath(); ctx.arc(x, y - size * 0.3, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = shellGrad; ctx.fill();

    // 武士骨架轮廓 — 头
    const boneAlpha = Math.min(1, p / 0.35);
    // 头盔（更尖锐，带角）
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.9);
    ctx.lineTo(x - size * 0.25, y - size * 0.65);
    ctx.lineTo(x - size * 0.35, y - size * 0.55);
    ctx.lineTo(x - size * 0.2, y - size * 0.45);
    ctx.lineTo(x + size * 0.2, y - size * 0.45);
    ctx.lineTo(x + size * 0.35, y - size * 0.55);
    ctx.lineTo(x + size * 0.25, y - size * 0.65);
    ctx.closePath();
    ctx.fillStyle = `rgba(90,30,180,${0.5 * boneAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(140,60,220,${0.6 * boneAlpha})`;
    ctx.lineWidth = 2; ctx.stroke();

    // 面罩
    ctx.beginPath();
    ctx.arc(x, y - size * 0.55, size * 0.18, 0, Math.PI);
    ctx.fillStyle = `rgba(70,20,150,${0.6 * boneAlpha})`;
    ctx.fill();

    // 能量眼睛（更红更亮，带光束）
    if(p > 0.5){
      const eyeAlpha = Math.min(1, (p - 0.5) / 0.3);
      [-1, 1].forEach(side => {
        const ex = x + side * size * 0.08;
        const ey = y - size * 0.57;
        // 眼睛光束（向外延伸）
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + side * size * 0.15, ey - size * 0.02);
        ctx.strokeStyle = `rgba(255,0,30,${0.3 * eyeAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        // 光晕
        const eyeGlow = ctx.createRadialGradient(ex, ey, 0, ex, ey, size * 0.1);
        eyeGlow.addColorStop(0, `rgba(255,0,40,${0.9 * eyeAlpha})`);
        eyeGlow.addColorStop(1, `rgba(255,0,30,0)`);
        ctx.beginPath(); ctx.arc(ex, ey, size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = eyeGlow; ctx.fill();
        // 核心
        ctx.beginPath(); ctx.arc(ex, ey, size * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,30,50,${1.0 * eyeAlpha})`; ctx.fill();
      });
    }

    // 脊椎 & 躯干
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.45);
    ctx.lineTo(x, y + size * 0.25);
    ctx.strokeStyle = `rgba(100,40,180,${0.7 * boneAlpha})`;
    ctx.lineWidth = 7; ctx.stroke();

    // 肋骨（更粗，弯曲造型）
    for(let i = 0; i < 5; i++){
      const ry = y - size * 0.35 + i * size * 0.1;
      const rw = size * (0.32 - i * 0.03);
      // 左肋骨
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.quadraticCurveTo(x - rw * 0.6, ry - size * 0.02, x - rw, ry + size * 0.02);
      ctx.strokeStyle = `rgba(120,50,200,${0.55 * boneAlpha})`;
      ctx.lineWidth = 3; ctx.stroke();
      // 右肋骨
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.quadraticCurveTo(x + rw * 0.6, ry - size * 0.02, x + rw, ry + size * 0.02);
      ctx.stroke();
    }

    // 肩关节
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.arc(x + side * size * 0.32, y - size * 0.3, size * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,40,180,${0.6 * boneAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(150,70,230,${0.4 * boneAlpha})`;
      ctx.lineWidth = 2; ctx.stroke();
    });

    // 手臂（上臂 + 前臂，摆动姿态）
    [-1, 1].forEach((side, si) => {
      const shoulderX = x + side * size * 0.32;
      const shoulderY = y - size * 0.3;
      const swing = Math.sin(time * 1.5 + si * Math.PI) * 0.15;
      // 上臂
      const elbowX = shoulderX + side * size * 0.25;
      const elbowY = shoulderY + size * 0.3 + swing * size;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.strokeStyle = `rgba(100,40,180,${0.6 * boneAlpha})`;
      ctx.lineWidth = 5; ctx.stroke();
      // 前臂
      const handX = elbowX + side * size * 0.15;
      const handY = elbowY + size * 0.3;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.lineWidth = 4; ctx.stroke();

      // 手中的查克拉武器（完全体时出现）
      if(p > 0.7){
        const wpnAlpha = Math.min(1, (p - 0.7) / 0.2);
        // 剑/矛形状
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(handX + side * size * 0.1, handY - size * 0.7);
        ctx.lineTo(handX + side * size * 0.05, handY - size * 0.85);
        ctx.lineTo(handX, handY - size * 0.7);
        ctx.closePath();
        ctx.fillStyle = `rgba(140,60,220,${0.5 * wpnAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(200,120,255,${0.4 * wpnAlpha})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        // 武器光晕
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(handX + side * size * 0.05, handY - size * 0.85);
        ctx.strokeStyle = `rgba(180,100,255,${0.15 * wpnAlpha})`;
        ctx.lineWidth = 8; ctx.stroke();
      }
    });

    // 腿
    [-1, 1].forEach((side, si) => {
      const hipX = x + side * size * 0.12;
      const hipY = y + size * 0.25;
      const kneeX = hipX + side * size * 0.08;
      const kneeY = hipY + size * 0.35;
      const footX = kneeX;
      const footY = kneeY + size * 0.3;
      // 大腿
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.strokeStyle = `rgba(100,40,180,${0.55 * boneAlpha})`;
      ctx.lineWidth = 5; ctx.stroke();
      // 小腿
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.lineWidth = 4; ctx.stroke();
    });

    // 查克拉火焰外溢（从骨架边缘燃烧）
    if(p > 0.4){
      const fireAlpha = Math.min(1, (p - 0.4) / 0.3);
      for(let i = 0; i < 10; i++){
        const fa = (i / 10) * Math.PI * 2;
        const ff = Math.sin(time * 4 + i * 1.3) * 0.3 + 0.7;
        const fr = size * 0.8 * ff;
        const fx = x + Math.cos(fa) * size * 0.4;
        const fy = y + Math.sin(fa) * size * 0.3 - size * 0.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(
          fx + Math.cos(fa) * fr * 0.4,
          fy - fr * 0.6,
          fx + Math.cos(fa + 0.2) * fr * 0.15,
          fy - fr * 0.9
        );
        ctx.quadraticCurveTo(
          fx - Math.cos(fa - 0.2) * fr * 0.3,
          fy - fr * 0.4,
          fx, fy
        );
        ctx.fillStyle = `rgba(120,40,200,${0.12 * fireAlpha})`;
        ctx.fill();
      }
    }

    // 能量脉冲波（从核心向外扩散）
    const wavePhase = (time * 1.5) % 1;
    const waveR = size * 1.2 * wavePhase;
    const waveAlpha = (1 - wavePhase) * 0.2 * p;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.2, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,80,255,${waveAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawAmaterasu(ctx, x, y, size, progress){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current * 2;
    const flameR = size * progress;
    const alpha = Math.min(1, progress * 1.3);

    // 紫色光晕底层
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, flameR * 2);
    glowGrad.addColorStop(0, `rgba(80,0,120,${0.2 * alpha})`);
    glowGrad.addColorStop(0.5, `rgba(40,0,80,${0.08 * alpha})`);
    glowGrad.addColorStop(1, `rgba(20,0,40,0)`);
    ctx.beginPath(); ctx.arc(x, y, flameR * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad; ctx.fill();

    // 黑色火焰（不规则形状，向上飘动）
    for(let i = 0; i < 16; i++){
      const angle = (i / 16) * Math.PI * 2;
      const wobble = Math.sin(time * 4 + i * 1.3) * 0.3;
      const flicker = Math.sin(time * 2.5 + i * 0.7) * 0.15 + 0.85;
      const fr = flameR * flicker * (0.5 + Math.sin(i * 2.1) * 0.3);
      const fx = x + Math.cos(angle + wobble) * fr * 0.3;
      const fy = y + Math.sin(angle + wobble) * fr * 0.3 - fr * 0.4;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(
        fx + Math.cos(angle + 0.4) * fr * 0.6,
        fy - fr * 0.7,
        fx + Math.cos(angle + 0.1) * fr * 0.15,
        fy - fr * 1.1
      );
      ctx.quadraticCurveTo(
        fx - Math.cos(angle - 0.4) * fr * 0.6,
        fy - fr * 0.7,
        fx, fy
      );
      ctx.fillStyle = `rgba(3,0,3,${0.9 * alpha})`;
      ctx.fill();
    }

    // 火焰边缘紫色光晕
    for(let i = 0; i < 12; i++){
      const angle = (i / 12) * Math.PI * 2 + time * 0.3;
      const fr = flameR * (0.7 + Math.sin(time * 2 + i) * 0.2);
      const fx = x + Math.cos(angle) * fr * 0.4;
      const fy = y + Math.sin(angle) * fr * 0.4 - fr * 0.3;
      ctx.beginPath();
      ctx.arc(fx, fy, fr * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(80,0,140,${0.25 * alpha})`;
      ctx.fill();
    }

    // 白色高温核心
    const coreR = flameR * 0.2;
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
    coreGrad.addColorStop(0, `rgba(200,180,255,${0.8 * alpha})`);
    coreGrad.addColorStop(0.5, `rgba(100,0,160,${0.5 * alpha})`);
    coreGrad.addColorStop(1, `rgba(40,0,60,0)`);
    ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 紫色内焰
    const innerR = flameR * 0.5;
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, innerR);
    innerGrad.addColorStop(0, `rgba(120,0,180,${0.6 * alpha})`);
    innerGrad.addColorStop(0.4, `rgba(80,0,140,${0.35 * alpha})`);
    innerGrad.addColorStop(1, `rgba(30,0,50,0)`);
    ctx.beginPath(); ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad; ctx.fill();

    // 火星粒子（更密，带尺寸脉动）
    for(let i = 0; i < 20; i++){
      const pAngle = time * 2.5 + i * 0.32;
      const pDist = flameR * (0.3 + Math.sin(time * 1.5 + i * 0.8) * 0.4);
      const px = x + Math.cos(pAngle) * pDist;
      const py = y + Math.sin(pAngle) * pDist - flameR * 0.2;
      const sparkSize = 1.5 + Math.sin(time * 4 + i * 2.5) * 1.5;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, sparkSize), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,0,220,${0.6 * alpha})`;
      ctx.fill();
    }

    // 向上的火焰拖尾
    for(let i = 0; i < 6; i++){
      const tx = x + (Math.sin(time + i * 1.5) * flameR * 0.3);
      const ty = y - flameR * (0.5 + i * 0.15);
      const trailH = flameR * (0.3 + Math.sin(time * 2 + i) * 0.1);
      ctx.beginPath();
      ctx.ellipse(tx, ty, flameR * 0.08, trailH, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(5,0,5,${0.4 * alpha * (1 - i * 0.12)})`;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawTsukuyomi(ctx, x, y, size, progress){
    if(size < 2) return;
    ctx.save();
    const time = frameTimeSecRef.current;
    const p = progress;

    // 血月背景（多层深红空间 + 旋转扭曲）
    const spaceR = size * 2.5 * p;
    // 最外层深红黑暗
    const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, spaceR);
    outerGrad.addColorStop(0, `rgba(120,0,0,${0.45 * p})`);
    outerGrad.addColorStop(0.3, `rgba(80,0,0,${0.3 * p})`);
    outerGrad.addColorStop(0.6, `rgba(40,0,0,${0.12 * p})`);
    outerGrad.addColorStop(1, `rgba(20,0,0,0)`);
    ctx.beginPath(); ctx.arc(x, y, spaceR, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad; ctx.fill();

    // 旋转扭曲光环（幻术空间漩涡感）
    for(let ring = 0; ring < 5; ring++){
      const rr = size * (0.6 + ring * 0.35) * Math.min(1, p * 1.5);
      const wobble = Math.sin(time * 1.5 + ring * 1.2) * size * 0.06;
      const rotOffset = time * (0.3 + ring * 0.1);
      // 断续弧线（不完整圆环）
      const segments = 3 + ring;
      const segArc = (Math.PI * 2 / segments) * 0.7;
      for(let s = 0; s < segments; s++){
        const sa = rotOffset + (s / segments) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, rr + wobble, sa, sa + segArc);
        ctx.strokeStyle = `rgba(200,0,0,${(0.35 - ring * 0.05) * p})`;
        ctx.lineWidth = 2.5 - ring * 0.3;
        ctx.stroke();
      }
    }

    // 幻术空间扭曲纹理（向内螺旋线）
    for(let i = 0; i < 8; i++){
      const spiralA = time * 0.6 + (i / 8) * Math.PI * 2;
      const spiralR1 = size * 2 * Math.min(1, p * 1.3);
      const spiralR2 = size * 0.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(spiralA) * spiralR1, y + Math.sin(spiralA) * spiralR1);
      ctx.quadraticCurveTo(
        x + Math.cos(spiralA + 0.4) * spiralR1 * 0.6,
        y + Math.sin(spiralA + 0.4) * spiralR1 * 0.6,
        x + Math.cos(spiralA + 1.2) * spiralR2,
        y + Math.sin(spiralA + 1.2) * spiralR2
      );
      ctx.strokeStyle = `rgba(180,0,0,${0.1 * p})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 十字架（更立体，带深度阴影）
    if(p > 0.3){
      const crossAlpha = Math.min(1, (p - 0.3) / 0.3);
      const cw = size * 0.14;
      const ch = size * 1.2;
      // 阴影层
      ctx.fillStyle = `rgba(60,0,0,${0.3 * crossAlpha})`;
      ctx.fillRect(x - cw/2 + 3, y - ch/2 + 3, cw, ch);
      ctx.fillRect(x - ch * 0.4 + 3, y - ch * 0.15 + 3, ch * 0.8, cw);
      // 主十字架
      ctx.fillStyle = `rgba(200,0,0,${0.8 * crossAlpha})`;
      ctx.fillRect(x - cw/2, y - ch/2, cw, ch);
      ctx.fillRect(x - ch * 0.4, y - ch * 0.15, ch * 0.8, cw);
      // 光晕（save/restore 防止 shadow 状态泄漏）
      ctx.save();
      ctx.shadowColor = `rgba(255,20,20,${0.7 * crossAlpha})`;
      ctx.shadowBlur = 40;
      ctx.fillRect(x - cw/2, y - ch/2, cw, ch);
      ctx.restore();
      // 边缘高光
      ctx.strokeStyle = `rgba(255,80,80,${0.5 * crossAlpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - cw/2, y - ch/2, cw, ch);
      ctx.strokeRect(x - ch * 0.4, y - ch * 0.15, ch * 0.8, cw);
    }

    // 旋转的勾玉环（更精致的形状）
    for(let i = 0; i < 9; i++){
      const angle = time * 0.8 + (i / 9) * Math.PI * 2;
      const orbitR = size * 0.8;
      const sx = x + Math.cos(angle) * orbitR;
      const sy = y + Math.sin(angle) * orbitR;

      // 勾玉形状（不是简单圆点）
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.06, 0, Math.PI * 1.5);
      ctx.quadraticCurveTo(size * 0.08, -size * 0.02, size * 0.03, size * 0.03);
      ctx.closePath();
      ctx.fillStyle = `rgba(220,0,0,${0.7 * p})`;
      ctx.fill();
      ctx.restore();

      // 勾玉拖尾光晕
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,0,0,${0.08 * p})`;
      ctx.fill();
    }

    // 月亮之眼 — 中心（更大更复杂）
    if(p > 0.5){
      const eyeAlpha = Math.min(1, (p - 0.5) / 0.3);

      // 外眼白区域
      const eyeOuterGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
      eyeOuterGrad.addColorStop(0, `rgba(255,200,200,${0.3 * eyeAlpha})`);
      eyeOuterGrad.addColorStop(1, `rgba(200,0,0,${0.5 * eyeAlpha})`);
      ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = eyeOuterGrad; ctx.fill();

      // 虹膜（红色脉络纹理）
      ctx.beginPath(); ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,0,0,${0.9 * eyeAlpha})`; ctx.fill();

      // 虹膜内血丝纹理
      for(let i = 0; i < 8; i++){
        const va = (i / 8) * Math.PI * 2 + time * 0.1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(va) * size * 0.08, y + Math.sin(va) * size * 0.08);
        ctx.lineTo(x + Math.cos(va) * size * 0.18, y + Math.sin(va) * size * 0.18);
        ctx.strokeStyle = `rgba(140,0,0,${0.5 * eyeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 瞳孔（月牙形 — 月读标志性图案）
      ctx.beginPath();
      ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${1.0 * eyeAlpha})`; ctx.fill();
      // 月牙缺口（白色覆盖部分瞳孔）
      ctx.beginPath();
      ctx.arc(x + size * 0.025, y, size * 0.065, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,0,0,${0.95 * eyeAlpha})`; ctx.fill();

      // 瞳孔光点
      ctx.beginPath();
      ctx.arc(x - size * 0.02, y - size * 0.02, size * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,200,${0.8 * eyeAlpha})`; ctx.fill();
    }

    // 飘落的血滴粒子
    if(p > 0.3){
      const dropAlpha = Math.min(1, (p - 0.3) / 0.3);
      for(let i = 0; i < 15; i++){
        const life = ((time * 0.8 + i * 0.45) % 1);
        const dx = x + Math.sin(time + i * 2.3) * size * 1.2;
        const dy = y - size * 2 + life * size * 4;
        const dSize = 2 + Math.sin(i * 3) * 1;
        const dA = dropAlpha * (1 - life) * 0.6;
        if(dA > 0.01){
          // 血滴形状（水滴形）
          ctx.beginPath();
          ctx.moveTo(dx, dy - dSize);
          ctx.quadraticCurveTo(dx + dSize, dy, dx, dy + dSize);
          ctx.quadraticCurveTo(dx - dSize, dy, dx, dy - dSize);
          ctx.fillStyle = `rgba(180,0,0,${dA})`;
          ctx.fill();
        }
      }
    }

    // 全屏红色滤镜（幻术沉浸感）
    ctx.fillStyle = `rgba(160,0,0,${p * 0.06})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.restore();
  }

  useEffect(()=>{

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const fxCanvas = fxCanvasRef.current;
    const fxCtx = fxCanvas.getContext("2d");

    const rasengan = rasenganRef.current;
    const chidori = chidoriRef.current;
    const fireball = fireballRef.current;

    function animateEffects(){
      animFrameRef.current = requestAnimationFrame(animateEffects);

      // 帧级时间缓存 — 所有draw函数复用，避免重复Date.now()
      frameTimeRef.current = Date.now();
      frameTimeSecRef.current = frameTimeRef.current * 0.001;

      const w = window.innerWidth;
      const h = window.innerHeight;
      if(fxCanvas.width !== w || fxCanvas.height !== h){
        fxCanvas.width = w;
        fxCanvas.height = h;
      }
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      // 大师模式屏幕震动
      if(configRef.current.screenShake && ultActive.current){
        const shakeIntensity = 4;
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity;
        fxCtx.save();
        fxCtx.translate(sx, sy);
      }

      // 写轮眼
      const ssSize = sharinganSize.current;
      if(ssSize > 2){
        const totalPwr = sharinganPower.current[0] + sharinganPower.current[1];
        drawSharingan(fxCtx, window.innerWidth/2, window.innerHeight/3, ssSize, totalPwr);
        spawnSharinganParticles(window.innerWidth/2, window.innerHeight/3, ssSize);
      }

      // 影分身
      const maxClonePwr = Math.max(shadowClonePower.current[0], shadowClonePower.current[1]);
      if(cloneHandData.current && maxClonePwr > 0.01){
        drawShadowClone(fxCtx, cloneHandData.current, maxClonePwr);
        const cd = cloneHandData.current;
        const cx = (cd[0].x + cd[9].x) / 2 * window.innerWidth;
        const cy = (cd[0].y + cd[9].y) / 2 * window.innerHeight;
        spawnSmokeParticles(cx, cy);
      }

      // 八门遁甲
      const maxGatesPwr = Math.max(eightGatesPower.current[0], eightGatesPower.current[1]);
      if(maxGatesPwr > 0.01){
        drawEightGates(fxCtx, gatesCenter.current.x, gatesCenter.current.y, maxGatesPwr);
        spawnAuraParticles(gatesCenter.current.x, gatesCenter.current.y, maxGatesPwr);
      }

      // 地爆天星
      const cSize = chibakuSphereSize.current;
      if(cSize > 2){
        const maxChibakuPwr = Math.max(chibakuPower.current[0], chibakuPower.current[1]);
        drawChibakuTensei(fxCtx, chibakuPos.current.x, chibakuPos.current.y, cSize, maxChibakuPwr);
        spawnDebrisParticles(chibakuPos.current.x, chibakuPos.current.y, cSize);
      }

      // 虚式紫（原有）
      const hpSize = hollowPurpleSize.current;
      if(hpSize > 2){
        spawnParticles(hollowPurplePos.current.x, hollowPurplePos.current.y, hpSize);
        drawHollowPurple(fxCtx, hollowPurplePos.current.x, hollowPurplePos.current.y, hpSize);
      }

      // ========== 大招渲染 ==========
      const now = Date.now();
      if(ultCooldown.current < now) ultCooldown.current = 0;
      if(ultTimer.current > now){
        const ult = ultActive.current;
        const ux = ultPos.current.x;
        const uy = ultPos.current.y;
        const elapsed = (now - (ultTimer.current - configRef.current.ultDuration)) / configRef.current.ultDuration;
        const progress = Math.min(1, elapsed);

        switch(ult){
          case 'rasenshuriken':
            drawRasenshuriken(fxCtx, ux, uy, 150, progress);
            spawnAuraParticles(ux, uy, progress * 0.8);
            break;
          case "susano":
            drawSusano(fxCtx, ux, uy, 200, progress);
            break;
          case 'amaterasu':
            drawAmaterasu(fxCtx, ux, uy, 120, progress);
            break;
          case 'tsukuyomi':
            drawTsukuyomi(fxCtx, ux, uy, 180, progress);
            break;
        }
      } else {
        ultActive.current = null;
      }

      // ========== 大师模式 HUD ==========
      if(configRef.current.enableScoring){
        fxCtx.save();
        // 分数
        fxCtx.font = 'bold 32px "Bebas Neue", sans-serif';
        fxCtx.textAlign = 'left';
        fxCtx.fillStyle = 'rgba(255,255,255,0.8)';
        fxCtx.fillText(`SCORE: ${scoreRef.current}`, 24, 45);
        // 连击
        if(comboRef.current > 1){
          fxCtx.font = 'bold 22px "Bebas Neue", sans-serif';
          fxCtx.fillStyle = '#ff5252';
          fxCtx.fillText(`${comboRef.current}x COMBO`, 24, 72);
          // 连击倍率
          fxCtx.font = '14px "Rajdhani", sans-serif';
          fxCtx.fillStyle = 'rgba(255,82,82,0.7)';
          fxCtx.fillText(`×${(1 + (comboRef.current-1)*0.5).toFixed(1)} multiplier`, 24, 90);
        }
        // 完美释放次数
        if(perfectCountRef.current > 0){
          fxCtx.font = '14px "Rajdhani", sans-serif';
          fxCtx.textAlign = 'right';
          fxCtx.fillStyle = '#fbbf24';
          fxCtx.fillText(`✨ Perfect: ${perfectCountRef.current}`, fxCanvas.width - 24, 45);
        }
        fxCtx.restore();
      }

      // ========== 结印模式指示器 ==========
      if(sealMode.current){
        fxCtx.save();
        fxCtx.textAlign = 'center';
        // 全屏半透明红色遮罩
        fxCtx.fillStyle = 'rgba(198,40,40,0.06)';
        fxCtx.fillRect(0, 0, fxCanvas.width, fxCanvas.height);
        // "结印模式" 标签
        fxCtx.font = 'bold 20px "Bebas Neue", sans-serif';
        fxCtx.fillStyle = 'rgba(255,82,82,0.9)';
        fxCtx.fillText('🔮 SEAL MODE', fxCanvas.width / 2, 80);
        fxCtx.font = '13px "Rajdhani", sans-serif';
        fxCtx.fillStyle = 'rgba(255,255,255,0.5)';
        fxCtx.fillText('捏合2秒退出 | Perform seals to cast ultimate', fxCanvas.width / 2, 100);
        fxCtx.restore();
      }

      // ========== 结印显示 ==========
      if(comboDisplay.current.length > 0){
        fxCtx.save();
        fxCtx.textAlign = 'center';

        const bufLen = comboDisplay.current.length;

        // 计算最短目标序列长度（用于进度显示）
        let targetLen = 4;
        for(const seq of Object.values(ULT_SEQUENCES)){
          if(seq.length < targetLen) targetLen = seq.length;
        }
        // 如果当前印数匹配某个序列的前缀，用该序列长度
        for(const seq of Object.values(ULT_SEQUENCES)){
          if(bufLen <= seq.length){
            targetLen = seq.length;
            break;
          }
        }

        // 进度条背景
        const barW = Math.min(bufLen, targetLen) * 100;
        const barX = fxCanvas.width / 2 - barW / 2;
        const barY = fxCanvas.height - 120;
        fxCtx.fillStyle = 'rgba(255,255,255,0.06)';
        fxCtx.beginPath();
        fxCtx.roundRect(barX - 20, barY - 8, barW + 40, 90, 12);
        fxCtx.fill();

        // 进度指示 "2/4"
        fxCtx.font = 'bold 14px "Bebas Neue", sans-serif';
        fxCtx.fillStyle = 'rgba(198,40,40,0.6)';
        fxCtx.fillText(`${bufLen} / ${targetLen}`, fxCanvas.width / 2, barY - 12);

        // 显示已结的印（emoji + 地支 + 手势）
        const y1 = fxCanvas.height - 80;
        comboDisplay.current.forEach((item, i) => {
          const x = fxCanvas.width / 2 + (i - bufLen / 2 + 0.5) * 100;
          // Emoji
          fxCtx.font = '20px sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.9)';
          fxCtx.fillText(item.emoji, x, y1 - 18);
          // 地支
          fxCtx.font = 'bold 22px "Bebas Neue", sans-serif';
          fxCtx.fillStyle = 'rgba(198,40,40,0.9)';
          fxCtx.fillText(item.seal, x, y1 + 2);
          // 手势名
          fxCtx.font = '11px "Rajdhani", sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.5)';
          fxCtx.fillText(item.gesture, x, y1 + 16);
          // 已完成的绿点
          fxCtx.beginPath();
          fxCtx.arc(x, y1 + 26, 3, 0, Math.PI * 2);
          fxCtx.fillStyle = 'rgba(34,197,94,0.8)';
          fxCtx.fill();
        });

        // 待完成的空位
        for(let i = bufLen; i < targetLen; i++){
          const x = fxCanvas.width / 2 + (i - bufLen / 2 + 0.5) * 100;
          fxCtx.beginPath();
          fxCtx.arc(x, y1 - 6, 12, 0, Math.PI * 2);
          fxCtx.strokeStyle = 'rgba(255,255,255,0.15)';
          fxCtx.lineWidth = 1.5;
          fxCtx.stroke();
          // 空位里的问号
          fxCtx.font = '12px "Rajdhani", sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.2)';
          fxCtx.fillText('?', x, y1 - 2);
        }

        // 箭头连接
        if(bufLen > 1){
          fxCtx.font = '16px sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.25)';
          for(let i = 0; i < bufLen - 1; i++){
            const x = fxCanvas.width / 2 + (i - bufLen / 2 + 1) * 100;
            fxCtx.fillText('→', x, y1 - 4);
          }
        }

        // 提示
        fxCtx.font = '14px "Rajdhani", sans-serif';
        fxCtx.fillStyle = 'rgba(255,255,255,0.35)';
        fxCtx.fillText('继续结印释放大招...', fxCanvas.width / 2, fxCanvas.height - 55);
        fxCtx.restore();
      }

      // 统一粒子更新
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        switch(p.type){
          case "smoke": {
            p.vy -= 0.02;
            const ss = p.size * (1 + (1 - p.life) * 0.5);
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, ss, 0, Math.PI * 2);
            fxCtx.fillStyle = `rgba(180,180,200,${p.life * 0.25})`;
            fxCtx.fill();
            // 柔光外圈
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, ss * 1.3, 0, Math.PI * 2);
            fxCtx.fillStyle = `rgba(180,180,200,${p.life * 0.08})`;
            fxCtx.fill();
            break;
          }
          case "debris": {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.hypot(dx, dy);
            if(dist > 5){
              const force = 500 / (dist + 50);
              p.vx += (dx / dist) * force * 0.016;
              p.vy += (dy / dist) * force * 0.016;
            }
            if(dist < 10) p.life = 0;
            p.rotation += p.rotSpeed;
            fxCtx.save();
            fxCtx.translate(p.x, p.y);
            fxCtx.rotate(p.rotation);
            fxCtx.fillStyle = `rgba(80,50,30,${p.life})`;
            fxCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.6);
            fxCtx.restore();
            break;
          }
          case "aura": {
            p.vx *= 0.96;
            p.vy *= 0.96;
            // 拖尾
            fxCtx.beginPath();
            fxCtx.moveTo(p.x, p.y);
            fxCtx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
            fxCtx.strokeStyle = `rgba(255,255,200,${p.life * 0.4})`;
            fxCtx.lineWidth = p.size * p.life * 0.5;
            fxCtx.stroke();
            // 粒子点
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            fxCtx.fillStyle = `rgba(255,255,200,${p.life * 0.8})`;
            fxCtx.fill();
            break;
          }
          case "sharingan": {
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            fxCtx.fillStyle = `rgba(200,0,0,${p.life * 0.8})`;
            fxCtx.fill();
            break;
          }
          default: {
            p.vx *= 0.98;
            p.vy *= 0.98;
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            fxCtx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.life))})`;
            fxCtx.fill();
          }
        }
      });

      particles.current = particles.current.filter(p => p.life > 0);

      // 恢复屏幕震动
      if(configRef.current.screenShake && ultActive.current){
        fxCtx.restore();
      }
    }

    animateEffects();

    function onResults(res){

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      rasengan.style.display = "none";
      chidori.style.display = "none";
      fireball.style.display = "none";

      let pinchDetected = false;
      let anyRock = false;
      let openHandCount = 0;

      if(res.multiHandLandmarks && res.multiHandedness){

        res.multiHandLandmarks.forEach((pts, i) => {

          const label = res.multiHandedness[i].label;
          const isRight = label === "Right";
          const idx = isRight ? 1 : 0;

          drawConnectors(ctx, pts, HAND_CONNECTIONS, {color:"#00d4ff", lineWidth:3});
          drawLandmarks(ctx, pts, {color:"#fff", radius:2});

          // 新手模式：显示当前检测到的手势名称
          if(configRef.current.showHandName){
            const rawSeal = checkFist(pts) ? '子' : checkPalmDown(pts) ? '午' :
              checkGun(pts) ? '申' : checkPhone(pts) ? '酉' : checkPinky(pts) ? '戌' :
              checkOpen(pts) ? '丑' : checkScissor(pts) ? '寅' :
              checkTiger(pts) ? '卯' : checkRock(pts) ? '辰' :
              checkPinch(pts) ? '巳' : checkIndex(pts) ? '未' : null;
            if(rawSeal){
              const sn = SEAL_NAMES[rawSeal];
              const wrist = pts[0];
              const sx = (1 - wrist.x) * canvas.width;
              const sy = wrist.y * canvas.height - 30;
              ctx.save();
              ctx.font = 'bold 16px "Rajdhani", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.fillText(`${sn.emoji} ${sn.seal} · ${sn.gesture}`, sx, sy);
              ctx.restore();
            }
            // 捏合进度条
            if(pinch && pinchHoldTime.current > 0){
              const held = Date.now() - pinchHoldTime.current;
              const progress = Math.min(1, held / SEAL_MODE_HOLD);
              const wrist = pts[0];
              const px = (1 - wrist.x) * canvas.width;
              const py = wrist.y * canvas.height - 50;
              ctx.save();
              // 背景条
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.fillRect(px - 30, py, 60, 6);
              // 进度条
              ctx.fillStyle = sealMode.current ? 'rgba(34,197,94,0.8)' : 'rgba(198,40,40,0.8)';
              ctx.fillRect(px - 30, py, 60 * progress, 6);
              // 文字
              ctx.font = '10px "Rajdhani", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.fillText(sealMode.current ? '退出结印' : '进入结印', px, py - 4);
              ctx.restore();
            }
          }

          // 手势优先级链
          const fist     = checkFist(pts);
          const scissor  = !fist && checkScissor(pts);
          const rock     = !fist && !scissor && checkRock(pts);
          const palmDown = !fist && !scissor && !rock && checkPalmDown(pts);
          const gun      = !fist && !scissor && !rock && !palmDown && checkGun(pts);
          const phone    = !fist && !scissor && !rock && !palmDown && !gun && checkPhone(pts);
          const pinky    = !fist && !scissor && !rock && !palmDown && !gun && !phone && checkPinky(pts);
          const open     = !fist && !scissor && !rock && !palmDown && !gun && !phone && !pinky && checkOpen(pts);
          const pinch    = !open && !fist && !scissor && !rock && !palmDown && !gun && !phone && !pinky && checkPinch(pts);
          const tiger    = !open && !pinch && !fist && !scissor && !rock && !palmDown && !gun && !phone && !pinky && checkTiger(pts);

          if(rock) anyRock = true;
          if(open) openHandCount++;

          const wrist = pts[0];
          const knuckle = pts[9];
          const tx = (wrist.x + knuckle.x) / 2;
          const ty = (wrist.y + knuckle.y) / 2;
          const screenX = (1 - tx) * window.innerWidth;
          const screenY = ty * window.innerHeight;

          // ========== 捏合长按切换结印模式 ==========
          if(pinch && !lastPinchState.current){
            pinchHoldTime.current = Date.now();
          }
          if(pinch && pinchHoldTime.current > 0){
            const held = Date.now() - pinchHoldTime.current;
            if(held >= SEAL_MODE_HOLD){
              sealMode.current = !sealMode.current;
              pinchHoldTime.current = 0;
              comboBuffer.current = [];
              comboDisplay.current = [];
            }
          }
          if(!pinch) pinchHoldTime.current = 0;
          lastPinchState.current = pinch;

          // ========== 结印检测 ==========
          const seal = detectSeal(pts);
          if(sealMode.current && seal && !ultActive.current && ultCooldown.current <= Date.now()){
            const match = pushSeal(seal);
            if(match){
              ultActive.current = match;
              ultTimer.current = Date.now() + configRef.current.ultDuration;
              ultCooldown.current = Date.now() + configRef.current.ultCooldown;
              ultPos.current = { x: screenX, y: screenY };
              comboBuffer.current = [];
              comboDisplay.current = [];
              sealMode.current = false; // 释放大招后自动退出结印模式
              if(onUltRelease) onUltRelease(match);
            }
          }

          // 八门遁甲
          eightGatesPower.current[idx] += fist ? 0.05 : -0.15;
          eightGatesPower.current[idx] = Math.max(0, Math.min(1, eightGatesPower.current[idx]));
          wasFist.current[idx] = fist;
          if(eightGatesPower.current[idx] > 0.01){
            gatesCenter.current = { x: screenX, y: screenY };
          }

          // 写轮眼
          sharinganPower.current[idx] += scissor ? 0.05 : -0.15;
          sharinganPower.current[idx] = Math.max(0, Math.min(1, sharinganPower.current[idx]));
          wasScissor.current[idx] = scissor;
          sharinganSize.current = scissor
            ? Math.min(sharinganSize.current + 1.0, 120)
            : Math.max(sharinganSize.current - 3.0, 0);

          // 影分身
          shadowClonePower.current[idx] += rock ? 0.05 : -0.15;
          shadowClonePower.current[idx] = Math.max(0, Math.min(1, shadowClonePower.current[idx]));
          wasRock.current[idx] = rock;
          if(rock) cloneHandData.current = pts.map(p => ({x: p.x, y: p.y, z: p.z}));

          // 地爆天星
          chibakuPower.current[idx] += palmDown ? 0.05 : -0.15;
          chibakuPower.current[idx] = Math.max(0, Math.min(1, chibakuPower.current[idx]));
          wasPalmDown.current[idx] = palmDown;
          chibakuSphereSize.current = palmDown
            ? Math.min(chibakuSphereSize.current + 0.8, 100)
            : Math.max(chibakuSphereSize.current - 2.0, 0);
          if(palmDown){
            chibakuPos.current = { x: screenX, y: screenY - 150 };
          }

          // 螺旋丸 / 千鸟
          power.current[idx] += open ? 0.05 : -0.15;
          power.current[idx] = Math.max(0, Math.min(1, power.current[idx]));
          if(open && !wasOpen.current[idx]){
            const vid = isRight ? chidori : rasengan;
            vid.currentTime = 0;
            vid.play().catch(() => {});
          }
          wasOpen.current[idx] = open;

          if(power.current[idx] > 0.01){
            const vid = isRight ? chidori : rasengan;
            vid.style.left = `${screenX}px`;
            vid.style.top = `${screenY}px`;
            vid.style.opacity = power.current[idx];
            vid.style.display = "block";
          }

          // 火球术
          fireballPower.current[idx] += tiger ? 0.05 : -0.15;
          fireballPower.current[idx] = Math.max(0, Math.min(1, fireballPower.current[idx]));
          if(tiger && !wasTiger.current[idx]){
            fireball.currentTime = 0;
            fireball.play().catch(() => {});
          }
          wasTiger.current[idx] = tiger;

          if(fireballPower.current[idx] > 0.01){
            fireball.style.left = `${screenX}px`;
            fireball.style.top = `${screenY}px`;
            fireball.style.opacity = 1;
            fireball.style.display = "block";
          }

          // 虚式紫
          if(pinch){
            pinchDetected = true;
            const thumbTip = pts[4];
            const middleTip = pts[12];
            const mx = (1 - (thumbTip.x + middleTip.x) / 2) * window.innerWidth;
            const my = ((thumbTip.y + middleTip.y) / 2) * window.innerHeight;
            hollowPurplePos.current = { x: mx, y: my };
            hollowPurpleSize.current = Math.min(hollowPurpleSize.current + 1.2, 150);
            wasPinching.current = true;
          }

        });
      }

      if(!pinchDetected){
        hollowPurpleSize.current = Math.max(0, hollowPurpleSize.current - 4);
        wasPinching.current = false;
      }

      // 双手结印检测（需要两双手同时出现 + 结印模式 + 无大招进行中）
      if(sealMode.current && !ultActive.current && ultCooldown.current <= Date.now()
         && res.multiHandLandmarks && res.multiHandLandmarks.length >= 2){
        const hands = res.multiHandLandmarks;
        let dblSeal = null;
        if(checkDoubleSube(hands))    dblSeal = '子';
        else if(checkDoubleUshi(hands)) dblSeal = '丑';
        else if(checkDoubleTora(hands)) dblSeal = '寅';
        else if(checkDoubleUma(hands))  dblSeal = '午';
        else if(openHandCount >= 2)     dblSeal = '亥';

        if(dblSeal){
          const sealObj = SEAL_NAMES[dblSeal];
          if(sealObj){
            const match = pushSeal(sealObj);
            if(match){
              ultActive.current = match;
              ultTimer.current = Date.now() + configRef.current.ultDuration;
              ultCooldown.current = Date.now() + configRef.current.ultCooldown;
              ultPos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
              comboBuffer.current = [];
              comboDisplay.current = [];
              sealMode.current = false;
              if(onUltRelease) onUltRelease(match);
            }
          }
        }
      }

      // 手离开画面后，所有 power 值衰减
      for(let i = 0; i < 2; i++){
        power.current[i] = Math.max(0, power.current[i] - 0.02);
        fireballPower.current[i] = Math.max(0, fireballPower.current[i] - 0.02);
        sharinganPower.current[i] = Math.max(0, sharinganPower.current[i] - 0.02);
        shadowClonePower.current[i] = Math.max(0, shadowClonePower.current[i] - 0.02);
        eightGatesPower.current[i] = Math.max(0, eightGatesPower.current[i] - 0.02);
        chibakuPower.current[i] = Math.max(0, chibakuPower.current[i] - 0.02);
      }

      if(!anyRock){
        cloneHandData.current = null;
      }

    }

    const hands = new Hands({
      locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });

    hands.onResults(onResults);

    const cam = new Camera(video, {
      onFrame: async() => {
        await hands.send({image: video});
      },
      width: 1280,
      height: 720
    });

    cam.start();

    return () => {
      if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      cam.stop();
      hands.close();
      if(video.srcObject){
        video.srcObject.getTracks().forEach(t => t.stop());
      }
    };

  },[]);

  return(
    <>
      <video id="webcam" ref={videoRef} autoPlay playsInline></video>
      <canvas id="landmark-canvas" ref={canvasRef}></canvas>

      <canvas
        ref={fxCanvasRef}
        style={{
          position:"absolute",
          top:0, left:0,
          width:"100vw",
          height:"100vh",
          pointerEvents:"none",
          zIndex:10,
          mixBlendMode:"screen",
          transform:"none"
        }}
      />

      <video
        ref={rasenganRef}
        id="rasengan"
        className="fx"
        src="/assets/naruto.mp4"
        muted
        loop
        style={{display:"none"}}
      />

      <video
        ref={chidoriRef}
        id="chidori"
        className="fx"
        src="/assets/chidori.mp4"
        muted
        loop
        style={{display:"none"}}
      />

      <video
        ref={fireballRef}
        id="fireball"
        className="fx"
        src="/assets/fireball.mp4"
        muted
        loop
        style={{display:"none"}}
      />
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
    </>
  );
}
