import React, { useState } from 'react';
import Tutorial from './components/Tutorial';
import Camera from './components/Camera';
import './App.css';

function App() {
  const [showCamera, setShowCamera] = useState(false);
  const [initialJutsu, setInitialJutsu] = useState(null);

  const handleStart = (jutsuId = null) => {
    if (jutsuId) {
      setInitialJutsu(jutsuId);
    }
    setShowCamera(true);
  };

  return (
    <>
      {!showCamera ? (
        <Tutorial onStart={handleStart} />
      ) : (
        <div className="camera-view">
          <Camera initialJutsu={initialJutsu} onBack={() => setShowCamera(false)} />
        </div>
      )}
    </>
  );
}

export default App;
