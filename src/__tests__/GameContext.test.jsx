import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGame } from '../GameContext';

// 包装器组件
const wrapper = ({ children }) => <GameProvider>{children}</GameProvider>;

describe('GameContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该默认为新手模式', () => {
      const { result } = renderHook(() => useGame(), { wrapper });
      expect(result.current.mode).toBe('novice');
    });

    it('应该有正确的初始分数', () => {
      const { result } = renderHook(() => useGame(), { wrapper });
      expect(result.current.score).toBe(0);
      expect(result.current.combo).toBe(0);
      expect(result.current.maxCombo).toBe(0);
      expect(result.current.perfectCount).toBe(0);
    });

    it('应该返回正确的配置', () => {
      const { result } = renderHook(() => useGame(), { wrapper });
      expect(result.current.config.enableScoring).toBe(false);
      expect(result.current.config.enableCombo).toBe(false);
      expect(result.current.config.enablePerfectBonus).toBe(false);
    });
  });

  describe('模式切换', () => {
    it('应该能切换到大师模式', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      expect(result.current.mode).toBe('master');
      expect(result.current.config.enableScoring).toBe(true);
      expect(result.current.config.enableCombo).toBe(true);
    });

    it('切换模式时应该重置分数', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      // 先设置一些分数
      act(() => {
        result.current.setMode('master');
      });

      act(() => {
        result.current.onUltRelease('rasenshuriken');
      });

      expect(result.current.score).toBeGreaterThan(0);

      // 切换模式
      act(() => {
        result.current.setMode('novice');
      });

      expect(result.current.score).toBe(0);
      expect(result.current.combo).toBe(0);
    });

    it('应该持久化模式到 localStorage', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      expect(localStorage.getItem('chakra-mode')).toBe('master');
    });
  });

  describe('结印追踪', () => {
    it('应该记录结印成功', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.onSealSuccess();
        result.current.onSealSuccess();
        result.current.onSealSuccess();
      });

      // 结印计数通过 ref 管理，不直接暴露
      // 但可以通过 onUltRelease 的结果验证
    });

    it('应该处理结印被打断', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.onSealSuccess();
        result.current.onSealInterrupted();
      });

      // 打断后结印计数重置
    });
  });

  describe('大招释放', () => {
    it('应该正确计算基础分数（完美释放）', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      // 先重置
      act(() => {
        result.current.resetGame();
      });

      // 设置大师模式
      act(() => {
        result.current.setMode('master');
      });

      // 再次重置（确保 lastUltTime = 0）
      act(() => {
        result.current.resetGame();
      });

      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('rasenshuriken');
      });

      // 完美释放：1000 * 1 * 1.5 = 1500
      expect(releaseResult.totalScore).toBe(1500);
      expect(releaseResult.isPerfect).toBe(true);
      expect(releaseResult.perfectMultiplier).toBe(1.5);
      expect(result.current.score).toBe(1500);
    });

    it('应该正确计算基础分数（非完美释放）', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      // 先重置
      act(() => {
        result.current.resetGame();
      });

      // 设置大师模式
      act(() => {
        result.current.setMode('master');
      });

      // 模拟结印被打断
      act(() => {
        result.current.onSealInterrupted();
      });

      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('rasenshuriken');
      });

      // 非完美释放：1000 * 1 * 1 = 1000
      expect(releaseResult.totalScore).toBe(1000);
      expect(releaseResult.isPerfect).toBe(false);
      expect(releaseResult.perfectMultiplier).toBe(1);
      expect(result.current.score).toBe(1000);
    });

    it('应该正确计算连击', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 第一次释放
      act(() => {
        result.current.onUltRelease('rasenshuriken');
      });

      expect(result.current.combo).toBe(1);

      // 第二次释放（15秒内）
      act(() => {
        result.current.onUltRelease('susano');
      });

      expect(result.current.combo).toBe(2);
      expect(result.current.maxCombo).toBe(2);
    });

    it('连击超过15秒应该重置', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 第一次释放
      act(() => {
        result.current.onUltRelease('rasenshuriken');
      });

      // 模拟时间流逝
      vi.useFakeTimers();
      vi.advanceTimersByTime(20000);

      // 第二次释放（超过15秒）
      act(() => {
        result.current.onUltRelease('susano');
      });

      expect(result.current.combo).toBe(1); // 重置为1

      vi.useRealTimers();
    });

    it('应该正确计算连击倍率', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 第一次释放（无连击）
      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('rasenshuriken');
      });

      expect(releaseResult.comboMultiplier).toBe(1);

      // 第二次释放（连击2）
      act(() => {
        releaseResult = result.current.onUltRelease('susano');
      });

      expect(releaseResult.comboMultiplier).toBe(1.5); // 1 + (2-1) * 0.5
    });

    it('应该正确计算完美释放', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 完美释放（无打断，结印少于5个）
      act(() => {
        result.current.onSealSuccess();
        result.current.onSealSuccess();
      });

      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('rasenshuriken');
      });

      expect(releaseResult.isPerfect).toBe(true);
      expect(releaseResult.perfectMultiplier).toBe(1.5);
      expect(result.current.perfectCount).toBe(1);
    });

    it('打断后应该不是完美释放', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 打断
      act(() => {
        result.current.onSealInterrupted();
      });

      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('rasenshuriken');
      });

      expect(releaseResult.isPerfect).toBe(false);
      expect(releaseResult.perfectMultiplier).toBe(1);
    });

    it('应该正确累计总分', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.resetGame();
      });

      act(() => {
        result.current.setMode('master');
      });

      act(() => {
        result.current.resetGame();
      });

      // 第一次释放（完美释放）
      act(() => {
        result.current.onUltRelease('rasenshuriken');
      });

      // 1000 * 1 * 1.5 = 1500
      expect(result.current.score).toBe(1500);

      // 第二次释放（连击 + 完美释放）
      act(() => {
        result.current.onUltRelease('susano');
      });

      // 1500 + 1500 * 1.5 * 1.5 = 1500 + 3375 = 4875
      expect(result.current.score).toBe(4875);
    });
  });

  describe('重置游戏', () => {
    it('应该重置所有游戏状态', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.setMode('master');
      });

      // 添加一些状态
      act(() => {
        result.current.onUltRelease('rasenshuriken');
        result.current.onUltRelease('susano');
      });

      expect(result.current.score).toBeGreaterThan(0);

      // 重置
      act(() => {
        result.current.resetGame();
      });

      expect(result.current.score).toBe(0);
      expect(result.current.combo).toBe(0);
      expect(result.current.maxCombo).toBe(0);
      expect(result.current.perfectCount).toBe(0);
    });
  });

  describe('不同忍术的分数', () => {
    it('应该正确计算不同忍术的基础分（非完美释放）', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.resetGame();
      });

      act(() => {
        result.current.setMode('master');
      });

      // 模拟结印被打断（非完美释放）
      act(() => {
        result.current.onSealInterrupted();
      });

      // 螺旋手里剑：1000 * 1 * 1 = 1000
      act(() => {
        const r = result.current.onUltRelease('rasenshuriken');
        expect(r.totalScore).toBe(1000);
      });

      act(() => { result.current.resetGame(); });
      act(() => { result.current.onSealInterrupted(); });

      // 须佐能乎：1500 * 1 * 1 = 1500
      act(() => {
        const r = result.current.onUltRelease('susano');
        expect(r.totalScore).toBe(1500);
      });

      act(() => { result.current.resetGame(); });
      act(() => { result.current.onSealInterrupted(); });

      // 天照：1200 * 1 * 1 = 1200
      act(() => {
        const r = result.current.onUltRelease('amaterasu');
        expect(r.totalScore).toBe(1200);
      });

      act(() => { result.current.resetGame(); });
      act(() => { result.current.onSealInterrupted(); });

      // 月读：800 * 1 * 1 = 800
      act(() => {
        const r = result.current.onUltRelease('tsukuyomi');
        expect(r.totalScore).toBe(800);
      });
    });

    it('未知忍术应该使用默认分数', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.resetGame();
      });

      act(() => {
        result.current.setMode('master');
      });

      // 模拟结印被打断（非完美释放）
      act(() => {
        result.current.onSealInterrupted();
      });

      let releaseResult;
      act(() => {
        releaseResult = result.current.onUltRelease('unknown');
      });

      // 默认分数 1000 * 1 * 1 = 1000
      expect(releaseResult.totalScore).toBe(1000);
    });
  });
});
