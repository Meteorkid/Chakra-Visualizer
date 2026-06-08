import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createParticleSystem, PARTICLE_TYPES } from '../modules/particles';

describe('particles 模块', () => {
  let particleSystem;

  beforeEach(() => {
    particleSystem = createParticleSystem(100);
  });

  describe('创建粒子系统', () => {
    it('应该创建一个粒子系统实例', () => {
      expect(particleSystem).toBeDefined();
      expect(typeof particleSystem.spawnDefault).toBe('function');
      expect(typeof particleSystem.spawnSharingan).toBe('function');
      expect(typeof particleSystem.spawnSmoke).toBe('function');
      expect(typeof particleSystem.spawnAura).toBe('function');
      expect(typeof particleSystem.spawnDebris).toBe('function');
      expect(typeof particleSystem.update).toBe('function');
      expect(typeof particleSystem.render).toBe('function');
      expect(typeof particleSystem.clear).toBe('function');
    });

    it('应该初始化为空粒子列表', () => {
      expect(particleSystem.getCount()).toBe(0);
    });
  });

  describe('生成粒子', () => {
    it('应该生成默认粒子', () => {
      particleSystem.spawnDefault(100, 100);
      expect(particleSystem.getCount()).toBe(8);
    });

    it('应该生成写轮眼粒子', () => {
      particleSystem.spawnSharingan(100, 100);
      expect(particleSystem.getCount()).toBe(6);
    });

    it('应该生成烟雾粒子', () => {
      particleSystem.spawnSmoke(100, 100);
      expect(particleSystem.getCount()).toBe(8);
    });

    it('应该生成光环粒子', () => {
      particleSystem.spawnAura(100, 100, 1);
      expect(particleSystem.getCount()).toBeGreaterThan(8);
    });

    it('应该生成碎片粒子', () => {
      particleSystem.spawnDebris(100, 100);
      expect(particleSystem.getCount()).toBe(6);
    });

    it('应该尊重粒子上限', () => {
      const smallSystem = createParticleSystem(10);
      // 每次 spawnDefault 生成 8 个粒子
      smallSystem.spawnDefault(100, 100);
      expect(smallSystem.getCount()).toBe(8);

      // 再次生成，会添加 2 个粒子达到上限
      smallSystem.spawnDefault(200, 200);
      expect(smallSystem.getCount()).toBe(10);

      // 第三次生成应该被完全跳过
      smallSystem.spawnDefault(300, 300);
      expect(smallSystem.getCount()).toBe(10);
    });
  });

  describe('更新粒子', () => {
    it('应该更新粒子位置', () => {
      particleSystem.spawnDefault(100, 100);
      const particles = particleSystem.getParticles();
      const initialX = particles[0].x;
      const initialY = particles[0].y;

      particleSystem.update(1);

      const updatedParticles = particleSystem.getParticles();
      // 粒子应该移动了
      expect(updatedParticles[0].x).not.toBe(initialX);
      expect(updatedParticles[0].y).not.toBe(initialY);
    });

    it('应该减少粒子生命周期', () => {
      particleSystem.spawnDefault(100, 100);
      const particles = particleSystem.getParticles();
      const initialLife = particles[0].life;

      particleSystem.update(1);

      const updatedParticles = particleSystem.getParticles();
      expect(updatedParticles[0].life).toBeLessThan(initialLife);
    });

    it('应该移除死亡粒子', () => {
      particleSystem.spawnDefault(100, 100);
      expect(particleSystem.getCount()).toBe(8);

      // 多次更新使粒子死亡
      for (let i = 0; i < 100; i++) {
        particleSystem.update(1);
      }

      expect(particleSystem.getCount()).toBe(0);
    });
  });

  describe('渲染粒子', () => {
    it('应该渲染粒子到 canvas', () => {
      const mockCtx = {
        globalAlpha: 1,
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillRect: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      };

      particleSystem.spawnDefault(100, 100);
      particleSystem.render(mockCtx);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('清除粒子', () => {
    it('应该清除所有粒子', () => {
      particleSystem.spawnDefault(100, 100);
      particleSystem.spawnSharingan(200, 200);
      expect(particleSystem.getCount()).toBeGreaterThan(0);

      particleSystem.clear();
      expect(particleSystem.getCount()).toBe(0);
    });
  });

  describe('获取状态', () => {
    it('应该获取粒子数量', () => {
      expect(particleSystem.getCount()).toBe(0);
      particleSystem.spawnDefault(100, 100);
      expect(particleSystem.getCount()).toBe(8);
    });

    it('应该获取粒子列表', () => {
      particleSystem.spawnDefault(100, 100);
      const particles = particleSystem.getParticles();
      expect(Array.isArray(particles)).toBe(true);
      expect(particles.length).toBe(8);
    });

    it('应该检查是否达到上限', () => {
      expect(particleSystem.isAtLimit()).toBe(false);

      // 每次 spawnDefault 生成 8 个粒子
      // 上限是 100，所以需要 13 次才能达到上限（13 * 8 = 104）
      for (let i = 0; i < 15; i++) {
        particleSystem.spawnDefault(i * 100, i * 100);
      }

      expect(particleSystem.isAtLimit()).toBe(true);
    });
  });

  describe('粒子类型', () => {
    it('应该有正确的粒子类型常量', () => {
      expect(PARTICLE_TYPES.DEFAULT).toBe('default');
      expect(PARTICLE_TYPES.SHARINGAN).toBe('sharingan');
      expect(PARTICLE_TYPES.SMOKE).toBe('smoke');
      expect(PARTICLE_TYPES.AURA).toBe('aura');
      expect(PARTICLE_TYPES.DEBRIS).toBe('debris');
    });
  });
});
