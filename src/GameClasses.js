// --- CẤU HÌNH CHUNG ---
export const GAME_CONFIG = {
    STARTING_MONEY: 350,
    STARTING_LIVES: 20,
};

// --- ASSET MANAGEMENT (Quản lý hình ảnh) ---
// Để đơn giản, ta sẽ dùng đối tượng này để chứa các hình ảnh đã load
export const ASSETS = {
    // uncomment và điền đường dẫn nếu dùng ảnh thật
    // enemyNormal: new Image(),
    // towerCannon: new Image(),
};

// Hàm helper để load tất cả ảnh trước khi game start (dùng trong App.jsx)
// export const loadAssets = () => {
//     return new Promise((resolve) => {
//          // ASSETS.enemyNormal.src = '/images/enemy1.png';
//          // Logic đợi tất cả ảnh load xong rồi resolve()
//          setTimeout(resolve, 500); // Giả lập loading
//     });
// }


// ==========================================
// LỚP CƠ SỞ (ENTITY)
// ==========================================
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.markedForDeletion = false;
    }
    draw(ctx) { /* abstract */ }
}

// ==========================================
// HỆ THỐNG QUÁI VẬT (ENEMIES)
// ==========================================

// --- Lớp cha Enemy ---
export class Enemy extends Entity {
    constructor(path, stats) {
        super(path[0].x, path[0].y);
        this.path = path;
        this.pathIndex = 0;
        // Các chỉ số sẽ được lớp con truyền vào thông qua 'stats'
        this.speed = stats.speed;
        this.maxHealth = stats.health;
        this.health = stats.health;
        this.radius = stats.radius || 15;
        this.color = stats.color || 'red';
        this.reward = stats.reward || 15;
    }

    update() {
        const target = this.path[this.pathIndex + 1];
        if (!target) {
            this.markedForDeletion = true;
            return "ESCAPED";
        }
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed) {
            this.pathIndex++;
            this.x = target.x;
            this.y = target.y;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        return null;
    }

    draw(ctx) {
        // Vẽ thân quái (Nếu có ASSETS.img thì dùng ctx.drawImage thay thế)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vẽ thanh máu đẹp hơn
        const healthBarWidth = this.radius * 2;
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, healthBarWidth, 6);
        // Màu máu chuyển từ xanh sang đỏ
        const r = 255 * (1 - healthPercent);
        const g = 255 * healthPercent;
        ctx.fillStyle = `rgb(${r},${g},0)`;
        ctx.fillRect(this.x - this.radius + 1, this.y - this.radius - 9, (healthBarWidth -2) * healthPercent, 4);
    }
}

// --- Các loại quái cụ thể (Kế thừa) ---
export class NormalEnemy extends Enemy {
    constructor(path) {
        super(path, { speed: 1.5, health: 100, reward: 20, color: '#e74c3c' }); // Đỏ
    }
}

export class FastEnemy extends Enemy {
    constructor(path) {
        super(path, { speed: 3.0, health: 60, reward: 15, radius: 12, color: '#2ecc71' }); // Xanh lá
    }
}

export class TankEnemy extends Enemy {
    constructor(path) {
        super(path, { speed: 0.8, health: 300, reward: 50, radius: 22, color: '#8e44ad' }); // Tím
    }
}


// ==========================================
// HỆ THỐNG ĐẠN (PROJECTILES)
// ==========================================
export class Projectile extends Entity {
    constructor(x, y, target, stats) {
        super(x, y);
        this.target = target;
        this.speed = stats.speed;
        this.damage = stats.damage;
        this.color = stats.color || 'yellow';
        this.radius = stats.radius || 4;
        // Lưu lịch sử vị trí để vẽ hiệu ứng đuôi
        this.trail = []; 
    }

    update() {
        if (this.target.markedForDeletion || this.target.health <= 0) {
            this.markedForDeletion = true;
            return null;
        }

        // Thêm vị trí hiện tại vào lịch sử trail
        this.trail.push({x: this.x, y: this.y});
        if(this.trail.length > 5) this.trail.shift(); // Giới hạn độ dài đuôi

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed + this.target.radius) {
            this.target.health -= this.damage;
            if (this.target.health <= 0) {
                this.target.markedForDeletion = true;
                return { status: "KILLED", reward: this.target.reward };
            }
            this.markedForDeletion = true;
            return { status: "HIT" };
        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        return null;
    }

    draw(ctx) {
        // Vẽ hiệu ứng đuôi (Trail effect)
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const alpha = (i + 1) / this.trail.length; // Mờ dần về phía sau
            ctx.beginPath();
            ctx.fillStyle = this.color.replace(')', `,${alpha * 0.5})`).replace('rgb', 'rgba');
            ctx.arc(pos.x, pos.y, this.radius * alpha, 0, Math.PI*2);
            ctx.fill();
        }

        // Vẽ đầu đạn
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
    }
}


// ==========================================
// HỆ THỐNG THÁP (TOWERS)
// ==========================================

// --- Lớp cha Tower ---
export class Tower extends Entity {
    constructor(x, y, stats) {
        super(x, y);
        this.range = stats.range;
        this.cooldown = stats.cooldown;
        this.timer = stats.cooldown; // Sẵn sàng bắn ngay khi đặt
        this.cost = stats.cost;
        this.color = stats.color;
        this.projStats = stats.projStats; // Thông số đạn của tháp này
        this.angle = 0; // Góc quay của nòng súng
        this.target = null;
    }

    update(enemies, projectiles) {
        this.timer++;

        // Tìm mục tiêu mới nếu mục tiêu cũ chết hoặc ra khỏi tầm
        if (!this.target || this.target.markedForDeletion || Math.hypot(this.target.x - this.x, this.target.y - this.y) > this.range) {
            this.target = this.findTarget(enemies);
        }

        // Nếu có mục tiêu, xoay nòng súng về phía nó
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);

            // Bắn nếu hồi chiêu xong
            if (this.timer >= this.cooldown) {
                projectiles.push(new Projectile(this.x, this.y, this.target, this.projStats));
                this.timer = 0;
            }
        }
    }

    findTarget(enemies) {
        let nearestEnemy = null;
        let minDist = Infinity;
        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist <= this.range && dist < minDist) {
                minDist = dist;
                nearestEnemy = enemy;
            }
        }
        return nearestEnemy;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. Vẽ đế tháp (cố định)
        ctx.fillStyle = '#555';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -20, 40, 40);
        
        // 2. Vẽ phần thân xoay được (Turret)
        ctx.rotate(this.angle); // Xoay theo góc đã tính toán
        ctx.fillStyle = this.color;
        // Vẽ thân chính
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        // Vẽ nòng súng
        ctx.fillRect(0, -5, 25, 10); 

        ctx.restore();

        // (Optional) Vẽ tầm bắn khi di chuột vào (cần xử lý sự kiện mousemove ở App.jsx để bật tắt flag)
        // ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        // ctx.stroke();
    }
}

// --- Các loại tháp cụ thể (Đa hình) ---

// 1. Tháp Pháo (Cân bằng)
export class CannonTower extends Tower {
    constructor(x, y) {
        super(x, y, {
            range: 150,
            cooldown: 50,
            cost: 100,
            color: '#3498db', // Xanh dương
            projStats: { speed: 6, damage: 40, radius: 6, color: 'rgb(52, 152, 219)' }
        });
        this.type = "CANNON";
    }
}

// 2. Tháp Bắn Tỉa (Tầm xa, dam to, bắn chậm)
export class SniperTower extends Tower {
    constructor(x, y) {
        super(x, y, {
            range: 300,
            cooldown: 120, // 2 giây 1 phát
            cost: 180,
            color: '#f1c40f', // Vàng
            projStats: { speed: 15, damage: 150, radius: 3, color: 'rgb(241, 196, 15)' }
        });
        this.type = "SNIPER";
        
    }
    // Override draw để vẽ nòng súng dài hơn
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#555'; ctx.fillRect(-18, -18, 36, 36); // Đế nhỏ hơn chút
        
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        // Nòng tỉa dài
        ctx.fillRect(0, -3, 35, 6); 
        ctx.restore();
    }
}

// 3. Tháp Súng Máy (Tầm gần, bắn siêu nhanh, dam nhỏ)
export class GatlingTower extends Tower {
    constructor(x, y) {
        super(x, y, {
            range: 100,
            cooldown: 8, // Bắn cực nhanh
            cost: 220,
            color: '#e67e22', // Cam
            projStats: { speed: 8, damage: 15, radius: 2, color: 'rgb(230, 126, 34)' }
        });
        this.type = "GATLING";
    }
    // Override draw để vẽ nhiều nòng
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#555'; ctx.fillRect(-20, -20, 40, 40);
        
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        // 2 nòng súng nhỏ
        ctx.fillRect(5, -8, 20, 4);
        ctx.fillRect(5, 4, 20, 4);
        ctx.restore();
    }
}

// Định nghĩa danh sách các loại tháp để UI sử dụng
export const TOWER_TYPES = {
    CANNON: { class: CannonTower, name: "Cannon", cost: 100, color: '#3498db' },
    SNIPER: { class: SniperTower, name: "Sniper", cost: 180, color: '#f1c40f' },
    GATLING: { class: GatlingTower, name: "Gatling", cost: 220, color: '#e67e22' },
};