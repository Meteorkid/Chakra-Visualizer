import { createContext, useContext, useState, useCallback, useRef } from 'react';

const GameContext = createContext({ mode: 'novice', setMode: () => {}, config: {} });

const MODES = {
  novice: {
    label: { en: 'Novice', zh: '新手模式' },
    sealTimeout: 5000,
    gestureFrames: 2,
    scoreThreshold: 0.5,
    showHandName: true,
    showSealHint: true,
    ultDuration: 6000,
    ultCooldown: 5000,
    enableScoring: false,      // 不计分
    enableCombo: false,        // 无连击
    enablePerfectBonus: false, // 无完美释放
    screenShake: false,        // 无屏幕震动
    ultGlow: false,            // 无大招光效
  },
  master: {
    label: { en: 'Master', zh: '大师模式' },
    sealTimeout: 2500,
    gestureFrames: 3,
    scoreThreshold: 0.65,
    showHandName: false,
    showSealHint: false,
    ultDuration: 5000,
    ultCooldown: 8000,
    enableScoring: true,       // 计分系统
    enableCombo: true,         // 连击系统
    enablePerfectBonus: true,  // 完美释放奖励
    screenShake: true,         // 大招时屏幕震动
    ultGlow: true,             // 大招边框光效
  },
};

// 大招基础分
const ULT_SCORES = {
  rasenshuriken: 1000,
  susano: 1500,
  amaterasu: 1200,
  tsukuyomi: 800,
};

export function GameProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('chakra-mode') || 'novice'; } catch { return 'novice'; }
  });

  // 游戏状态（大师模式用）
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [lastUltTime, setLastUltTime] = useState(0);

  // 结印追踪
  const sealCount = useRef(0);      // 当前大招用了几个印
  const sealInterrupted = useRef(false); // 是否被打断过

  const handleSetMode = useCallback((newMode) => {
    setMode(newMode);
    try { localStorage.setItem('chakra-mode', newMode); } catch {}
    // 切换模式时重置分数
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
  }, []);

  // 记录一个结印成功
  const onSealSuccess = useCallback(() => {
    sealCount.current++;
  }, []);

  // 结印被打断（超时或手势不匹配）
  const onSealInterrupted = useCallback(() => {
    sealInterrupted.current = true;
    sealCount.current = 0;
  }, []);

  // 大招释放成功
  const onUltRelease = useCallback((ultName) => {
    const now = Date.now();
    const baseScore = ULT_SCORES[ultName] || 1000;

    // 连击计算
    const timeSinceLast = now - lastUltTime;
    const newCombo = (timeSinceLast < 15000 && lastUltTime > 0) ? combo + 1 : 1;
    setCombo(newCombo);
    setMaxCombo(prev => Math.max(prev, newCombo));

    // 连击倍率：每连击 +0.5x
    const comboMultiplier = 1 + (newCombo - 1) * 0.5;

    // 完美释放：结印未被打断
    const isPerfect = !sealInterrupted.current && sealCount.current <= 5;
    const perfectMultiplier = isPerfect ? 1.5 : 1;
    if(isPerfect) setPerfectCount(prev => prev + 1);

    // 总分
    const totalScore = Math.round(baseScore * comboMultiplier * perfectMultiplier);
    setScore(prev => prev + totalScore);
    setLastUltTime(now);

    // 重置结印追踪
    sealCount.current = 0;
    sealInterrupted.current = false;

    return { totalScore, combo: newCombo, isPerfect, comboMultiplier, perfectMultiplier };
  }, [combo, lastUltTime]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setLastUltTime(0);
    sealCount.current = 0;
    sealInterrupted.current = false;
  }, []);

  const config = MODES[mode] || MODES.novice;

  return (
    <GameContext.Provider value={{
      mode, setMode: handleSetMode, config, modes: MODES,
      // 游戏状态
      score, combo, maxCombo, perfectCount,
      // 游戏方法
      onSealSuccess, onSealInterrupted, onUltRelease, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
