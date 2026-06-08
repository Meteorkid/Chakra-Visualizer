import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSealSystem, ULT_SEQUENCES, ULT_NAMES } from '../modules/seal.js';

describe('结印系统模块', () => {
  let sealSystem;
  let mockOnSealSuccess;
  let mockOnSealInterrupted;

  beforeEach(() => {
    mockOnSealSuccess = vi.fn();
    mockOnSealInterrupted = vi.fn();
    sealSystem = createSealSystem({
      sealTimeout: 1000,
      comboMaxLength: 6,
      onSealSuccess: mockOnSealSuccess,
      onSealInterrupted: mockOnSealInterrupted,
    });
  });

  describe('ULT_SEQUENCES', () => {
    it('应包含所有大招序列', () => {
      expect(Object.keys(ULT_SEQUENCES)).toHaveLength(13);
      expect(ULT_SEQUENCES['rasenshuriken']).toEqual(['子','丑','寅','卯']);
      expect(ULT_SEQUENCES['susano']).toEqual(['子','未','巳','午']);
      expect(ULT_SEQUENCES['amaterasu']).toEqual(['子','丑','午','未']);
    });
  });

  describe('ULT_NAMES', () => {
    it('应包含所有大招中文名', () => {
      expect(ULT_NAMES['rasenshuriken']).toBe('风遁·螺旋手里剑');
      expect(ULT_NAMES['susano']).toBe('须佐能乎');
      expect(ULT_NAMES['amaterasu']).toBe('天照');
    });
  });

  describe('pushSeal', () => {
    it('应正确推入结印', () => {
      const result = sealSystem.pushSeal({ seal: '子' });
      expect(result).toBeNull();
      expect(mockOnSealSuccess).toHaveBeenCalled();
    });

    it('应去重连续相同结印', () => {
      sealSystem.pushSeal({ seal: '子' });
      const result = sealSystem.pushSeal({ seal: '子' });
      expect(result).toBeNull();
      expect(mockOnSealSuccess).toHaveBeenCalledTimes(1);
    });

    it('应允许不同结印连续推入', () => {
      sealSystem.pushSeal({ seal: '子' });
      sealSystem.pushSeal({ seal: '丑' });
      expect(mockOnSealSuccess).toHaveBeenCalledTimes(2);
    });

    it('应检测到大招序列', () => {
      // 螺旋手里剑: 子-丑-寅-卯
      sealSystem.pushSeal({ seal: '子' });
      sealSystem.pushSeal({ seal: '丑' });
      sealSystem.pushSeal({ seal: '寅' });
      const result = sealSystem.pushSeal({ seal: '卯' });
      expect(result).toBe('rasenshuriken');
    });

    it('应检测到2印大招', () => {
      // 大玉螺旋: 丑-巳
      sealSystem.pushSeal({ seal: '丑' });
      const result = sealSystem.pushSeal({ seal: '巳' });
      expect(result).toBe('rasengan-big');
    });

    it('应检测到3印大招', () => {
      // 月读: 子-午-未
      sealSystem.pushSeal({ seal: '子' });
      sealSystem.pushSeal({ seal: '午' });
      const result = sealSystem.pushSeal({ seal: '未' });
      expect(result).toBe('tsukuyomi');
    });

    it('应保持缓冲区在最大长度内', () => {
      for (let i = 0; i < 8; i++) {
        sealSystem.pushSeal({ seal: ['子','丑','寅','卯','辰','巳','午','未'][i] });
      }
      const buffer = sealSystem.getComboBuffer();
      expect(buffer.length).toBe(6);
    });
  });

  describe('checkComboMatch', () => {
    it('应匹配完整序列', () => {
      const buffer = [
        { seal: '子' },
        { seal: '丑' },
        { seal: '寅' },
        { seal: '卯' },
      ];
      const result = sealSystem.checkComboMatch(buffer);
      expect(result).toBe('rasenshuriken');
    });

    it('应匹配buffer末尾的序列', () => {
      const buffer = [
        { seal: '辰' },
        { seal: '子' },
        { seal: '丑' },
        { seal: '寅' },
        { seal: '卯' },
      ];
      const result = sealSystem.checkComboMatch(buffer);
      expect(result).toBe('rasenshuriken');
    });

    it('无匹配时返回 null', () => {
      const buffer = [{ seal: '辰' }];
      const result = sealSystem.checkComboMatch(buffer);
      expect(result).toBeNull();
    });
  });

  describe('getComboBuffer', () => {
    it('应返回缓冲区副本', () => {
      sealSystem.pushSeal({ seal: '子' });
      const buffer = sealSystem.getComboBuffer();
      expect(buffer).toMatchObject([{ seal: '子' }]);
      // 修改副本不应影响原缓冲区
      buffer.push({ seal: '丑' });
      expect(sealSystem.getComboBuffer().length).toBe(1);
    });
  });

  describe('getComboDisplay', () => {
    it('应返回显示缓冲区', () => {
      sealSystem.pushSeal({ seal: '子' });
      sealSystem.pushSeal({ seal: '丑' });
      const display = sealSystem.getComboDisplay();
      expect(display).toMatchObject([{ seal: '子' }, { seal: '丑' }]);
    });
  });

  describe('clearBuffer', () => {
    it('应清空所有缓冲区', () => {
      sealSystem.pushSeal({ seal: '子' });
      sealSystem.pushSeal({ seal: '丑' });
      sealSystem.clearBuffer();
      expect(sealSystem.getComboBuffer()).toEqual([]);
      expect(sealSystem.getComboDisplay()).toEqual([]);
    });
  });

  describe('getUltSequences', () => {
    it('应返回序列定义副本', () => {
      const seqs = sealSystem.getUltSequences();
      expect(seqs).toEqual(ULT_SEQUENCES);
      // 修改副本不应影响原定义
      delete seqs['rasenshuriken'];
      expect(ULT_SEQUENCES['rasenshuriken']).toBeDefined();
    });
  });

  describe('getUltName', () => {
    it('应返回大招中文名', () => {
      expect(sealSystem.getUltName('rasenshuriken')).toBe('风遁·螺旋手里剑');
      expect(sealSystem.getUltName('unknown')).toBe('unknown');
    });
  });

  describe('默认配置', () => {
    it('应使用默认配置创建实例', () => {
      const defaultSeal = createSealSystem();
      expect(defaultSeal.pushSeal).toBeInstanceOf(Function);
      expect(defaultSeal.checkComboMatch).toBeInstanceOf(Function);
    });
  });
});
