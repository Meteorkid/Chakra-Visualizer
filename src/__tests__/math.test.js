import { describe, it, expect } from 'vitest';
import {
  distance,
  distance3D,
  lerp,
  clamp,
  mapRange,
  degToRad,
  radToDeg,
  angleBetween,
  angleDiff,
  randomInRange,
  randomIntInRange,
  smoothstep,
  pointInRect,
  pointInCircle
} from '../utils/math';

describe('math 工具函数', () => {
  describe('distance', () => {
    it('应该计算两点之间的距离', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
    });

    it('应该处理负坐标', () => {
      expect(distance({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
    });
  });

  describe('distance3D', () => {
    it('应该计算三维距离', () => {
      expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(1);
    });

    it('应该处理没有 z 坐标的点', () => {
      expect(distance3D({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
    });
  });

  describe('lerp', () => {
    it('应该进行线性插值', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
    });

    it('应该处理负值', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('应该限制值在范围内', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('mapRange', () => {
    it('应该映射值到新范围', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe('角度函数', () => {
    it('degToRad 应该转换角度到弧度', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
    });

    it('radToDeg 应该转换弧度到角度', () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
    });

    it('angleBetween 应该计算两点之间的角度', () => {
      expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
      expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
    });

    it('angleDiff 应该计算角度差', () => {
      expect(angleDiff(0, Math.PI)).toBeCloseTo(Math.PI);
      expect(angleDiff(0, Math.PI * 2 - 0.1)).toBeCloseTo(0.1);
    });
  });

  describe('随机数函数', () => {
    it('randomInRange 应该返回范围内的值', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomInRange(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(10);
      }
    });

    it('randomIntInRange 应该返回范围内的整数', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomIntInRange(1, 6);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('smoothstep', () => {
    it('应该返回平滑步进值', () => {
      expect(smoothstep(0, 1, 0)).toBe(0);
      expect(smoothstep(0, 1, 1)).toBe(1);
      expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
    });
  });

  describe('点在形状内检测', () => {
    it('pointInRect 应该检测点是否在矩形内', () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      expect(pointInRect({ x: 5, y: 5 }, rect)).toBe(true);
      expect(pointInRect({ x: 15, y: 5 }, rect)).toBe(false);
      expect(pointInRect({ x: 5, y: 15 }, rect)).toBe(false);
    });

    it('pointInCircle 应该检测点是否在圆内', () => {
      const circle = { x: 0, y: 0 };
      expect(pointInCircle({ x: 5, y: 0 }, circle, 10)).toBe(true);
      expect(pointInCircle({ x: 15, y: 0 }, circle, 10)).toBe(false);
    });
  });
});
