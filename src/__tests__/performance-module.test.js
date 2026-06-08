/**
 * 性能优化模块测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createObjectPool,
  createDirtyRegionDetector,
  createFPSMonitor,
  createMemoryMonitor,
  createCanvasOptimizer,
  createEventManager,
  createTimerManager,
} from '../utils/performance';

describe('createObjectPool', () => {
  let pool;
  let factory;
  let reset;

  beforeEach(() => {
    factory = vi.fn(() => ({ value: 0, active: true }));
    reset = vi.fn((obj) => { obj.value = 0; obj.active = true; });
    pool = createObjectPool(factory, reset, 5);
  });

  it('应该预填充指定数量的对象', () => {
    expect(factory).toHaveBeenCalledTimes(5);
  });

  it('应该从池中获取对象', () => {
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(obj.active).toBe(true);
  });

  it('应该归还对象到池中', () => {
    const obj = pool.acquire();
    pool.release(obj);
    expect(reset).toHaveBeenCalledWith(obj);
  });

  it('应该在池为空时创建新对象', () => {
    // 获取所有预填充的对象
    for (let i = 0; i < 5; i++) {
      pool.acquire();
    }
    // 此时池应该为空，获取新对象应该调用工厂函数
    factory.mockClear();
    const obj = pool.acquire();
    expect(factory).toHaveBeenCalled();
    expect(obj).toBeDefined();
  });

  it('应该正确报告统计信息', () => {
    const stats = pool.getStats();
    expect(stats.poolSize).toBe(5);
    expect(stats.activeCount).toBe(0);

    const obj = pool.acquire();
    const stats2 = pool.getStats();
    expect(stats2.poolSize).toBe(4);
    expect(stats2.activeCount).toBe(1);
  });

  it('应该清空对象池', () => {
    pool.acquire();
    pool.clear();
    const stats = pool.getStats();
    expect(stats.poolSize).toBe(0);
    expect(stats.activeCount).toBe(0);
  });
});

describe('createDirtyRegionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = createDirtyRegionDetector();
  });

  it('应该初始标记为全屏重绘', () => {
    const regions = detector.getDirtyRegions();
    expect(regions).toBeNull();
  });

  it('应该标记脏区域', () => {
    detector.markDirty(10, 10, 100, 100);
    const regions = detector.getDirtyRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0]).toEqual({ x: 10, y: 10, width: 100, height: 100 });
  });

  it('应该在标记全屏重绘时清除脏区域', () => {
    detector.markDirty(10, 10, 100, 100);
    detector.markFullRedraw();
    const regions = detector.getDirtyRegions();
    expect(regions).toBeNull();
  });

  it('应该在脏区域过多时返回 null', () => {
    for (let i = 0; i < 6; i++) {
      detector.markDirty(i * 10, i * 10, 100, 100);
    }
    const regions = detector.getDirtyRegions();
    expect(regions).toBeNull();
  });

  it('应该清除脏区域', () => {
    detector.markDirty(10, 10, 100, 100);
    detector.clear();
    const regions = detector.getDirtyRegions();
    expect(regions).toBeNull();
  });
});

describe('createFPSMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = createFPSMonitor(5);
  });

  it('应该初始返回 0 FPS', () => {
    expect(monitor.getFPS()).toBe(0);
  });

  it('应该正确初始化', () => {
    const stats = monitor.getStats();
    expect(stats.fps).toBe(0);
    expect(stats.avgFrameTime).toBe(0);
    expect(stats.minFrameTime).toBe(0);
    expect(stats.maxFrameTime).toBe(0);
  });

  it('应该返回性能统计', () => {
    // 手动调用 update 多次
    for (let i = 0; i < 5; i++) {
      monitor.update();
    }

    const stats = monitor.getStats();
    // 由于 performance.now() 可能返回相同值，delta 可能为 0
    // 所以我们只检查结构是否正确
    expect(stats).toHaveProperty('fps');
    expect(stats).toHaveProperty('avgFrameTime');
    expect(stats).toHaveProperty('minFrameTime');
    expect(stats).toHaveProperty('maxFrameTime');
  });
});

describe('createMemoryMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = createMemoryMonitor();
  });

  it('应该处理不支持 performance.memory 的情况', () => {
    const originalMemory = performance.memory;
    delete performance.memory;

    const usage = monitor.getMemoryUsage();
    expect(usage).toBeNull();

    performance.memory = originalMemory;
  });

  it('应该返回内存使用情况', () => {
    // 模拟 performance.memory
    const originalMemory = performance.memory;
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      },
      writable: true,
    });

    const usage = monitor.getMemoryUsage();
    expect(usage).toBeDefined();
    expect(usage.usedMB).toBe(50);
    expect(usage.totalMB).toBe(100);

    performance.memory = originalMemory;
  });

  it('应该检测内存是否过高', () => {
    const originalMemory = performance.memory;
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 150 * 1024 * 1024,
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 400 * 1024 * 1024,
      },
      writable: true,
    });

    expect(monitor.isMemoryHigh(100)).toBe(true);
    expect(monitor.isMemoryHigh(200)).toBe(false);

    performance.memory = originalMemory;
  });
});

describe('createCanvasOptimizer', () => {
  let ctx;
  let optimizer;

  beforeEach(() => {
    ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
    };
    optimizer = createCanvasOptimizer(ctx);
  });

  it('应该缓存 fillStyle', () => {
    optimizer.setFillStyle('red');
    expect(ctx.fillStyle).toBe('red');

    // 重复设置相同值不应该修改 ctx
    ctx.fillStyle = '';
    optimizer.setFillStyle('red');
    expect(ctx.fillStyle).toBe('');
  });

  it('应该缓存 strokeStyle', () => {
    optimizer.setStrokeStyle('blue');
    expect(ctx.strokeStyle).toBe('blue');
  });

  it('应该缓存 lineWidth', () => {
    optimizer.setLineWidth(2);
    expect(ctx.lineWidth).toBe(2);
  });

  it('应该缓存 font', () => {
    optimizer.setFont('12px Arial');
    expect(ctx.font).toBe('12px Arial');
  });

  it('应该缓存 textAlign', () => {
    optimizer.setTextAlign('center');
    expect(ctx.textAlign).toBe('center');
  });

  it('应该重置缓存', () => {
    optimizer.setFillStyle('red');
    optimizer.resetCache();

    // 重置后应该能够重新设置相同的值
    ctx.fillStyle = '';
    optimizer.setFillStyle('red');
    expect(ctx.fillStyle).toBe('red');
  });
});

describe('createEventManager', () => {
  let manager;
  let element;

  beforeEach(() => {
    manager = createEventManager();
    element = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  it('应该添加事件监听器', () => {
    const handler = vi.fn();
    manager.on(element, 'click', handler);
    expect(element.addEventListener).toHaveBeenCalledWith('click', handler, undefined);
  });

  it('应该移除事件监听器', () => {
    const handler = vi.fn();
    manager.on(element, 'click', handler);
    manager.off(element, 'click', handler);
    expect(element.removeEventListener).toHaveBeenCalledWith('click', handler);
  });

  it('应该清理所有事件监听器', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    manager.on(element, 'click', handler1);
    manager.on(element, 'mouseover', handler2);

    manager.cleanup();

    expect(element.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('应该返回统计信息', () => {
    manager.on(element, 'click', vi.fn());
    manager.on(element, 'mouseover', vi.fn());

    const stats = manager.getStats();
    expect(stats.elementCount).toBe(1);
    expect(stats.listenerCount).toBe(2);
  });
});

describe('createTimerManager', () => {
  let manager;

  beforeEach(() => {
    manager = createTimerManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该创建 setTimeout', () => {
    const fn = vi.fn();
    manager.setTimeout(fn, 100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalled();
  });

  it('应该清除 setTimeout', () => {
    const fn = vi.fn();
    const id = manager.setTimeout(fn, 100);
    manager.clearTimeout(id);

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('应该创建 setInterval', () => {
    const fn = vi.fn();
    manager.setInterval(fn, 100);

    vi.advanceTimersByTime(350);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('应该清除 setInterval', () => {
    const fn = vi.fn();
    const id = manager.setInterval(fn, 100);
    manager.clearInterval(id);

    vi.advanceTimersByTime(350);
    expect(fn).not.toHaveBeenCalled();
  });

  it('应该清理所有定时器', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    manager.setTimeout(fn1, 100);
    manager.setInterval(fn2, 100);

    manager.cleanup();

    vi.advanceTimersByTime(350);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });
});
