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

  // ========== 手势检测函数 ==========

  function fingerExtended(pts, tipIdx, pipIdx){
    const wrist = pts[0];
    return Math.hypot(pts[tipIdx].x - wrist.x, pts[tipIdx].y - wrist.y) >
           Math.hypot(pts[pipIdx].x - wrist.x, pts[pipIdx].y - wrist.y);
  }

  // 更严格的伸直检测：基于 y 坐标，减少误判
  function fingerClearlyUp(pts, tipIdx, pipIdx, mcpIdx){
    return pts[tipIdx].y < pts[pipIdx].y && pts[tipIdx].y < pts[mcpIdx].y;
  }

  function checkOpen(pts){
    let count = 0;
    if(fingerClearlyUp(pts, 8, 6, 5)) count++;
    if(fingerClearlyUp(pts, 12, 10, 9)) count++;
    if(fingerClearlyUp(pts, 16, 14, 13)) count++;
    if(fingerClearlyUp(pts, 20, 18, 17)) count++;
    return count >= 3;
  }

  function checkTiger(pts){
    const wrist = pts[0];
    const thumbTip = pts[4];
    const thumbMcp = pts[2];
    const thumbUp = thumbTip.y < thumbMcp.y - 0.05;
    const indexClosed = !fingerExtended(pts, 8, 6);
    const middleClosed = !fingerExtended(pts, 12, 10);
    const ringClosed = !fingerExtended(pts, 16, 14);
    const pinkyClosed = !fingerExtended(pts, 20, 18);
    return thumbUp && indexClosed && middleClosed && ringClosed && pinkyClosed;
  }

  function checkPinch(pts){
    const thumbTip = pts[4];
    const indexTip = pts[8];
    const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const middleClosed = !fingerExtended(pts, 12, 10);
    const ringClosed = !fingerExtended(pts, 16, 14);
    const pinkyClosed = !fingerExtended(pts, 20, 18);
    return dist < 0.05 && middleClosed && ringClosed && pinkyClosed;
  }

  function checkFist(pts){
    if(fingerClearlyUp(pts, 8, 6, 5)) return false;
    if(fingerClearlyUp(pts, 12, 10, 9)) return false;
    if(fingerClearlyUp(pts, 16, 14, 13)) return false;
    if(fingerClearlyUp(pts, 20, 18, 17)) return false;
    return true;
  }

  function checkScissor(pts){
    // 食指+中指明确伸直，无名指+小指明确弯曲
    return fingerClearlyUp(pts, 8, 6, 5) &&
           fingerClearlyUp(pts, 12, 10, 9) &&
           !fingerClearlyUp(pts, 16, 14, 13) &&
           !fingerClearlyUp(pts, 20, 18, 17);
  }

  function checkRock(pts){
    // 食指+中指+小指伸直，无名指弯曲
    return fingerClearlyUp(pts, 8, 6, 5) &&
           fingerClearlyUp(pts, 12, 10, 9) &&
           !fingerClearlyUp(pts, 16, 14, 13) &&
           fingerClearlyUp(pts, 20, 18, 17);
  }

  function checkPalmDown(pts){
    // 所有手指伸直 + 手掌朝下
    if(!fingerClearlyUp(pts, 8, 6, 5)) return false;
    if(!fingerClearlyUp(pts, 12, 10, 9)) return false;
    if(!fingerClearlyUp(pts, 16, 14, 13)) return false;
    if(!fingerClearlyUp(pts, 20, 18, 17)) return false;
    // 手掌朝下：指尖 y 坐标大于手腕
    const avgTipY = (pts[8].y + pts[12].y + pts[16].y + pts[20].y) / 4;
    return avgTipY > pts[0].y + 0.04;
  }

  // ========== 粒子生成函数 ==========

  function spawnParticles(x, y, size){
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

      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
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
            fxCtx.fillStyle = `${p.color}${p.life})`;
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
          if(rock) cloneHandData.current = pts;

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
            vid.play();
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
            fireball.play();
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
