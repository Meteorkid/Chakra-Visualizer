import { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

export default function CameraComponent({ onBack }){

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
  const GESTURE_FRAMES = 3;              // 连续 N 帧相同才确认

  // ========== 粒子限制 ==========
  const PARTICLE_LIMIT = 500;

  // ========== 结印系统 refs ==========
  const comboBuffer = useRef([]);        // 结印缓冲区
  const comboTimer = useRef(null);       // 超时计时器
  const lastGestureTime = useRef(0);     // 上次手势时间
  const comboDisplay = useRef([]);       // 显示用的结印序列
  const ultCooldown = useRef(0);         // 大招冷却
  const ultActive = useRef(null);        // 当前激活的大招
  const ultTimer = useRef(0);           // 大招持续时间
  const ultPos = useRef({ x: 0, y: 0 }); // 大招位置

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
    const angleDiff = Math.abs(angle - pipAngle);
    const aScore = angleDiff < 0.5 ? 0.5 : angleDiff < 1.0 ? 0.25 : 0;

    return Math.min(1, yScore + dScore + aScore);
  }

  // 判断手指是否伸直（阈值 0.6）
  function isFingerUp(pts, tipIdx, pipIdx, mcpIdx){
    return fingerScore(pts, tipIdx, pipIdx, mcpIdx) >= 0.6;
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

  // ========== 结印系统 ==========

  const SEAL_NAMES = {
    '子': { seal: '子', gesture: '握拳' },
    '丑': { seal: '丑', gesture: '张掌' },
    '寅': { seal: '寅', gesture: 'V字' },
    '卯': { seal: '卯', gesture: '竖拇指' },
    '辰': { seal: '辰', gesture: '摇滚' },
    '巳': { seal: '巳', gesture: '捏合' },
    '午': { seal: '午', gesture: '掌朝下' },
    '未': { seal: '未', gesture: '食指' },
  };

  function detectSeal(pts){
    let raw = null;
    if(checkFist(pts))     raw = '子';
    else if(checkPalmDown(pts)) raw = '午';
    else if(checkOpen(pts))     raw = '丑';
    else if(checkScissor(pts))  raw = '寅';
    else if(checkTiger(pts))    raw = '卯';
    else if(checkRock(pts))     raw = '辰';
    else if(checkPinch(pts))    raw = '巳';
    else if(checkIndex(pts))    raw = '未';

    gestureHistory.current.push(raw);
    if(gestureHistory.current.length > GESTURE_FRAMES){
      gestureHistory.current.shift();
    }

    if(gestureHistory.current.length >= GESTURE_FRAMES){
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

  // 大招结印序列定义
  const ULT_SEQUENCES = {
    'rasenshuriken': ['子','丑','寅','卯'],
    'susano':      ['子','未','巳','午'],
    'amaterasu':     ['子','丑','午','未'],
    'tsukuyomi':     ['子','午','未'],
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
    if(now - lastGestureTime.current > 3000){
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
    for(let i = 0; i < 3; i++){
      const angle = Math.random() * Math.PI * 2;
      const dist = size * 0.5 + Math.random() * size * 0.3;
      particles.current.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI/2) * 0.5,
        vy: Math.sin(angle + Math.PI/2) * 0.5,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        size: 2 + Math.random() * 3,
        type: "sharingan"
      });
    }
  }

  function spawnSmokeParticles(x, y){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 5; i++){
      particles.current.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -1 - Math.random() * 2.5,
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
        size: 15 + Math.random() * 30,
        type: "smoke"
      });
    }
  }

  function spawnAuraParticles(x, y, power){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    const count = Math.floor(6 + power * 8);
    for(let i = 0; i < count; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + power * 6 + Math.random() * 3;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        size: 2 + Math.random() * 4,
        type: "aura"
      });
    }
  }

  function spawnDebrisParticles(x, y, size){
    if(particles.current.length >= PARTICLE_LIMIT) return;
    for(let i = 0; i < 3; i++){
      const angle = Math.random() * Math.PI * 2;
      const dist = 250 + Math.random() * 250;
      particles.current.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        life: 1,
        decay: 0.003 + Math.random() * 0.005,
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        targetX: x, targetY: y,
        type: "debris"
      });
    }
  }

  // ========== 绘制函数 ==========

  function drawHollowPurple(ctx, x, y, size){
    if(size < 2) return;
    ctx.save();

    const atmosphereGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
    atmosphereGrad.addColorStop(0, `rgba(138,43,226,${Math.min(0.25, size/200)})`);
    atmosphereGrad.addColorStop(0.5, `rgba(138,43,226,${Math.min(0.1, size/400)})`);
    atmosphereGrad.addColorStop(1, `rgba(80,0,160,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx.fillStyle = atmosphereGrad; ctx.fill();

    const blueGrad = ctx.createRadialGradient(x - size*0.4, y, 0, x - size*0.4, y, size * 1.8);
    blueGrad.addColorStop(0, `rgba(60,140,255,${Math.min(0.7, size/80)})`);
    blueGrad.addColorStop(0.5, `rgba(30,80,220,${Math.min(0.4, size/150)})`);
    blueGrad.addColorStop(1, `rgba(0,30,180,0)`);
    ctx.beginPath(); ctx.arc(x - size*0.1, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = blueGrad; ctx.fill();

    const redGrad = ctx.createRadialGradient(x + size*0.4, y, 0, x + size*0.4, y, size * 1.8);
    redGrad.addColorStop(0, `rgba(255,50,80,${Math.min(0.7, size/80)})`);
    redGrad.addColorStop(0.5, `rgba(220,20,60,${Math.min(0.4, size/150)})`);
    redGrad.addColorStop(1, `rgba(180,0,40,0)`);
    ctx.beginPath(); ctx.arc(x + size*0.1, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = redGrad; ctx.fill();

    for(let i = 0; i < 12; i++){
      const angle = (i / 12) * Math.PI * 2 + Date.now() * 0.002;
      const rx = x + Math.cos(angle) * size * 1.1;
      const ry = y + Math.sin(angle) * size * 0.4;
      ctx.beginPath(); ctx.arc(rx, ry, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = i < 6
        ? `rgba(100,180,255,${Math.min(0.8, size/60)})`
        : `rgba(220,80,255,${Math.min(0.8, size/60)})`;
      ctx.fill();
    }

    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(255,255,255,${Math.min(1, size/40)})`);
    coreGrad.addColorStop(0.2, `rgba(230,180,255,${Math.min(0.95, size/50)})`);
    coreGrad.addColorStop(0.5, `rgba(180,80,255,${Math.min(0.85, size/60)})`);
    coreGrad.addColorStop(0.8, `rgba(100,20,200,${Math.min(0.6, size/90)})`);
    coreGrad.addColorStop(1, `rgba(60,0,120,0)`);
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
    innerGrad.addColorStop(0, `rgba(255,255,255,${Math.min(1, size/30)})`);
    innerGrad.addColorStop(1, `rgba(255,220,255,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad; ctx.fill();

    ctx.restore();
  }

  function drawSharingan(ctx, cx, cy, size, totalPower){
    if(size < 2) return;
    ctx.save();

    // 全屏红色滤镜
    ctx.fillStyle = `rgba(255,0,0,${totalPower * 0.12})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 红色虹膜
    const irisGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
    irisGrad.addColorStop(0, `rgba(200,0,0,0.9)`);
    irisGrad.addColorStop(0.7, `rgba(180,0,0,0.7)`);
    irisGrad.addColorStop(1, `rgba(120,0,0,0)`);
    ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad; ctx.fill();

    // 内环
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(100,0,0,0.5)`;
    ctx.lineWidth = 2; ctx.stroke();

    // 三勾玉
    const time = Date.now() * 0.003;
    for(let i = 0; i < 3; i++){
      const angle = time + (i * Math.PI * 2 / 3);
      const tx = cx + Math.cos(angle) * size * 0.35;
      const ty = cy + Math.sin(angle) * size * 0.35;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle + Math.PI / 2);
      // 勾玉身体
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 1.5);
      ctx.fillStyle = `rgba(0,0,0,0.85)`;
      ctx.fill();
      // 勾玉尾巴
      ctx.beginPath();
      ctx.moveTo(Math.cos(Math.PI * 1.5) * size * 0.12, Math.sin(Math.PI * 1.5) * size * 0.12);
      ctx.quadraticCurveTo(size * 0.2, -size * 0.05, size * 0.08, size * 0.05);
      ctx.fillStyle = `rgba(0,0,0,0.85)`;
      ctx.fill();
      ctx.restore();
    }

    // 瞳孔
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,0.95)`;
    ctx.fill();

    // 瞳孔内环
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200,0,0,0.6)`;
    ctx.lineWidth = 1.5; ctx.stroke();

    ctx.restore();
  }

  function drawShadowClone(ctx, pts, power){
    if(!pts || power < 0.01) return;
    const offsets = [{dx:80, dy:-30}, {dx:-60, dy:40}, {dx:100, dy:50}];
    const alphas = [0.5, 0.35, 0.2];

    offsets.forEach((off, gi) => {
      ctx.save();
      ctx.globalAlpha = alphas[gi] * power;
      ctx.strokeStyle = `rgba(180,180,255,1)`;
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(pts[a].x * ctx.canvas.width + off.dx, pts[a].y * ctx.canvas.height + off.dy);
        ctx.lineTo(pts[b].x * ctx.canvas.width + off.dx, pts[b].y * ctx.canvas.height + off.dy);
        ctx.stroke();
      });
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * ctx.canvas.width + off.dx, p.y * ctx.canvas.height + off.dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,200,255,1)`;
        ctx.fill();
      });
      ctx.restore();
    });
  }

  function drawEightGates(ctx, x, y, pwr){
    if(pwr < 0.01) return;
    ctx.save();

    // 颜色渐变：青→绿→金
    let r, g, b;
    if(pwr < 0.33){
      const t = pwr / 0.33;
      r = 0; g = Math.floor(200 + 55 * t); b = 255;
    } else if(pwr < 0.66){
      const t = (pwr - 0.33) / 0.33;
      r = Math.floor(255 * t); g = 255; b = Math.floor(255 - 155 * t);
    } else {
      const t = (pwr - 0.66) / 0.34;
      r = 255; g = Math.floor(200 - 50 * t); b = 0;
    }

    // 外层 aura
    const auraR = 80 + pwr * 120;
    const auraGrad = ctx.createRadialGradient(x, y, 0, x, y, auraR);
    auraGrad.addColorStop(0, `rgba(${r},${g},${b},${0.5 * pwr})`);
    auraGrad.addColorStop(0.5, `rgba(${r},${g},${b},${0.2 * pwr})`);
    auraGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad; ctx.fill();

    // 内核白光
    const coreR = 20 + pwr * 30;
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
    coreGrad.addColorStop(0, `rgba(255,255,255,${0.8 * pwr})`);
    coreGrad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 8 条能量线
    const time = Date.now() * 0.001;
    for(let i = 0; i < 8; i++){
      const angle = time + (i * Math.PI * 2 / 8);
      const len = 40 + pwr * 80 + Math.sin(time * 2 + i) * 15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 * pwr})`;
      ctx.lineWidth = 2 + pwr * 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawChibakuTensei(ctx, x, y, size, pwr){
    if(size < 2) return;
    ctx.save();

    // 引力场
    const fieldGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    fieldGrad.addColorStop(0, `rgba(20,0,40,${0.6 * pwr})`);
    fieldGrad.addColorStop(0.5, `rgba(30,0,60,${0.2 * pwr})`);
    fieldGrad.addColorStop(1, `rgba(20,0,40,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = fieldGrad; ctx.fill();

    // 核心球体
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(0,0,0,1)`);
    coreGrad.addColorStop(0.4, `rgba(30,0,50,0.95)`);
    coreGrad.addColorStop(0.7, `rgba(60,0,80,0.6)`);
    coreGrad.addColorStop(1, `rgba(40,0,60,0)`);
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 能量环
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,50,200,${0.5 * pwr})`;
    ctx.lineWidth = 2; ctx.stroke();

    // 内部高光
    const hlGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.2);
    hlGrad.addColorStop(0, `rgba(200,150,255,0.8)`);
    hlGrad.addColorStop(1, `rgba(200,150,255,0)`);
    ctx.beginPath(); ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad; ctx.fill();

    ctx.restore();
  }

  // ========== 大招特效绘制函数 ==========

  function drawRasenshuriken(ctx, x, y, size, progress){
    ctx.save();
    const time = Date.now() * 0.003;
    const r = size * (0.5 + progress * 0.5);

    // 外层风刃光环
    for(let i = 0; i < 4; i++){
      const angle = time + (i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * r * 2, y + Math.sin(angle) * r * 2);
      ctx.strokeStyle = `rgba(100,200,255,${0.3 * progress})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 旋转手里剑叶片
    for(let i = 0; i < 4; i++){
      const angle = time * 2 + (i * Math.PI / 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, -r * 0.15);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.8, r * 0.15);
      ctx.closePath();
      ctx.fillStyle = `rgba(60,180,255,${0.7 * progress})`;
      ctx.fill();
      ctx.restore();
    }

    // 中心螺旋丸核心
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.4);
    coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 * progress})`);
    coreGrad.addColorStop(0.4, `rgba(100,200,255,${0.7 * progress})`);
    coreGrad.addColorStop(1, `rgba(30,100,200,0)`);
    ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 外层能量环
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(150,220,255,${0.4 * progress})`;
    ctx.lineWidth = 2; ctx.stroke();

    ctx.restore();
  }

  function drawSusano(ctx, x, y, size, progress){
    ctx.save();
    const time = Date.now() * 0.001;

    // 外壳层（最外层）
    if(progress > 0.3){
      const shellAlpha = Math.min(1, (progress - 0.3) / 0.3);
      const shellGrad = ctx.createRadialGradient(x, y - size * 0.3, 0, x, y - size * 0.3, size * 1.5);
      shellGrad.addColorStop(0, `rgba(100,50,180,${0.15 * shellAlpha})`);
      shellGrad.addColorStop(1, `rgba(60,20,120,0)`);
      ctx.beginPath(); ctx.arc(x, y - size * 0.3, size * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = shellGrad; ctx.fill();
    }

    // 肌肉层
    if(progress > 0.15){
      const muscleAlpha = Math.min(1, (progress - 0.15) / 0.3);
      const mGrad = ctx.createRadialGradient(x, y - size * 0.2, 0, x, y - size * 0.2, size);
      mGrad.addColorStop(0, `rgba(120,60,200,${0.3 * muscleAlpha})`);
      mGrad.addColorStop(0.6, `rgba(80,30,160,${0.15 * muscleAlpha})`);
      mGrad.addColorStop(1, `rgba(50,10,100,0)`);
      ctx.beginPath(); ctx.arc(x, y - size * 0.2, size, 0, Math.PI * 2);
      ctx.fillStyle = mGrad; ctx.fill();
    }

    // 骨架层（核心）
    const boneAlpha = Math.min(1, progress / 0.3);
    // 头骨
    ctx.beginPath(); ctx.arc(x, y - size * 0.6, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(140,80,220,${0.6 * boneAlpha})`; ctx.fill();
    // 脊椎
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.35);
    ctx.lineTo(x, y + size * 0.3);
    ctx.strokeStyle = `rgba(140,80,220,${0.5 * boneAlpha})`;
    ctx.lineWidth = 4; ctx.stroke();
    // 肋骨
    for(let i = 0; i < 4; i++){
      const ry = y - size * 0.25 + i * size * 0.12;
      const rw = size * 0.3 * (1 - i * 0.1);
      ctx.beginPath();
      ctx.ellipse(x, ry, rw, size * 0.03, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140,80,220,${0.4 * boneAlpha})`;
      ctx.lineWidth = 2; ctx.stroke();
    }

    // 能量眼睛
    if(progress > 0.5){
      const eyeAlpha = Math.min(1, (progress - 0.5) / 0.3);
      ctx.beginPath(); ctx.arc(x - size * 0.08, y - size * 0.62, size * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,50,80,${0.8 * eyeAlpha})`; ctx.fill();
      ctx.beginPath(); ctx.arc(x + size * 0.08, y - size * 0.62, size * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,50,80,${0.8 * eyeAlpha})`; ctx.fill();
    }

    ctx.restore();
  }

  function drawAmaterasu(ctx, x, y, size, progress){
    ctx.save();
    const time = Date.now() * 0.002;

    // 黑色火焰核心
    const flameR = size * progress;
    for(let i = 0; i < 8; i++){
      const angle = (i / 8) * Math.PI * 2 + time * 0.5;
      const flicker = Math.sin(time * 3 + i) * 0.2 + 0.8;
      const fr = flameR * flicker * (0.6 + Math.random() * 0.4);
      const fx = x + Math.cos(angle) * fr * 0.3;
      const fy = y + Math.sin(angle) * fr * 0.3 - fr * 0.3;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(
        fx + Math.cos(angle + 0.5) * fr * 0.5,
        fy - fr * 0.6,
        fx + Math.cos(angle) * fr * 0.2,
        fy - fr
      );
      ctx.quadraticCurveTo(
        fx - Math.cos(angle - 0.5) * fr * 0.5,
        fy - fr * 0.6,
        fx, fy
      );
      ctx.fillStyle = `rgba(10,0,10,${0.7 * progress})`;
      ctx.fill();
    }

    // 紫色内焰
    const innerR = flameR * 0.4;
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, innerR);
    innerGrad.addColorStop(0, `rgba(80,0,120,${0.5 * progress})`);
    innerGrad.addColorStop(1, `rgba(20,0,30,0)`);
    ctx.beginPath(); ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad; ctx.fill();

    // 火星粒子
    for(let i = 0; i < 6; i++){
      const pAngle = time * 2 + i * 1.05;
      const pDist = flameR * (0.5 + Math.sin(time + i) * 0.3);
      const px = x + Math.cos(pAngle) * pDist;
      const py = y + Math.sin(pAngle) * pDist;
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,0,180,${0.6 * progress})`;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawTsukuyomi(ctx, x, y, size, progress){
    ctx.save();
    const time = Date.now() * 0.001;

    // 红色幻术空间背景
    const spaceR = size * 2 * progress;
    const spaceGrad = ctx.createRadialGradient(x, y, 0, x, y, spaceR);
    spaceGrad.addColorStop(0, `rgba(180,0,0,${0.4 * progress})`);
    spaceGrad.addColorStop(0.5, `rgba(100,0,0,${0.2 * progress})`);
    spaceGrad.addColorStop(1, `rgba(40,0,0,0)`);
    ctx.beginPath(); ctx.arc(x, y, spaceR, 0, Math.PI * 2);
    ctx.fillStyle = spaceGrad; ctx.fill();

    // 十字架
    if(progress > 0.3){
      const crossAlpha = Math.min(1, (progress - 0.3) / 0.3);
      const cw = size * 0.15;
      const ch = size * 1.2;
      // 竖
      ctx.fillStyle = `rgba(200,0,0,${0.6 * crossAlpha})`;
      ctx.fillRect(x - cw/2, y - ch/2, cw, ch);
      // 横
      ctx.fillRect(x - ch * 0.4, y - ch * 0.15, ch * 0.8, cw);

      // 十字架光晕
      ctx.shadowColor = `rgba(255,0,0,${0.5 * crossAlpha})`;
      ctx.shadowBlur = 20;
      ctx.fillRect(x - cw/2, y - ch/2, cw, ch);
      ctx.shadowBlur = 0;
    }

    // 旋转的勾玉环
    for(let i = 0; i < 6; i++){
      const angle = time + (i * Math.PI * 2 / 6);
      const orbitR = size * 0.8;
      const sx = x + Math.cos(angle) * orbitR;
      const sy = y + Math.sin(angle) * orbitR;
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,0,0,${0.5 * progress})`;
      ctx.fill();
    }

    // 中心眼睛
    if(progress > 0.5){
      const eyeAlpha = Math.min(1, (progress - 0.5) / 0.3);
      ctx.beginPath(); ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,0,0,${0.7 * eyeAlpha})`; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, size * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${0.9 * eyeAlpha})`; ctx.fill();
    }

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

      const w = window.innerWidth;
      const h = window.innerHeight;
      if(fxCanvas.width !== w || fxCanvas.height !== h){
        fxCanvas.width = w;
        fxCanvas.height = h;
      }
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

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
        const elapsed = (now - (ultTimer.current - 5000)) / 5000; // 0→1 over 5s
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

      // ========== 结印显示 ==========
      if(comboDisplay.current.length > 0){
        fxCtx.save();
        fxCtx.textAlign = 'center';

        // 显示已结的印（地支 + 手势）
        const y1 = fxCanvas.height - 90;
        comboDisplay.current.forEach((item, i) => {
          const x = fxCanvas.width / 2 + (i - comboDisplay.current.length / 2 + 0.5) * 100;
          // 地支名
          fxCtx.font = 'bold 28px "Bebas Neue", sans-serif';
          fxCtx.fillStyle = 'rgba(198,40,40,0.9)';
          fxCtx.fillText(item.seal, x, y1);
          // 手势名
          fxCtx.font = '13px "Rajdhani", sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.6)';
          fxCtx.fillText(item.gesture, x, y1 + 18);
        });

        // 箭头连接
        if(comboDisplay.current.length > 1){
          fxCtx.font = '18px sans-serif';
          fxCtx.fillStyle = 'rgba(255,255,255,0.3)';
          for(let i = 0; i < comboDisplay.current.length - 1; i++){
            const x = fxCanvas.width / 2 + (i - comboDisplay.current.length / 2 + 1) * 100;
            fxCtx.fillText('→', x, y1 - 5);
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

      if(res.multiHandLandmarks && res.multiHandedness){

        res.multiHandLandmarks.forEach((pts, i) => {

          const label = res.multiHandedness[i].label;
          const isRight = label === "Right";
          const idx = isRight ? 1 : 0;

          drawConnectors(ctx, pts, HAND_CONNECTIONS, {color:"#00d4ff", lineWidth:3});
          drawLandmarks(ctx, pts, {color:"#fff", radius:2});

          // 手势优先级链
          const fist     = checkFist(pts);
          const scissor  = !fist && checkScissor(pts);
          const rock     = !fist && !scissor && checkRock(pts);
          const palmDown = !fist && !scissor && !rock && checkPalmDown(pts);
          const open     = !fist && !scissor && !rock && !palmDown && checkOpen(pts);
          const pinch    = !open && !fist && !scissor && !rock && !palmDown && checkPinch(pts);
          const tiger    = !open && !pinch && !fist && !scissor && !rock && !palmDown && checkTiger(pts);

          if(rock) anyRock = true;

          const wrist = pts[0];
          const knuckle = pts[9];
          const tx = (wrist.x + knuckle.x) / 2;
          const ty = (wrist.y + knuckle.y) / 2;
          const screenX = (1 - tx) * window.innerWidth;
          const screenY = ty * window.innerHeight;

          // ========== 结印检测 ==========
          const seal = detectSeal(pts);
          if(seal && !ultActive.current && ultCooldown.current <= Date.now()){
            const match = pushSeal(seal);
            if(match){
              // 触发大招！
              ultActive.current = match;
              ultTimer.current = Date.now() + 5000;
              ultCooldown.current = Date.now() + 8000;
              ultPos.current = { x: screenX, y: screenY };
              comboBuffer.current = [];
              comboDisplay.current = [];
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
