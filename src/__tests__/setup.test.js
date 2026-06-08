import { describe, it, expect } from 'vitest';

describe('测试框架验证', () => {
  it('应该能正常运行测试', () => {
    expect(1 + 1).toBe(2);
  });

  it('应该能使用 vitest 功能', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});
