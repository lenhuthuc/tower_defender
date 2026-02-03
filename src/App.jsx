import React, { useRef, useEffect, useState } from 'react';
// Import hết các class mới
import { NormalEnemy, FastEnemy, TankEnemy, CannonTower, SniperTower, GatlingTower, Projectile, GAME_CONFIG, TOWER_TYPES } from './GameClasses';
import './App.css';

const PATH = [{x: 0, y: 100}, {x: 150, y: 100}, {x: 150, y: 400}, {x: 450, y: 400}, {x: 450, y: 200}, {x: 700, y: 200}, {x: 700, y: 500}, {x: 850, y: 500}];

function App() {
  const canvasRef = useRef(null);
  
  // CORE GAME STATE (Chạy ngầm trong game loop)
  const gameState = useRef({
    enemies: [],
    towers: [],
    projectiles: [],
    frameCount: 0,
    isPlaying: true,
    wave: 1,
    enemiesToSpawn: [] // Hàng đợi quái cần sinh ra trong wave hiện tại
  });

  // UI REACT STATE
  const [money, setMoney] = useState(GAME_CONFIG.STARTING_MONEY);
  const [lives, setLives] = useState(GAME_CONFIG.STARTING_LIVES);
  const [gameOver, setGameOver] = useState(false);
  // State cho loại tháp đang chọn
  const [selectedTowerType, setSelectedTowerType] = useState("CANNON");
  const [waveInfo, setWaveInfo] = useState(1);

  // --- HỆ THỐNG WAVE ĐƠN GIẢN ---
  const setupWave = (waveNum) => {
      const queue = [];
      // Wave 1: 10 Normal
      if (waveNum === 1) {
          for(let i=0; i<10; i++) queue.push('NORMAL');
      } 
      // Wave 2: 10 Normal + 5 Fast
      else if (waveNum === 2) {
          for(let i=0; i<10; i++) queue.push('NORMAL');
          for(let i=0; i<5; i++) queue.push('FAST');
      }
      // Wave 3 trở đi: Hỗn hợp và tăng số lượng Tank
      else {
          const count = 15 + waveNum * 2;
          for(let i=0; i<count; i++) {
              const rand = Math.random();
              if (rand < 0.5) queue.push('NORMAL');
              else if (rand < 0.8) queue.push('FAST');
              else queue.push('TANK');
          }
      }
      gameState.current.enemiesToSpawn = queue;
      setWaveInfo(waveNum);
  }

  useEffect(() => {
    // Khởi tạo wave đầu tiên
    setupWave(1);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Bật tính năng đổ bóng cho canvas đẹp hơn
    ctx.shadowBlur = 0; 
    
    let animationId;

    const gameLoop = () => {
      if (!gameState.current.isPlaying) return;
      const state = gameState.current;
      state.frameCount++;

      // 1. RENDER NỀN & BẢN ĐỒ
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawMapDecorations(ctx); // Vẽ trang trí trước
      drawMapPath(ctx);        // Vẽ đường đi lên trên

      // 2. SPAWN ENEMY LOGIC (Xử lý hàng đợi wave)
      // Cứ 60 frames (1 giây) sinh 1 con nếu còn trong hàng đợi
      if (state.frameCount % 60 === 0 && state.enemiesToSpawn.length > 0) {
          const enemyType = state.enemiesToSpawn.shift(); // Lấy con đầu tiên ra
          switch(enemyType) {
              case 'NORMAL': state.enemies.push(new NormalEnemy(PATH)); break;
              case 'FAST': state.enemies.push(new FastEnemy(PATH)); break;
              case 'TANK': state.enemies.push(new TankEnemy(PATH)); break;
          }
      }

      // Kiểm tra hết wave (không còn quái sống và không còn quái chờ sinh)
      if (state.enemies.length === 0 && state.enemiesToSpawn.length === 0 && state.frameCount > 200) {
          state.wave++;
          setupWave(state.wave);
          state.frameCount = 0; // Reset frame count để đợi một chút trước khi wave mới bắt đầu
          // Thưởng tiền qua màn
          setMoney(m => m + 100);
      }

      // 3. UPDATE & DRAW TOWERS
      // Vẽ bóng cho tháp
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 5;
      state.towers.forEach(tower => {
        tower.update(state.enemies, state.projectiles);
        tower.draw(ctx);
      });
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; // Reset shadow

      // 4. UPDATE & DRAW PROJECTILES
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];
        const result = proj.update();
        proj.draw(ctx);

        if (result && result.status === "KILLED") {
          setMoney(prev => prev + result.reward);
        }
        if (proj.markedForDeletion) state.projectiles.splice(i, 1);
      }

      // 5. UPDATE & DRAW ENEMIES
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        const result = enemy.update();
        enemy.draw(ctx);

        if (result === "ESCAPED") {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
                setGameOver(true);
                state.isPlaying = false;
            }
            return newLives;
          });
        }
        if (enemy.markedForDeletion) state.enemies.splice(i, 1);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // --- HÀM VẼ BẢN ĐỒ ĐẸP HƠN ---
  const drawMapPath = (ctx) => {
    ctx.save();
    ctx.beginPath();
    // Viền đường đi
    ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 50; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.moveTo(PATH[0].x, PATH[0].y);
    PATH.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    // Lòng đường đi
    ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 42;
    ctx.stroke();
    ctx.restore();
  };

  const drawMapDecorations = (ctx) => {
    // Vẽ vài cái cây hoặc đá giả lập (vòng tròn xanh lá/xám)
    ctx.fillStyle = '#27ae60'; // Cây
    [ {x:80, y:250}, {x:300, y:50}, {x:600, y:350} ].forEach(pos => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 30, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x+15, pos.y+10, 20, 0, Math.PI*2); ctx.fill();
    });
  };


  // Xử lý click để xây tháp dựa trên loại đã chọn
  const handleCanvasClick = (e) => {
    if (gameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const towerConfig = TOWER_TYPES[selectedTowerType];

    if (money >= towerConfig.cost) {
        // Kiểm tra trùng lặp vị trí
        const isOverlapping = gameState.current.towers.some(t => Math.hypot(t.x - x, t.y - y) < 45);
        if (!isOverlapping) {
            // Dùng Factory Pattern đơn giản để tạo tháp dựa trên class được lưu trong config
            gameState.current.towers.push(new towerConfig.class(x, y));
            setMoney(prev => prev - towerConfig.cost);
        }
    } else {
        // Hiệu ứng rung lắc UI hoặc thông báo (đơn giản là alert)
        console.log("Not enough money!");
    }
  };

  return (
    <div className="game-container">
      {/* SIDEBAR BÊN TRÁI */}
      <div className="sidebar">
        <h1>Pro Tower Defense</h1>
        <div className="stats-panel">
            <div className="stat">WAVE: <span>{waveInfo}</span></div>
            <div className="stat" style={{color: '#f1c40f'}}>💰: <span>{money}</span></div>
            <div className="stat" style={{color: '#e74c3c'}}>❤️: <span>{lives}</span></div>
        </div>

        <div className="tower-selection">
            <h3>Build Tower:</h3>
            {/* Render các nút chọn tháp động dựa trên TOWER_TYPES */}
            {Object.entries(TOWER_TYPES).map(([typeKey, config]) => (
                <button 
                    key={typeKey}
                    className={`tower-btn ${selectedTowerType === typeKey ? 'active' : ''}`}
                    style={{borderColor: config.color}}
                    onClick={() => setSelectedTowerType(typeKey)}
                >
                    <div className="tower-preview" style={{backgroundColor: config.color}}></div>
                    <span>{config.name} (${config.cost})</span>
                </button>
            ))}
        </div>
      </div>

      {/* KHUNG GAME CHÍNH */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={850} height={600} onClick={handleCanvasClick} />
        {gameOver && (
            <div className="game-over-overlay">
                <h2>GAME OVER</h2>
                <p>You reached Wave {waveInfo}</p>
                <button className="restart-btn" onClick={() => window.location.reload()}>Play Again</button>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;