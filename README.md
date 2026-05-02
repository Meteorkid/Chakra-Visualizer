# Naruto Jutsu Hand Gesture Visualizer

A real-time hand gesture recognition web app built with React and MediaPipe Hands. Point your webcam and use hand gestures to cast Naruto jutsu visual effects overlaid on your live camera feed.

## Demo

![Naruto Jutsu Demo](https://i.imgur.com/placeholder.png)

## Gestures

| Gesture | Effect |
|---|---|
| Open palm (left hand) | Rasengan |
| Open palm (right hand) | Chidori |
| Closed fist with thumb up | Fireball |
| Pinch (thumb + index finger) | Hollow Purple |

## How It Works

- Uses **MediaPipe Hands** to track 21 hand landmarks per hand in real time
- Detects hand poses by comparing distances between landmark points
- Renders effects using the **Canvas 2D API** — Hollow Purple is a fully custom particle system with radial gradients and swirling ring animations at 60fps
- Video effects (Rasengan, Chidori, Fireball) are overlaid using `mix-blend-mode: screen` for a transparent compositing effect
- Supports **dual-hand tracking** simultaneously

## Tech Stack

- React 19
- MediaPipe Hands
- Vite
- Canvas 2D API

## Getting Started

### Prerequisites

- Node.js (v18+)
- A webcam

### Installation

```bash
git clone https://github.com/ubp-as/naruto-jutsu-visualizer.git
cd naruto-jutsu-visualizer
npm install
```

### Adding Video Assets

The jutsu effect videos are not included in this repository due to file size. Add the following MP4 files to the `public/assets/` folder:

```
public/
└── assets/
    ├── rasengan.mp4
    ├── chidori.mp4
    └── fireball.mp4
```

### Running the App

```bash
npm run dev
```

Then open `https://localhost:5173` in your browser.

> **Note:** The app requires **HTTPS** for webcam access. Vite is configured with a basic SSL certificate so use `https://` not `http://`. Your browser may show a security warning — click "Advanced" and proceed anyway.

## Project Structure

```
naruto-jutsu/
├── public/
│   └── assets/          # Video effect files (not included)
├── src/
│   ├── components/
│   │   └── Camera.jsx   # Main gesture detection and rendering logic
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   ├── index.css
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```

## Author

Abdullah Salman — [github.com/ubp-as](https://github.com/ubp-as)
