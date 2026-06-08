/**
 * 特效渲染模块
 *
 * 提供粒子生成和特效绘制函数。
 * 所有函数接收 ctx（Canvas 2D context）和时间参数，不直接访问 DOM。
 */

/**
 * 创建特效渲染系统
 *
 * @param {Object} config - 配置
 * @param {number} config.particleLimit - 粒子数量上限
 * @param {Function} config.getTime - 返回当前帧时间（秒），默认 Date.now()*0.001
 * @param {Object} config.particleSystem - 粒子系统实例（可选，用于对象池）
 * @returns {Object} 特效渲染 API
 */
export function createEffectsSystem(config = {}) {
  const { particleLimit = 1500, getTime = () => Date.now() * 0.001, particleSystem = null } = config;

  // 获取粒子对象（优先使用对象池）
  function acquireParticle() {
    if (particleSystem && particleSystem.acquireParticle) {
      return particleSystem.acquireParticle();
    }
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 1, decay: 0.01, size: 5,
      color: 'rgba(255,255,255,', type: 'default',
      rotation: 0, rotSpeed: 0, targetX: 0, targetY: 0,
    };
  }

  // 释放粒子对象（归还到对象池）
  function releaseParticle(p) {
    if (particleSystem && particleSystem.releaseParticle) {
      particleSystem.releaseParticle(p);
    }
  }

  // ==================== 粒子生成 ====================

  /**
   * 默认粒子（螺旋丸/虚式紫等）
   */
  function spawnParticles(particles, x, y, size) {
    if (particles.length >= particleLimit) return;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const p = acquireParticle();
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1;
      p.decay = 0.015 + Math.random() * 0.025;
      p.size = (3 + Math.random() * 6) * (size / 80);
      p.color = Math.random() > 0.5 ? `rgba(80,160,255,` : `rgba(200,60,255,`;
      p.type = "default";
      particles.push(p);
    }
  }

  /**
   * 写轮眼粒子
   */
  function spawnSharinganParticles(particles, x, y, size) {
    if (particles.length >= particleLimit) return;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = size * 0.3 + Math.random() * size * 0.5;
      const p = acquireParticle();
      p.x = x + Math.cos(angle) * dist;
      p.y = y + Math.sin(angle) * dist;
      p.vx = Math.cos(angle + Math.PI / 2) * 1.2;
      p.vy = Math.sin(angle + Math.PI / 2) * 1.2;
      p.life = 1;
      p.decay = 0.008 + Math.random() * 0.012;
      p.size = 2 + Math.random() * 4;
      p.type = "sharingan";
      particles.push(p);
    }
  }

  /**
   * 烟雾粒子（影分身登场）
   */
  function spawnSmokeParticles(particles, x, y) {
    if (particles.length >= particleLimit) return;
    for (let i = 0; i < 8; i++) {
      const p = acquireParticle();
      p.x = x + (Math.random() - 0.5) * 80;
      p.y = y + (Math.random() - 0.5) * 50;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = -0.5 - Math.random() * 1.5;
      p.life = 1;
      p.decay = 0.004 + Math.random() * 0.006;
      p.size = 25 + Math.random() * 45;
      p.type = "smoke";
      particles.push(p);
    }
  }

  /**
   * 气场粒子（八门遁甲等）
   */
  function spawnAuraParticles(particles, x, y, power) {
    if (particles.length >= particleLimit) return;
    const count = Math.floor(8 + power * 12);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + power * 8 + Math.random() * 4;
      const p = acquireParticle();
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1;
      p.decay = 0.015 + Math.random() * 0.02;
      p.size = 2 + Math.random() * 5;
      p.type = "aura";
      particles.push(p);
    }
  }

  /**
   * 碎片粒子（地爆天星）
   */
  function spawnDebrisParticles(particles, x, y, size) {
    if (particles.length >= particleLimit) return;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 350;
      const p = acquireParticle();
      p.x = x + Math.cos(angle) * dist;
      p.y = y + Math.sin(angle) * dist;
      p.vx = 0; p.vy = 0;
      p.life = 1;
      p.decay = 0.002 + Math.random() * 0.004;
      p.size = 3 + Math.random() * 8;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = (Math.random() - 0.5) * 0.2;
      p.targetX = x; p.targetY = y;
      p.type = "debris";
      particles.push(p);
    }
  }

  // ==================== 粒子更新 ====================

  /**
   * 更新并绘制所有粒子
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} particles - 粒子数组（就地修改）
   * @returns {Array} 过滤后的存活粒子
   */
  function updateParticles(ctx, particles) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        releaseParticle(p);
        particles.splice(i, 1);
        continue;
      }

      switch (p.type) {
        case "smoke": {
          p.vy -= 0.02;
          const ss = p.size * (1 + (1 - p.life) * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, ss, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,180,200,${p.life * 0.25})`;
          ctx.fill();
          // 柔光外圈
          ctx.beginPath();
          ctx.arc(p.x, p.y, ss * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,180,200,${p.life * 0.08})`;
          ctx.fill();
          break;
        }
        case "debris": {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            const force = 500 / (dist + 50);
            p.vx += (dx / dist) * force * 0.016;
            p.vy += (dy / dist) * force * 0.016;
          }
          if (dist < 10) p.life = 0;
          p.rotation += p.rotSpeed;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(80,50,30,${p.life})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
          break;
        }
        case "aura": {
          p.vx *= 0.96;
          p.vy *= 0.96;
          // 拖尾
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.strokeStyle = `rgba(255,255,200,${p.life * 0.4})`;
          ctx.lineWidth = p.size * p.life * 0.5;
          ctx.stroke();
          // 粒子点
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,200,${p.life * 0.8})`;
          ctx.fill();
          break;
        }
        case "sharingan": {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,0,0,${p.life * 0.8})`;
          ctx.fill();
          break;
        }
        default: {
          p.vx *= 0.98;
          p.vy *= 0.98;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.life))})`;
          ctx.fill();
        }
      }
    }
    return particles;
  }

  // ==================== 特效绘制 ====================

  /**
   * 绘制虚式紫
   */
  function drawHollowPurple(ctx, x, y, size) {
    if (size < 2) return;
    ctx.save();
    const time = getTime() * 2;
    const alpha = Math.min(1, size / 40);

    // 外层大气（多层深紫扩散）
    for (let layer = 0; layer < 3; layer++) {
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
    for (let ring = 0; ring < 6; ring++) {
      const ringR = size * (0.5 + ring * 0.35);
      const wobble = Math.sin(time * 1.5 + ring * 0.8) * size * 0.1;
      const segments = 4 + ring;
      const segArc = (Math.PI * 2 / segments) * 0.6;
      for (let s = 0; s < segments; s++) {
        const sa = time * (0.4 + ring * 0.1) + (s / segments) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, ringR + wobble, sa, sa + segArc);
        ctx.strokeStyle = `rgba(160,60,255,${(0.3 - ring * 0.04) * alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 蓝色层
    const bluePulse = Math.sin(time * 2) * 0.05 + 0.95;
    const blueGrad = ctx.createRadialGradient(x - size * 0.4, y, 0, x - size * 0.4, y, size * 1.8);
    blueGrad.addColorStop(0, `rgba(15,50,220,${0.9 * alpha * bluePulse})`);
    blueGrad.addColorStop(0.4, `rgba(10,35,200,${0.6 * alpha})`);
    blueGrad.addColorStop(0.7, `rgba(5,20,160,${0.25 * alpha})`);
    blueGrad.addColorStop(1, `rgba(0,10,120,0)`);
    ctx.beginPath(); ctx.arc(x - size * 0.12, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = blueGrad; ctx.fill();

    // 红色层
    const redPulse = Math.sin(time * 2 + Math.PI) * 0.05 + 0.95;
    const redGrad = ctx.createRadialGradient(x + size * 0.4, y, 0, x + size * 0.4, y, size * 1.8);
    redGrad.addColorStop(0, `rgba(200,0,15,${0.9 * alpha * redPulse})`);
    redGrad.addColorStop(0.4, `rgba(160,0,10,${0.6 * alpha})`);
    redGrad.addColorStop(0.7, `rgba(100,0,5,${0.25 * alpha})`);
    redGrad.addColorStop(1, `rgba(60,0,0,0)`);
    ctx.beginPath(); ctx.arc(x + size * 0.12, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = redGrad; ctx.fill();

    // 蓝红交界处电弧
    for (let i = 0; i < 6; i++) {
      const arcAngle = time * 3 + i * 1.1;
      const arcY = y + Math.sin(arcAngle) * size * 0.6;
      const arcX = x + Math.sin(time * 1.5 + i) * size * 0.15;
      const arcLen = size * (0.3 + Math.sin(time * 4 + i * 2) * 0.2);
      ctx.beginPath();
      ctx.moveTo(arcX - arcLen * 0.5, arcY);
      for (let j = 0; j < 4; j++) {
        const jx = arcX - arcLen * 0.5 + (j + 1) * arcLen * 0.25;
        const jy = arcY + (j % 2 === 0 ? -1 : 1) * size * 0.05;
        ctx.lineTo(jx, jy);
      }
      ctx.strokeStyle = `rgba(200,150,255,${0.35 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 环绕粒子
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + time * (0.8 + (i % 3) * 0.2);
      const orbitWobble = Math.sin(time * 2 + i * 0.5) * size * 0.18;
      const rx = x + Math.cos(angle) * (size * 1.1 + orbitWobble);
      const ry = y + Math.sin(angle) * (size * 0.5 + orbitWobble * 0.3);
      const dotR = size * 0.06 + Math.sin(time * 3 + i) * size * 0.025;

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

    // 碎片飞散效果
    for (let i = 0; i < 16; i++) {
      const fAngle = time * 0.8 + (i / 16) * Math.PI * 2;
      const fDist = size * (1.3 + Math.sin(time * 1.2 + i * 1.3) * 0.5);
      const fx = x + Math.cos(fAngle) * fDist;
      const fy = y + Math.sin(fAngle) * fDist;
      const fSize = 2 + Math.sin(time * 2 + i) * 1.5;
      const fRot = time * 2 + i;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(fRot);
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

    // 核心球体
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(255,255,255,${1.0 * alpha})`);
    coreGrad.addColorStop(0.12, `rgba(230,200,255,${0.98 * alpha})`);
    coreGrad.addColorStop(0.35, `rgba(140,30,220,${0.92 * alpha})`);
    coreGrad.addColorStop(0.6, `rgba(90,10,180,${0.8 * alpha})`);
    coreGrad.addColorStop(0.85, `rgba(50,0,120,${0.4 * alpha})`);
    coreGrad.addColorStop(1, `rgba(30,0,80,0)`);
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad; ctx.fill();

    // 内部蓝红旋转纹理
    for (let i = 0; i < 3; i++) {
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

    ctx.restore();
  }

  /**
   * 绘制写轮眼
   */
  function drawSharingan(ctx, cx, cy, size, totalPower) {
    if (size < 2) return;
    ctx.save();
    const time = getTime() * 3;

    // 脉冲缩放
    const pulseTime = getTime() * 4;
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
    for (let i = 0; i < 3; i++) {
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

  /**
   * 绘制影分身
   */
  function drawShadowClone(ctx, pts, power, handConnections) {
    if (!pts || power < 0.01) return;
    const time = getTime() * 3;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const clones = [
      { dx: 90, dy: -30, alpha: 0.55, hue: 210 },
      { dx: -70, dy: 45, alpha: 0.4, hue: 220 },
      { dx: 110, dy: 55, alpha: 0.25, hue: 230 },
      { dx: -50, dy: -50, alpha: 0.15, hue: 240 }
    ];

    clones.forEach((clone, ci) => {
      const cAlpha = clone.alpha * power;

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

      // 外发光层
      ctx.beginPath();
      if (handConnections) {
        handConnections.forEach(([a, b]) => {
          ctx.moveTo(pts[a].x * w + clone.dx, pts[a].y * h + clone.dy);
          ctx.lineTo(pts[b].x * w + clone.dx, pts[b].y * h + clone.dy);
        });
      }
      ctx.strokeStyle = `rgba(180,200,255,0.3)`;
      ctx.lineWidth = 6;
      ctx.stroke();

      // 主线条
      ctx.beginPath();
      if (handConnections) {
        handConnections.forEach(([a, b]) => {
          ctx.moveTo(pts[a].x * w + clone.dx, pts[a].y * h + clone.dy);
          ctx.lineTo(pts[b].x * w + clone.dx, pts[b].y * h + clone.dy);
        });
      }
      ctx.strokeStyle = `rgba(200,220,255,0.7)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 关节
      pts.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x * w + clone.dx, pt.y * h + clone.dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,240,255,0.9)`;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }

  /**
   * 绘制八门遁甲
   */
  function drawEightGates(ctx, x, y, power) {
    if (power < 0.01) return;
    ctx.save();
    const time = getTime() * 3;
    const r = 80 + power * 40;

    // 外层火焰光环
    for (let i = 0; i < 8; i++) {
      const angle = time * 1.5 + (i / 8) * Math.PI * 2;
      const flameR = r * (0.9 + Math.sin(time * 4 + i * 2) * 0.15);
      const fx = x + Math.cos(angle) * flameR;
      const fy = y + Math.sin(angle) * flameR;
      const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 25);
      flameGrad.addColorStop(0, `rgba(255,200,50,${0.8 * power})`);
      flameGrad.addColorStop(0.5, `rgba(255,100,0,${0.4 * power})`);
      flameGrad.addColorStop(1, `rgba(255,0,0,0)`);
      ctx.beginPath();
      ctx.arc(fx, fy, 25, 0, Math.PI * 2);
      ctx.fillStyle = flameGrad;
      ctx.fill();
    }

    // 核心能量球
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
    coreGrad.addColorStop(0, `rgba(255,255,200,${0.95 * power})`);
    coreGrad.addColorStop(0.3, `rgba(255,200,50,${0.8 * power})`);
    coreGrad.addColorStop(0.7, `rgba(255,100,0,${0.4 * power})`);
    coreGrad.addColorStop(1, `rgba(200,50,0,0)`);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 能量脉冲环
    const pulseR = r * (0.5 + Math.sin(time * 6) * 0.2);
    ctx.beginPath();
    ctx.arc(x, y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,100,${0.5 * power})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制地爆天星
   */
  function drawChibakuTensei(ctx, x, y, size, power) {
    if (size < 2) return;
    ctx.save();
    const time = getTime() * 2;
    const alpha = Math.min(1, power);

    // 外层引力场
    for (let i = 0; i < 3; i++) {
      const fieldR = size * (2 + i * 0.8);
      const fieldGrad = ctx.createRadialGradient(x, y, size * 0.5, x, y, fieldR);
      fieldGrad.addColorStop(0, `rgba(100,80,60,${0.1 * alpha})`);
      fieldGrad.addColorStop(0.5, `rgba(80,60,40,${0.05 * alpha})`);
      fieldGrad.addColorStop(1, `rgba(60,40,20,0)`);
      ctx.beginPath();
      ctx.arc(x, y, fieldR, 0, Math.PI * 2);
      ctx.fillStyle = fieldGrad;
      ctx.fill();
    }

    // 旋转岩石环
    for (let ring = 0; ring < 3; ring++) {
      const ringR = size * (0.8 + ring * 0.4);
      const rockCount = 8 + ring * 4;
      for (let i = 0; i < rockCount; i++) {
        const angle = time * (0.5 + ring * 0.3) + (i / rockCount) * Math.PI * 2;
        const rx = x + Math.cos(angle) * ringR;
        const ry = y + Math.sin(angle) * ringR;
        const rockSize = 3 + Math.sin(time + i) * 2;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(angle + time);
        ctx.fillStyle = `rgba(120,100,80,${0.7 * alpha})`;
        ctx.fillRect(-rockSize / 2, -rockSize / 2, rockSize, rockSize * 0.6);
        ctx.restore();
      }
    }

    // 核心球体
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.6);
    coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
    coreGrad.addColorStop(0.3, `rgba(200,180,150,${0.8 * alpha})`);
    coreGrad.addColorStop(0.7, `rgba(150,120,80,${0.5 * alpha})`);
    coreGrad.addColorStop(1, `rgba(100,80,60,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 表面裂纹
    for (let i = 0; i < 5; i++) {
      const crackAngle = (i / 5) * Math.PI * 2;
      const crackLen = size * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(crackAngle) * crackLen,
        y + Math.sin(crackAngle) * crackLen
      );
      ctx.strokeStyle = `rgba(200,180,150,${0.4 * alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 绘制螺旋手里剑
   */
  function drawRasenshuriken(ctx, x, y, size, progress) {
    if (size < 2) return;
    ctx.save();
    const time = getTime() * 4;
    const r = size * (0.5 + progress * 0.5);
    const alpha = Math.min(1, progress * 1.5);

    // 扩散光晕
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    outerGlow.addColorStop(0, `rgba(30,120,255,${0.15 * alpha})`);
    outerGlow.addColorStop(0.5, `rgba(20,80,200,${0.05 * alpha})`);
    outerGlow.addColorStop(1, `rgba(10,40,150,0)`);
    ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow; ctx.fill();

    // 风刃线条
    for (let i = 0; i < 6; i++) {
      const baseAngle = time + (i * Math.PI / 3);
      for (let j = 0; j < 3; j++) {
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

    // 旋转手里剑叶片
    for (let i = 0; i < 6; i++) {
      const angle = time * 2.5 + (i * Math.PI / 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
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
      ctx.strokeStyle = `rgba(150,220,255,${0.6 * alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 旋转同心圆纹理
    for (let i = 0; i < 3; i++) {
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

    // 外层能量环
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(100,200,255,${0.5 * alpha})`;
    ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(60,160,240,${0.3 * alpha})`;
    ctx.lineWidth = 1.5; ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制须佐能乎 - 巨大的能量骨架
   */
  function drawSusano(ctx, x, y, size, progress) {
    if (size < 2) return;
    ctx.save();
    const time = getTime();
    const p = progress;

    // 全屏紫色能量波动
    if (p > 0.1) {
      const waveAlpha = Math.min(0.15, (p - 0.1) * 0.2);
      ctx.fillStyle = `rgba(100,50,200,${waveAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 外层查克拉火焰 aura（多层，更密集）
    if (p > 0.15) {
      const auraAlpha = Math.min(1, (p - 0.15) / 0.25);
      for (let layer = 0; layer < 3; layer++) {
        const layerOffset = layer * 0.2;
        for (let i = 0; i < 18; i++) {
          const angle = time * 2.5 + (i / 18) * Math.PI * 2 + layerOffset;
          const flameR = size * (1.3 + layer * 0.3 + Math.sin(time * 3.5 + i + layer) * 0.25);
          const fx = x + Math.cos(angle) * flameR;
          const fy = y + Math.sin(angle) * flameR * 0.75;
          const flameSize = 35 - layer * 5;
          const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, flameSize);
          flameGrad.addColorStop(0, `rgba(130,70,230,${(0.5 - layer * 0.1) * auraAlpha})`);
          flameGrad.addColorStop(0.4, `rgba(100,40,200,${(0.3 - layer * 0.08) * auraAlpha})`);
          flameGrad.addColorStop(0.7, `rgba(70,20,160,${(0.15 - layer * 0.04) * auraAlpha})`);
          flameGrad.addColorStop(1, `rgba(50,10,120,0)`);
          ctx.beginPath();
          ctx.arc(fx, fy, flameSize, 0, Math.PI * 2);
          ctx.fillStyle = flameGrad;
          ctx.fill();
        }
      }
    }

    // 骨骼轮廓（更复杂的骨架）
    if (p > 0.3) {
      const boneAlpha = Math.min(1, (p - 0.3) / 0.25);
      ctx.beginPath();
      // 头部
      ctx.moveTo(x, y - size * 0.85);
      ctx.lineTo(x - size * 0.15, y - size * 0.75);
      ctx.lineTo(x - size * 0.2, y - size * 0.6);
      // 肩膀
      ctx.lineTo(x - size * 0.45, y - size * 0.5);
      ctx.lineTo(x - size * 0.55, y - size * 0.4);
      // 手臂
      ctx.lineTo(x - size * 0.6, y - size * 0.2);
      ctx.lineTo(x - size * 0.5, y);
      // 身体
      ctx.lineTo(x - size * 0.35, y + size * 0.2);
      ctx.lineTo(x - size * 0.3, y + size * 0.5);
      // 腿
      ctx.lineTo(x - size * 0.25, y + size * 0.7);
      ctx.lineTo(x - size * 0.15, y + size * 0.85);
      ctx.lineTo(x, y + size * 0.9);
      ctx.lineTo(x + size * 0.15, y + size * 0.85);
      ctx.lineTo(x + size * 0.25, y + size * 0.7);
      ctx.lineTo(x + size * 0.3, y + size * 0.5);
      ctx.lineTo(x + size * 0.35, y + size * 0.2);
      ctx.lineTo(x + size * 0.5, y);
      ctx.lineTo(x + size * 0.6, y - size * 0.2);
      ctx.lineTo(x + size * 0.55, y - size * 0.4);
      ctx.lineTo(x + size * 0.45, y - size * 0.5);
      ctx.lineTo(x + size * 0.2, y - size * 0.6);
      ctx.lineTo(x + size * 0.15, y - size * 0.75);
      ctx.closePath();
      ctx.strokeStyle = `rgba(200,120,255,${0.7 * boneAlpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      // 骨骼发光
      ctx.strokeStyle = `rgba(150,80,220,${0.4 * boneAlpha})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // 核心能量体（更亮更大）
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.6);
    coreGrad.addColorStop(0, `rgba(230,180,255,${0.95 * p})`);
    coreGrad.addColorStop(0.3, `rgba(180,120,240,${0.7 * p})`);
    coreGrad.addColorStop(0.6, `rgba(130,70,200,${0.4 * p})`);
    coreGrad.addColorStop(1, `rgba(80,30,150,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 眼睛（须佐能乎的眼睛，带光芒）
    if (p > 0.5) {
      const eyeAlpha = Math.min(1, (p - 0.5) / 0.2);
      const eyeGlow = Math.sin(time * 4) * 0.15 + 0.85;
      // 左眼
      ctx.beginPath();
      ctx.arc(x - size * 0.18, y - size * 0.18, 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,80,80,${0.95 * eyeAlpha * eyeGlow})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - size * 0.18, y - size * 0.18, 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,50,50,${0.4 * eyeAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // 右眼
      ctx.beginPath();
      ctx.arc(x + size * 0.18, y - size * 0.18, 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,80,80,${0.95 * eyeAlpha * eyeGlow})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.18, y - size * 0.18, 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,50,50,${0.4 * eyeAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 能量护盾效果
    if (p > 0.6) {
      const shieldAlpha = Math.min(0.4, (p - 0.6) * 0.8);
      const shieldPulse = Math.sin(time * 3) * 0.1 + 0.9;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180,100,255,${shieldAlpha * shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 绘制天照 - 黑色火焰永不熄灭
   */
  function drawAmaterasu(ctx, x, y, size, progress) {
    if (size < 2) return;
    ctx.save();
    const time = getTime() * 2;
    const alpha = Math.min(1, progress * 1.5);

    // 全屏黑暗滤镜
    ctx.fillStyle = `rgba(0,0,0,${0.08 * alpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 外层扩散火焰圈（多层）
    for (let layer = 0; layer < 3; layer++) {
      const layerR = size * (1.2 + layer * 0.4);
      const layerAlpha = 0.15 - layer * 0.04;
      for (let i = 0; i < 16; i++) {
        const angle = time * 1.5 + (i / 16) * Math.PI * 2 + layer * 0.3;
        const flameR = layerR * (0.9 + Math.sin(time * 2.5 + i * 1.2 + layer) * 0.15);
        const fx = x + Math.cos(angle) * flameR;
        const fy = y + Math.sin(angle) * flameR;
        const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 30 + layer * 10);
        flameGrad.addColorStop(0, `rgba(80,0,120,${layerAlpha * alpha})`);
        flameGrad.addColorStop(0.3, `rgba(50,0,90,${layerAlpha * 0.7 * alpha})`);
        flameGrad.addColorStop(0.6, `rgba(30,0,60,${layerAlpha * 0.3 * alpha})`);
        flameGrad.addColorStop(1, `rgba(10,0,30,0)`);
        ctx.beginPath();
        ctx.arc(fx, fy, 30 + layer * 10, 0, Math.PI * 2);
        ctx.fillStyle = flameGrad;
        ctx.fill();
      }
    }

    // 核心黑焰球体
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    coreGrad.addColorStop(0, `rgba(40,0,60,${0.98 * alpha})`);
    coreGrad.addColorStop(0.3, `rgba(25,0,45,${0.9 * alpha})`);
    coreGrad.addColorStop(0.6, `rgba(15,0,30,${0.7 * alpha})`);
    coreGrad.addColorStop(1, `rgba(5,0,15,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 紫色火焰纹理（更多更密）
    for (let i = 0; i < 10; i++) {
      const flameAngle = time * 4 + (i / 10) * Math.PI * 2;
      const flameLen = size * (0.6 + Math.sin(time * 2 + i) * 0.2);
      const flameWidth = 2 + Math.sin(time * 3 + i * 0.7) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(flameAngle) * flameLen * 0.4,
        y + Math.sin(flameAngle) * flameLen * 0.4 - 25,
        x + Math.cos(flameAngle) * flameLen,
        y + Math.sin(flameAngle) * flameLen
      );
      ctx.strokeStyle = `rgba(140,0,220,${(0.5 + Math.sin(time * 2 + i) * 0.2) * alpha})`;
      ctx.lineWidth = flameWidth;
      ctx.stroke();
    }

    // 黑色内焰（更暗更密集）
    for (let i = 0; i < 8; i++) {
      const innerAngle = time * 5 + (i / 8) * Math.PI * 2;
      const innerLen = size * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(innerAngle) * innerLen,
        y + Math.sin(innerAngle) * innerLen
      );
      ctx.strokeStyle = `rgba(10,0,20,${0.6 * alpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // 火花飞溅效果
    for (let i = 0; i < 12; i++) {
      const sparkAngle = time * 6 + (i / 12) * Math.PI * 2;
      const sparkDist = size * (0.4 + Math.sin(time * 4 + i * 1.5) * 0.3);
      const sx = x + Math.cos(sparkAngle) * sparkDist;
      const sy = y + Math.sin(sparkAngle) * sparkDist;
      const sparkSize = 1.5 + Math.sin(time * 5 + i) * 1;
      ctx.beginPath();
      ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,50,255,${0.7 * alpha})`;
      ctx.fill();
    }

    // 中心白热核心
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.2);
    innerGrad.addColorStop(0, `rgba(200,100,255,${0.9 * alpha})`);
    innerGrad.addColorStop(0.5, `rgba(120,0,180,${0.5 * alpha})`);
    innerGrad.addColorStop(1, `rgba(60,0,100,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.restore();
  }

  /**
   * 绘制月读 - 幻术世界
   */
  function drawTsukuyomi(ctx, x, y, size, progress) {
    if (size < 2) return;
    ctx.save();
    const time = getTime();
    const alpha = Math.min(1, progress * 1.5);

    // 全屏红色滤镜（渐入）
    const filterAlpha = 0.2 * alpha;
    ctx.fillStyle = `rgba(180,0,0,${filterAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 漩涡效果（从中心扩散）
    if (alpha > 0.3) {
      const vortexAlpha = (alpha - 0.3) * 1.4;
      for (let i = 0; i < 6; i++) {
        const spiralAngle = time * 2 + (i / 6) * Math.PI * 2;
        const spiralR = size * (0.8 + i * 0.15);
        ctx.beginPath();
        ctx.arc(x, y, spiralR, spiralAngle, spiralAngle + Math.PI * 0.8);
        ctx.strokeStyle = `rgba(200,30,30,${(0.3 - i * 0.04) * vortexAlpha})`;
        ctx.lineWidth = 3 - i * 0.3;
        ctx.stroke();
      }
    }

    // 红色月亮（带脉冲）
    const moonPulse = Math.sin(time * 2) * 0.05 + 1;
    const moonR = size * moonPulse;
    const moonGrad = ctx.createRadialGradient(x, y, 0, x, y, moonR);
    moonGrad.addColorStop(0, `rgba(255,60,60,${0.95 * alpha})`);
    moonGrad.addColorStop(0.4, `rgba(220,30,30,${0.85 * alpha})`);
    moonGrad.addColorStop(0.7, `rgba(180,15,15,${0.6 * alpha})`);
    moonGrad.addColorStop(1, `rgba(120,0,0,0)`);
    ctx.beginPath();
    ctx.arc(x, y, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();

    // 月亮纹理（环形山，更真实）
    for (let i = 0; i < 12; i++) {
      const craterAngle = (i / 12) * Math.PI * 2 + time * 0.1;
      const craterR = size * (0.06 + Math.sin(i * 2.3) * 0.03);
      const craterDist = size * (0.3 + Math.sin(i * 1.7) * 0.2);
      const cx = x + Math.cos(craterAngle) * craterDist;
      const cy = y + Math.sin(craterAngle) * craterDist;
      ctx.beginPath();
      ctx.arc(cx, cy, craterR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,15,15,${(0.4 + Math.sin(time + i) * 0.1) * alpha})`;
      ctx.fill();
    }

    // 红色光线（旋转，更密集）
    for (let i = 0; i < 12; i++) {
      const rayAngle = time * 1.5 + (i / 12) * Math.PI * 2;
      const rayLen = size * 4;
      const rayWidth = 1.5 + Math.sin(time * 2 + i) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(rayAngle) * rayLen,
        y + Math.sin(rayAngle) * rayLen
      );
      ctx.strokeStyle = `rgba(255,20,20,${(0.08 + Math.sin(time * 3 + i) * 0.03) * alpha})`;
      ctx.lineWidth = rayWidth;
      ctx.stroke();
    }

    // 红色粒子漂浮
    for (let i = 0; i < 20; i++) {
      const particleAngle = time * 0.5 + (i / 20) * Math.PI * 2;
      const particleDist = size * (1.5 + Math.sin(time * 0.8 + i * 1.3) * 0.8);
      const px = x + Math.cos(particleAngle) * particleDist;
      const py = y + Math.sin(particleAngle) * particleDist;
      const particleSize = 2 + Math.sin(time * 2 + i) * 1;
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,50,50,${(0.4 + Math.sin(time * 3 + i) * 0.2) * alpha})`;
      ctx.fill();
    }

    // 中心能量核心
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
    coreGrad.addColorStop(0, `rgba(255,150,150,${0.8 * alpha})`);
    coreGrad.addColorStop(0.5, `rgba(200,50,50,${0.4 * alpha})`);
    coreGrad.addColorStop(1, `rgba(150,0,0,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.restore();
  }

  // ==================== 返回 API ====================

  return {
    // 粒子生成
    spawnParticles,
    spawnSharinganParticles,
    spawnSmokeParticles,
    spawnAuraParticles,
    spawnDebrisParticles,
    // 粒子更新
    updateParticles,
    // 特效绘制
    drawHollowPurple,
    drawSharingan,
    drawShadowClone,
    drawEightGates,
    drawChibakuTensei,
    drawRasenshuriken,
    drawSusano,
    drawAmaterasu,
    drawTsukuyomi
  };
}

// 导出工厂函数
export default createEffectsSystem;
