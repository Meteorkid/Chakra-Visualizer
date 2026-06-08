import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEffectsSystem } from '../modules/effects.js';

describe('特效渲染模块 (effects.js)', () => {
  let effects;
  let mockCtx;

  beforeEach(() => {
    effects = createEffectsSystem({
      particleLimit: 100,
      getTime: () => 1.0
    });

    // Mock Canvas 2D context
    mockCtx = {
      canvas: { width: 800, height: 600 },
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: ''
    };
  });

  describe('粒子生成函数', () => {
    it('spawnParticles 应在限制内生成粒子', () => {
      const particles = [];
      effects.spawnParticles(particles, 100, 100, 50);
      expect(particles.length).toBe(8);
      expect(particles[0]).toHaveProperty('x', 100);
      expect(particles[0]).toHaveProperty('y', 100);
      expect(particles[0]).toHaveProperty('type', 'default');
    });

    it('spawnParticles 超过限制时不生成', () => {
      const particles = Array(100).fill({ type: 'test' });
      effects.spawnParticles(particles, 100, 100, 50);
      expect(particles.length).toBe(100);
    });

    it('spawnSharinganParticles 应生成写轮眼粒子', () => {
      const particles = [];
      effects.spawnSharinganParticles(particles, 200, 200, 80);
      expect(particles.length).toBe(6);
      expect(particles[0]).toHaveProperty('type', 'sharingan');
    });

    it('spawnSmokeParticles 应生成烟雾粒子', () => {
      const particles = [];
      effects.spawnSmokeParticles(particles, 150, 150);
      expect(particles.length).toBe(8);
      expect(particles[0]).toHaveProperty('type', 'smoke');
      expect(particles[0].size).toBeGreaterThan(25);
    });

    it('spawnAuraParticles 应根据 power 生成粒子', () => {
      const particles = [];
      effects.spawnAuraParticles(particles, 100, 100, 0.5);
      expect(particles.length).toBeGreaterThan(8);
      expect(particles[0]).toHaveProperty('type', 'aura');
    });

    it('spawnDebrisParticles 应生成碎片粒子', () => {
      const particles = [];
      effects.spawnDebrisParticles(particles, 300, 300, 100);
      expect(particles.length).toBe(6);
      expect(particles[0]).toHaveProperty('type', 'debris');
      expect(particles[0]).toHaveProperty('targetX', 300);
    });
  });

  describe('粒子更新函数', () => {
    it('updateParticles 应更新粒子位置和生命值', () => {
      const particles = [
        { x: 100, y: 100, vx: 5, vy: 3, life: 1, decay: 0.1, size: 5, type: 'default', color: 'rgba(255,0,0,' }
      ];
      effects.updateParticles(mockCtx, particles);
      expect(particles[0].x).toBe(105);
      expect(particles[0].y).toBe(103);
      expect(particles[0].life).toBe(0.9);
    });

    it('updateParticles 应移除死亡粒子', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: 0, life: 0.05, decay: 0.1, size: 5, type: 'default', color: 'rgba(255,0,0,' }
      ];
      effects.updateParticles(mockCtx, particles);
      expect(particles.length).toBe(0);
    });

    it('updateParticles 应处理烟雾粒子特殊逻辑', () => {
      const particles = [
        { x: 100, y: 100, vx: 0, vy: -1, life: 0.5, decay: 0.01, size: 30, type: 'smoke' }
      ];
      effects.updateParticles(mockCtx, particles);
      expect(particles[0].vy).toBeLessThan(-1);
    });

    it('updateParticles 应处理碎片粒子引力', () => {
      const particles = [
        { x: 200, y: 200, vx: 0, vy: 0, life: 1, decay: 0.001, size: 5, type: 'debris',
          rotation: 0, rotSpeed: 0.1, targetX: 100, targetY: 100 }
      ];
      effects.updateParticles(mockCtx, particles);
      expect(particles[0].vx).not.toBe(0);
    });
  });

  describe('特效绘制函数', () => {
    it('drawHollowPurple 应在 size < 2 时跳过', () => {
      effects.drawHollowPurple(mockCtx, 100, 100, 1);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawHollowPurple 应正常绘制', () => {
      effects.drawHollowPurple(mockCtx, 100, 100, 50);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawSharingan 应在 size < 2 时跳过', () => {
      effects.drawSharingan(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawSharingan 应正常绘制', () => {
      effects.drawSharingan(mockCtx, 100, 100, 80, 0.8);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('drawShadowClone 应在 power < 0.01 时跳过', () => {
      effects.drawShadowClone(mockCtx, [{x:0,y:0}], 0.005, null);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawEightGates 应在 power < 0.01 时跳过', () => {
      effects.drawEightGates(mockCtx, 100, 100, 0.005);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawChibakuTensei 应在 size < 2 时跳过', () => {
      effects.drawChibakuTensei(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawRasenshuriken 应在 size < 2 时跳过', () => {
      effects.drawRasenshuriken(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawSusano 应在 size < 2 时跳过', () => {
      effects.drawSusano(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawAmaterasu 应在 size < 2 时跳过', () => {
      effects.drawAmaterasu(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawTsukuyomi 应在 size < 2 时跳过', () => {
      effects.drawTsukuyomi(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawRasengan 应在 size < 2 时跳过', () => {
      effects.drawRasengan(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawRasengan 应正常绘制', () => {
      effects.drawRasengan(mockCtx, 100, 100, 200, 0.8);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawBijuuDama 应在 size < 2 时跳过', () => {
      effects.drawBijuuDama(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawBijuuDama 应正常绘制', () => {
      effects.drawBijuuDama(mockCtx, 100, 100, 250, 0.9);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawKirin 应在 size < 2 时跳过', () => {
      effects.drawKirin(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawKirin 应正常绘制', () => {
      effects.drawKirin(mockCtx, 100, 100, 200, 0.7);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawTotsuka 应在 size < 2 时跳过', () => {
      effects.drawTotsuka(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawTotsuka 应正常绘制', () => {
      effects.drawTotsuka(mockCtx, 100, 100, 180, 0.6);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawByakugou 应在 size < 2 时跳过', () => {
      effects.drawByakugou(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawByakugou 应正常绘制', () => {
      effects.drawByakugou(mockCtx, 100, 100, 200, 0.8);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawSakuraImpact 应在 size < 2 时跳过', () => {
      effects.drawSakuraImpact(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawSakuraImpact 应正常绘制', () => {
      effects.drawSakuraImpact(mockCtx, 100, 100, 200, 0.7);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawSandCoffin 应在 size < 2 时跳过', () => {
      effects.drawSandCoffin(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawSandCoffin 应正常绘制', () => {
      effects.drawSandCoffin(mockCtx, 100, 100, 180, 0.8);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawSandShield 应在 size < 2 时跳过', () => {
      effects.drawSandShield(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawSandShield 应正常绘制', () => {
      effects.drawSandShield(mockCtx, 100, 100, 180, 0.7);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('drawShinraTensei 应在 size < 2 时跳过', () => {
      effects.drawShinraTensei(mockCtx, 100, 100, 1, 0.5);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('drawShinraTensei 应正常绘制', () => {
      effects.drawShinraTensei(mockCtx, 100, 100, 250, 0.9);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe('配置选项', () => {
    it('应使用默认 particleLimit', () => {
      const defaultEffects = createEffectsSystem();
      const particles = [];
      // 默认 1500，应该能生成
      defaultEffects.spawnParticles(particles, 100, 100, 50);
      expect(particles.length).toBe(8);
    });

    it('应支持自定义 getTime', () => {
      let time = 2.0;
      const customEffects = createEffectsSystem({
        getTime: () => time
      });
      const particles = [];
      customEffects.spawnParticles(particles, 100, 100, 50);
      expect(particles.length).toBe(8);
    });
  });

  describe('模块导出', () => {
    it('应导出 createEffectsSystem', () => {
      expect(typeof createEffectsSystem).toBe('function');
    });

    it('应导出默认导出', () => {
      expect(typeof effects.spawnParticles).toBe('function');
      expect(typeof effects.updateParticles).toBe('function');
      expect(typeof effects.drawHollowPurple).toBe('function');
      expect(typeof effects.drawRasengan).toBe('function');
      expect(typeof effects.drawBijuuDama).toBe('function');
      expect(typeof effects.drawKirin).toBe('function');
      expect(typeof effects.drawTotsuka).toBe('function');
      expect(typeof effects.drawByakugou).toBe('function');
      expect(typeof effects.drawSakuraImpact).toBe('function');
      expect(typeof effects.drawSandCoffin).toBe('function');
      expect(typeof effects.drawSandShield).toBe('function');
      expect(typeof effects.drawShinraTensei).toBe('function');
    });
  });
});
