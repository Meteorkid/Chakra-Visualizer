import { createContext, useContext, useState, useCallback } from 'react';

const GameContext = createContext({ mode: 'novice', setMode: () => {}, config: {} });

// 模式配置
const MODES = {
  novice: {
    label: { en: 'Novice', zh: '新手模式' },
    sealTimeout: 5000,        // 结印超时 5 秒
    gestureFrames: 2,         // 2 帧确认（更灵敏）
    scoreThreshold: 0.5,      // 手势判定阈值更低（更容易触发）
    showHandName: true,       // 显示当前检测到的手势
    showSealHint: true,       // 显示下一步提示
    ultDuration: 6000,        // 大招持续 6 秒
    ultCooldown: 5000,        // 冷却 5 秒
  },
  master: {
    label: { en: 'Master', zh: '大师模式' },
    sealTimeout: 2500,        // 结印超时 2.5 秒（更快）
    gestureFrames: 3,         // 3 帧确认（更稳定）
    scoreThreshold: 0.65,     // 手势判定阈值更高（更严格）
    showHandName: false,      // 不显示手势名（纯靠记忆）
    showSealHint: false,      // 不显示下一步提示
    ultDuration: 5000,        // 大招持续 5 秒
    ultCooldown: 8000,        // 冷却 8 秒
  },
};

export function GameProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('chakra-mode') || 'novice'; } catch { return 'novice'; }
  });

  const handleSetMode = useCallback((newMode) => {
    setMode(newMode);
    try { localStorage.setItem('chakra-mode', newMode); } catch {}
  }, []);

  const config = MODES[mode] || MODES.novice;

  return (
    <GameContext.Provider value={{ mode, setMode: handleSetMode, config, modes: MODES }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
