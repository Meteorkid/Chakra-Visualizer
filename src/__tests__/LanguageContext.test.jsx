import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';

// 包装器组件
const wrapper = ({ children }) => <LanguageProvider>{children}</LanguageProvider>;

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该默认为英文', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      expect(result.current.lang).toBe('en');
    });

    it('应该有 t() 函数', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      expect(typeof result.current.t).toBe('function');
    });
  });

  describe('语言切换', () => {
    it('应该能切换到中文', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('zh');
      });

      expect(result.current.lang).toBe('zh');
    });

    it('应该能切换回英文', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('zh');
      });

      act(() => {
        result.current.setLang('en');
      });

      expect(result.current.lang).toBe('en');
    });

    it('应该持久化语言到 localStorage', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('zh');
      });

      expect(localStorage.getItem('chakra-lang')).toBe('zh');
    });

    it('应该从 localStorage 读取语言', () => {
      localStorage.setItem('chakra-lang', 'zh');

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.lang).toBe('zh');
    });
  });

  describe('t() 函数', () => {
    it('应该返回正确的英文翻译', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.t('badge')).toBe('NARUTO INTERACTIVE EXPERIENCE');
      expect(result.current.t('selectTechnique')).toBe('SELECT TECHNIQUE');
    });

    it('应该返回正确的中文翻译', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('zh');
      });

      expect(result.current.t('badge')).toBe('火影忍者互动体验');
      expect(result.current.t('selectTechnique')).toBe('选择忍术');
    });

    it('应该支持嵌套键', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.t('jutsu.rasengan.name')).toBe('Rasengan');
      expect(result.current.t('jutsu.rasengan.kanji')).toBe('螺旋丸');
    });

    it('应该支持参数插值', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      const text = result.current.t('singleHandTip', { hand: 'Right Hand' });
      expect(text).toBe('Use your Right Hand only for this jutsu.');
    });

    it('应该支持中文参数插值', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLang('zh');
      });

      const text = result.current.t('singleHandTip', { hand: '右手' });
      expect(text).toBe('此忍术请使用右手。');
    });

    it('应该返回键名当翻译不存在时', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('应该处理嵌套对象', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      const jutsu = result.current.t('jutsu.rasengan');
      expect(jutsu).toHaveProperty('name', 'Rasengan');
      expect(jutsu).toHaveProperty('kanji', '螺旋丸');
      expect(jutsu).toHaveProperty('description');
      expect(jutsu).toHaveProperty('instructions');
    });
  });

  describe('语言数据完整性', () => {
    it('英文和中文应该有相同的键', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // 切换到英文获取所有键
      const enBadge = result.current.t('badge');
      const enJutsu = result.current.t('jutsu.rasengan.name');

      // 切换到中文
      act(() => {
        result.current.setLang('zh');
      });

      const zhBadge = result.current.t('badge');
      const zhJutsu = result.current.t('jutsu.rasengan.name');

      // 两个语言都应该有值
      expect(enBadge).toBeTruthy();
      expect(zhBadge).toBeTruthy();
      expect(enJutsu).toBeTruthy();
      expect(zhJutsu).toBeTruthy();
    });

    it('应该有所有忍术的翻译', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      const jutsuKeys = [
        'rasengan', 'chidori', 'fireball', 'hollow-purple',
        'sharingan', 'shadow-clone', 'eight-gates', 'chibaku-tensei',
        'rasenshuriken', 'susano', 'amaterasu', 'tsukuyomi'
      ];

      jutsuKeys.forEach(key => {
        expect(result.current.t(`jutsu.${key}.name`)).toBeTruthy();
      });
    });
  });
});
