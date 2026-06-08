import { describe, it, expect } from 'vitest';
import {
  fingerScore,
  isFingerUp,
  isFingerDown,
  palmDirection,
  isThumbUp,
  isThumbClosed,
  checkFist,
  checkOpen,
  checkScissor,
  checkRock,
  checkTiger,
  checkPinch,
  checkPalmDown,
  checkIndex
} from '../utils/gesture-utils';

// 模拟手部关键点数据
const createHandLandmarks = (overrides = {}) => {
  // 默认是一个完全伸直的手
  const defaultLandmarks = [
    { x: 0.5, y: 0.8, z: 0 },      // 0: wrist
    { x: 0.45, y: 0.7, z: 0 },     // 1: thumb_cmc
    { x: 0.4, y: 0.6, z: 0 },      // 2: thumb_mcp
    { x: 0.35, y: 0.5, z: 0 },     // 3: thumb_ip
    { x: 0.3, y: 0.4, z: 0 },      // 4: thumb_tip
    { x: 0.42, y: 0.65, z: 0 },    // 5: index_mcp
    { x: 0.42, y: 0.5, z: 0 },     // 6: index_pip
    { x: 0.42, y: 0.35, z: 0 },    // 7: index_dip
    { x: 0.42, y: 0.2, z: 0 },     // 8: index_tip
    { x: 0.48, y: 0.65, z: 0 },    // 9: middle_mcp
    { x: 0.48, y: 0.5, z: 0 },     // 10: middle_pip
    { x: 0.48, y: 0.35, z: 0 },    // 11: middle_dip
    { x: 0.48, y: 0.2, z: 0 },     // 12: middle_tip
    { x: 0.54, y: 0.65, z: 0 },    // 13: ring_mcp
    { x: 0.54, y: 0.5, z: 0 },     // 14: ring_pip
    { x: 0.54, y: 0.35, z: 0 },    // 15: ring_dip
    { x: 0.54, y: 0.2, z: 0 },     // 16: ring_tip
    { x: 0.6, y: 0.65, z: 0 },     // 17: pinky_mcp
    { x: 0.6, y: 0.5, z: 0 },      // 18: pinky_pip
    { x: 0.6, y: 0.35, z: 0 },     // 19: pinky_dip
    { x: 0.6, y: 0.2, z: 0 },      // 20: pinky_tip
  ];

  return defaultLandmarks.map((lm, i) => overrides[i] || lm);
};

describe('fingerScore', () => {
  it('应该为完全伸直的手指返回高分', () => {
    const pts = createHandLandmarks();
    const score = fingerScore(pts, 8, 6, 5); // 食指
    expect(score).toBeGreaterThan(0.8);
  });

  it('应该为完全弯曲的手指返回低分', () => {
    const pts = createHandLandmarks({
      8: { x: 0.45, y: 0.7, z: 0 },  // tip 在 pip 下方
      6: { x: 0.42, y: 0.5, z: 0 },  // pip
      5: { x: 0.42, y: 0.65, z: 0 }, // mcp
    });
    const score = fingerScore(pts, 8, 6, 5);
    expect(score).toBeLessThan(0.3);
  });

  it('应该返回 0 到 1 之间的值', () => {
    const pts = createHandLandmarks();
    for (let tipIdx = 8; tipIdx <= 20; tipIdx += 4) {
      const score = fingerScore(pts, tipIdx, tipIdx - 2, tipIdx - 3);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe('isFingerUp', () => {
  it('应该正确判断伸直的手指', () => {
    const pts = createHandLandmarks();
    expect(isFingerUp(pts, 8, 6, 5)).toBe(true);  // 食指
    expect(isFingerUp(pts, 12, 10, 9)).toBe(true); // 中指
    expect(isFingerUp(pts, 16, 14, 13)).toBe(true); // 无名指
    expect(isFingerUp(pts, 20, 18, 17)).toBe(true); // 小指
  });

  it('应该正确判断弯曲的手指', () => {
    const pts = createHandLandmarks({
      8: { x: 0.45, y: 0.7, z: 0 },
    });
    expect(isFingerUp(pts, 8, 6, 5)).toBe(false);
  });

  it('应该支持自定义阈值', () => {
    const pts = createHandLandmarks();
    // 默认阈值是 0.6
    expect(isFingerUp(pts, 8, 6, 5, 0.5)).toBe(true);
    // 更高的阈值应该更难满足
    // 注意：默认手势数据的分数可能很高
    const score = fingerScore(pts, 8, 6, 5);
    expect(isFingerUp(pts, 8, 6, 5, score + 0.1)).toBe(false);
  });
});

describe('isFingerDown', () => {
  it('应该正确判断弯曲的手指', () => {
    const pts = createHandLandmarks({
      8: { x: 0.45, y: 0.7, z: 0 },
    });
    expect(isFingerDown(pts, 8, 6, 5)).toBe(true);
  });

  it('应该正确判断伸直的手指', () => {
    const pts = createHandLandmarks();
    expect(isFingerDown(pts, 8, 6, 5)).toBe(false);
  });
});

describe('palmDirection', () => {
  it('应该检测手掌朝前', () => {
    const pts = createHandLandmarks();
    expect(palmDirection(pts)).toBe('front');
  });

  it('应该检测手掌朝下', () => {
    const pts = createHandLandmarks({
      9: { x: 0.48, y: 0.9, z: 0 }, // 中指根部在手腕下方
    });
    expect(palmDirection(pts)).toBe('down');
  });

  it('应该检测手掌朝侧面', () => {
    const pts = createHandLandmarks({
      9: { x: 0.7, y: 0.7, z: 0 }, // 中指根部在手腕右侧
    });
    expect(palmDirection(pts)).toBe('side');
  });
});

describe('isThumbUp', () => {
  it('应该检测拇指向上', () => {
    const pts = createHandLandmarks();
    expect(isThumbUp(pts)).toBe(true);
  });

  it('应该检测拇指向下', () => {
    const pts = createHandLandmarks({
      4: { x: 0.35, y: 0.7, z: 0 }, // tip 在 mcp 下方
    });
    expect(isThumbUp(pts)).toBe(false);
  });
});

describe('isThumbClosed', () => {
  it('应该检测拇指弯曲', () => {
    const pts = createHandLandmarks({
      4: { x: 0.43, y: 0.66, z: 0 }, // tip 靠近食指根部
    });
    expect(isThumbClosed(pts)).toBe(true);
  });

  it('应该检测拇指伸直', () => {
    const pts = createHandLandmarks();
    expect(isThumbClosed(pts)).toBe(false);
  });
});

describe('手势检测函数', () => {
  describe('checkFist', () => {
    it('应该检测握拳手势', () => {
      const pts = createHandLandmarks({
        4: { x: 0.43, y: 0.66, z: 0 },  // thumb tip 靠近 index mcp
        8: { x: 0.45, y: 0.7, z: 0 },   // index tip 弯曲
        12: { x: 0.48, y: 0.7, z: 0 },  // middle tip 弯曲
        16: { x: 0.54, y: 0.7, z: 0 },  // ring tip 弯曲
        20: { x: 0.6, y: 0.7, z: 0 },   // pinky tip 弯曲
      });
      expect(checkFist(pts)).toBe(true);
    });

    it('应该不检测张开手掌', () => {
      const pts = createHandLandmarks();
      expect(checkFist(pts)).toBe(false);
    });
  });

  describe('checkOpen', () => {
    it('应该检测张开手掌', () => {
      const pts = createHandLandmarks();
      expect(checkOpen(pts)).toBe(true);
    });

    it('应该不检测握拳', () => {
      const pts = createHandLandmarks({
        8: { x: 0.45, y: 0.7, z: 0 },
        12: { x: 0.48, y: 0.7, z: 0 },
        16: { x: 0.54, y: 0.7, z: 0 },
        20: { x: 0.6, y: 0.7, z: 0 },
      });
      expect(checkOpen(pts)).toBe(false);
    });
  });

  describe('checkScissor', () => {
    it('应该检测剪刀手', () => {
      const pts = createHandLandmarks({
        16: { x: 0.54, y: 0.7, z: 0 }, // ring tip 弯曲
        20: { x: 0.6, y: 0.7, z: 0 },  // pinky tip 弯曲
      });
      expect(checkScissor(pts)).toBe(true);
    });
  });

  describe('checkRock', () => {
    it('应该检测摇滚手势', () => {
      const pts = createHandLandmarks({
        16: { x: 0.54, y: 0.7, z: 0 }, // ring tip 弯曲
      });
      expect(checkRock(pts)).toBe(true);
    });
  });

  describe('checkTiger', () => {
    it('应该检测老虎手势', () => {
      const pts = createHandLandmarks({
        8: { x: 0.45, y: 0.7, z: 0 },
        12: { x: 0.48, y: 0.7, z: 0 },
        16: { x: 0.54, y: 0.7, z: 0 },
        20: { x: 0.6, y: 0.7, z: 0 },
      });
      expect(checkTiger(pts)).toBe(true);
    });
  });

  describe('checkPinch', () => {
    it('应该检测捏合手势', () => {
      const pts = createHandLandmarks({
        4: { x: 0.42, y: 0.21, z: 0 },  // thumb tip
        8: { x: 0.43, y: 0.22, z: 0 },  // index tip (very close)
        12: { x: 0.48, y: 0.7, z: 0 },
        16: { x: 0.54, y: 0.7, z: 0 },
        20: { x: 0.6, y: 0.7, z: 0 },
      });
      expect(checkPinch(pts)).toBe(true);
    });
  });

  describe('checkPalmDown', () => {
    it('应该检测手掌朝下', () => {
      const pts = createHandLandmarks({
        9: { x: 0.48, y: 0.9, z: 0 }, // 中指根部在手腕下方
      });
      expect(checkPalmDown(pts)).toBe(true);
    });
  });

  describe('checkIndex', () => {
    it('应该检测食指伸直', () => {
      const pts = createHandLandmarks({
        12: { x: 0.48, y: 0.7, z: 0 },
        16: { x: 0.54, y: 0.7, z: 0 },
        20: { x: 0.6, y: 0.7, z: 0 },
      });
      expect(checkIndex(pts)).toBe(true);
    });
  });
});

describe('边界情况', () => {
  it('应该处理极端坐标值', () => {
    const pts = createHandLandmarks({
      4: { x: 0, y: 0, z: 0 },
      8: { x: 1, y: 1, z: 0 },
    });
    const score = fingerScore(pts, 8, 6, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('应该处理相同坐标', () => {
    const pts = createHandLandmarks({
      4: { x: 0.5, y: 0.5, z: 0 },
      8: { x: 0.5, y: 0.5, z: 0 },
      6: { x: 0.5, y: 0.5, z: 0 },
    });
    const score = fingerScore(pts, 8, 6, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
