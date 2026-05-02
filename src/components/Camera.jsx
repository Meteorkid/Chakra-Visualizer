import { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

export default function CameraComponent(){

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fxCanvasRef = useRef(null);
  const rasenganRef = useRef(null);
  const chidoriRef = useRef(null);
  const fireballRef = useRef(null);

  const power = useRef([0,0]);
  const wasOpen = useRef([false,false]);
  const wasTiger = useRef([false,false]);
  const fireballPower = useRef([0,0]);

  const hollowPurpleSize = useRef(0);
  const hollowPurplePos = useRef({ x: 0, y: 0 });
  const wasPinching = useRef(false);
  const particles = useRef([]);
  const animFrameRef = useRef(null);

  function checkOpen(pts){
    let count = 0;
    const wrist = pts[0];
    const tips = [8,12,16,20];
    const pips = [6,10,14,18];
    for(let i = 0; i < tips.length; i++){
      const tip = pts[tips[i]];
      const pip = pts[pips[i]];
      if(
        Math.hypot(tip.x-wrist.x, tip.y-wrist.y) >
        Math.hypot(pip.x-wrist.x, pip.y-wrist.y)
      ) count++;
    }
    return count >= 3;
  }

  function checkTiger(pts){
    const wrist = pts[0];
    const thumbTip = pts[4];
    const thumbMcp = pts[2];

    const indexTip = pts[8];  const indexPip = pts[6];
    const middleTip = pts[12]; const middlePip = pts[10];
    const ringTip = pts[16];  const ringPip = pts[14];
    const pinkyTip = pts[20]; const pinkyPip = pts[18];

    const thumbUp = thumbTip.y < thumbMcp.y - 0.05;

    const indexClosed =
      Math.hypot(indexTip.x-wrist.x, indexTip.y-wrist.y) <
      Math.hypot(indexPip.x-wrist.x, indexPip.y-wrist.y);

    const middleClosed =
      Math.hypot(middleTip.x-wrist.x, middleTip.y-wrist.y) <
      Math.hypot(middlePip.x-wrist.x, middlePip.y-wrist.y);

    const ringClosed =
      Math.hypot(ringTip.x-wrist.x, ringTip.y-wrist.y) <
      Math.hypot(ringPip.x-wrist.x, ringPip.y-wrist.y);

    const pinkyClosed =
      Math.hypot(pinkyTip.x-wrist.x, pinkyTip.y-wrist.y) <
      Math.hypot(pinkyPip.x-wrist.x, pinkyPip.y-wrist.y);

    return thumbUp && indexClosed && middleClosed && ringClosed && pinkyClosed;
  }

  function checkPinch(pts){
    const thumbTip = pts[4];
    const indexTip = pts[8];
    const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

    const wrist = pts[0];
    const middleTip = pts[12]; const middlePip = pts[10];
    const ringTip = pts[16];  const ringPip = pts[14];
    const pinkyTip = pts[20]; const pinkyPip = pts[18];

    const middleClosed =
      Math.hypot(middleTip.x-wrist.x, middleTip.y-wrist.y) <
      Math.hypot(middlePip.x-wrist.x, middlePip.y-wrist.y);

    const ringClosed =
      Math.hypot(ringTip.x-wrist.x, ringTip.y-wrist.y) <
      Math.hypot(ringPip.x-wrist.x, ringPip.y-wrist.y);

    const pinkyClosed =
      Math.hypot(pinkyTip.x-wrist.x, pinkyTip.y-wrist.y) <
      Math.hypot(pinkyPip.x-wrist.x, pinkyPip.y-wrist.y);

    return dist < 0.05 && middleClosed && ringClosed && pinkyClosed;
  }

  function spawnParticles(x, y, size){
    const count = 8;
    for(let i = 0; i < count; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const isBlue = Math.random() > 0.5;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.025,
        size: (3 + Math.random() * 6) * (size / 80),
        color: isBlue ? `rgba(80,160,255,` : `rgba(200,60,255,`
      });
    }
  }

  function drawHollowPurple(ctx, x, y, size){
    if(size < 2) return;

    ctx.save();

    const atmosphereGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
    atmosphereGrad.addColorStop(0, `rgba(138, 43, 226,${Math.min(0.25, size/200)})`);
    atmosphereGrad.addColorStop(0.5, `rgba(138, 43, 226,${Math.min(0.1, size/400)})`);
    atmosphereGrad.addColorStop(1, `rgba(80,0,160,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx.fillStyle = atmosphereGrad;
    ctx.fill();

    const blueGrad = ctx.createRadialGradient(x - size*0.4, y, 0, x - size*0.4, y, size * 1.8);
    blueGrad.addColorStop(0, `rgba(60,140,255,${Math.min(0.7, size/80)})`);
    blueGrad.addColorStop(0.5, `rgba(30,80,220,${Math.min(0.4, size/150)})`);
    blueGrad.addColorStop(1, `rgba(0,30,180,0)`);
    ctx.beginPath();
    ctx.arc(x - size*0.1, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = blueGrad;
    ctx.fill();

    const redGrad = ctx.createRadialGradient(x + size*0.4, y, 0, x + size*0.4, y, size * 1.8);
    redGrad.addColorStop(0, `rgba(255,50,80,${Math.min(0.7, size/80)})`);
    redGrad.addColorStop(0.5, `rgba(220,20,60,${Math.min(0.4, size/150)})`);
    redGrad.addColorStop(1, `rgba(180,0,40,0)`);
    ctx.beginPath();
    ctx.arc(x + size*0.1, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = redGrad;
    ctx.fill();

    const ringCount = 12;
    for(let i = 0; i < ringCount; i++){
      const angle = (i / ringCount) * Math.PI * 2 + Date.now() * 0.002;
      const rx = x + Math.cos(angle) * size * 1.1;
      const ry = y + Math.sin(angle) * size * 0.4;
      const isBlue = i < ringCount / 2;
      ctx.beginPath();
      ctx.arc(rx, ry, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = isBlue
        ? `rgba(100,180,255,${Math.min(0.8, size/60)})`
        : `rgba(220,80,255,${Math.min(0.8, size/60)})`;
      ctx.fill();
    }

    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGrad.addColorStop(0, `rgba(255,255,255,${Math.min(1, size/40)})`);
    coreGrad.addColorStop(0.2, `rgba(230,180,255,${Math.min(0.95, size/50)})`);
    coreGrad.addColorStop(0.5, `rgba(180,80,255,${Math.min(0.85, size/60)})`);
    coreGrad.addColorStop(0.8, `rgba(100,20,200,${Math.min(0.6, size/90)})`);
    coreGrad.addColorStop(1, `rgba(60,0,120,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
    innerGrad.addColorStop(0, `rgba(255,255,255,${Math.min(1, size/30)})`);
    innerGrad.addColorStop(1, `rgba(255,220,255,0)`);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.restore();
  }

  useEffect(()=>{

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const fxCanvas = fxCanvasRef.current;
    const fxCtx = fxCanvas.getContext("2d");

    const rasengan = rasenganRef.current;
    const chidori = chidoriRef.current;
    const fireball = fireballRef.current;

    function animateHollowPurple(){
      animFrameRef.current = requestAnimationFrame(animateHollowPurple);

      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      const size = hollowPurpleSize.current;
      const pos = hollowPurplePos.current;

      if(size > 2){
        spawnParticles(pos.x, pos.y, size);
        drawHollowPurple(fxCtx, pos.x, pos.y, size);
      }

      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= p.decay;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        fxCtx.fillStyle = `${p.color}${p.life})`;
        fxCtx.fill();
      });

      particles.current = particles.current.filter(p => p.life > 0);
    }

    animateHollowPurple();

    function onResults(res){

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      rasengan.style.display = "none";
      chidori.style.display = "none";
      fireball.style.display = "none";

      let pinchDetected = false;

      if(res.multiHandLandmarks && res.multiHandedness){

        res.multiHandLandmarks.forEach((pts, i) => {

          const label = res.multiHandedness[i].label;
          const isRight = label === "Right";
          const idx = isRight ? 1 : 0;

          drawConnectors(ctx, pts, HAND_CONNECTIONS, {color:"#00d4ff", lineWidth:3});
          drawLandmarks(ctx, pts, {color:"#fff", radius:2});

          const open = checkOpen(pts);
          const pinch = checkPinch(pts);
          const tiger = !open && !pinch && checkTiger(pts);

          power.current[idx] += open ? 0.05 : -0.15;
          power.current[idx] = Math.max(0, Math.min(1, power.current[idx]));

          if(open && !wasOpen.current[idx]){
            const vid = isRight ? chidori : rasengan;
            vid.currentTime = 0;
            vid.play();
          }
          wasOpen.current[idx] = open;

          fireballPower.current[idx] += tiger ? 0.05 : -0.15;
          fireballPower.current[idx] = Math.max(0, Math.min(1, fireballPower.current[idx]));

          if(tiger && !wasTiger.current[idx]){
            fireball.currentTime = 0;
            fireball.play();
          }
          wasTiger.current[idx] = tiger;

          const wrist = pts[0];
          const knuckle = pts[9];

          if(power.current[idx] > 0.01){
            const tx = (wrist.x + knuckle.x) / 2;
            const ty = (wrist.y + knuckle.y) / 2;
            const vid = isRight ? chidori : rasengan;
            vid.style.left = `${(1-tx)*window.innerWidth}px`;
            vid.style.top = `${ty*window.innerHeight}px`;
            vid.style.opacity = power.current[idx];
            vid.style.display = "block";
          }

          if(fireballPower.current[idx] > 0.01){
            const tx = (wrist.x + knuckle.x) / 2;
            const ty = (wrist.y + knuckle.y) / 2;
            fireball.style.left = `${(1-tx)*window.innerWidth}px`;
            fireball.style.top = `${ty*window.innerHeight}px`;
            fireball.style.opacity = 1;
            fireball.style.display = "block";
          }

          if(pinch){
            pinchDetected = true;
            const thumbTip = pts[4];
            const middleTip = pts[12];
            const mx = (1 - (thumbTip.x + middleTip.x) / 2) * window.innerWidth;
            const my = ((thumbTip.y + middleTip.y) / 2) * window.innerHeight;
            hollowPurplePos.current = { x: mx, y: my };
            hollowPurpleSize.current = Math.min(hollowPurpleSize.current + 1.2, 150);
            wasPinching.current = true;
          }

        });
      }

      if(!pinchDetected){
        hollowPurpleSize.current = Math.max(0, hollowPurpleSize.current - 4);
        wasPinching.current = false;
      }

    }

    const hands = new Hands({
      locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });

    hands.onResults(onResults);

    const cam = new Camera(video, {
      onFrame: async() => {
        await hands.send({image: video});
      },
      width: 1280,
      height: 720
    });

    cam.start();

    return () => {
      if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

  },[]);

  return(
    <>
      <video ref={videoRef} autoPlay playsInline></video>
      <canvas ref={canvasRef}></canvas>

      <canvas
        ref={fxCanvasRef}
        style={{
          position:"absolute",
          top:0, left:0,
          width:"100vw",
          height:"100vh",
          pointerEvents:"none",
          zIndex:10,
          mixBlendMode:"screen"
        }}
      />

      <video
        ref={rasenganRef}
        id="rasengan"
        className="fx"
        src="/assets/rasengan.mp4"
        muted
        loop
        style={{display:"none"}}
      />

      <video
        ref={chidoriRef}
        id="chidori"
        className="fx"
        src="/assets/chidori.mp4"
        muted
        loop
        style={{display:"none"}}
      />

      <video
        ref={fireballRef}
        id="fireball"
        className="fx"
        src="/assets/fireball.mp4"
        muted
        loop
        style={{display:"none"}}
      />
    </>
  );
}
