const burgerMenu = document.getElementById('burgerMenu');
const mobileMenu = document.getElementById('mobileMenu');

burgerMenu.addEventListener('click', () => {
    burgerMenu.classList.toggle('active');
    mobileMenu.classList.toggle('active');
});

// Close menu when clicking on a link
const mobileMenuLinks = mobileMenu.querySelectorAll('a');
mobileMenuLinks.forEach(link => {
    link.addEventListener('click', () => {
        burgerMenu.classList.remove('active');
        mobileMenu.classList.remove('active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.burger-menu') && !e.target.closest('.mobile-menu')) {
        burgerMenu.classList.remove('active');
        mobileMenu.classList.remove('active');
    }
});

// ============ 3D CANVAS SETUP ============
const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set a base fill so trails accumulate on a consistent background
    ctx.fillStyle = 'rgba(10, 14, 39, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse tracking
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// ============ 3D OBJECT CLASS ============
class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    rotate(angleX, angleY) {
        // Rotate around X axis
        const y = this.y * Math.cos(angleX) - this.z * Math.sin(angleX);
        const z = this.y * Math.sin(angleX) + this.z * Math.cos(angleX);

        // Rotate around Y axis
        const x = this.x * Math.cos(angleY) + z * Math.sin(angleY);
        const z2 = -this.x * Math.sin(angleY) + z * Math.cos(angleY);

        return new Point3D(x, y, z2);
    }
}

class Cube {
    constructor(size) {
        this.size = size;
        this.vertices = [
            new Point3D(-size, -size, -size),
            new Point3D(size, -size, -size),
            new Point3D(size, size, -size),
            new Point3D(-size, size, -size),
            new Point3D(-size, -size, size),
            new Point3D(size, -size, size),
            new Point3D(size, size, size),
            new Point3D(-size, size, size)
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // Back face
            [4, 5], [5, 6], [6, 7], [7, 4], // Front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // Connections between faces
        ];
    }
}

const cube = new Cube(100);

function project(point) {
    const fov = 600;
    const viewerDistance = 400;

    const factor = fov / (viewerDistance + point.z);
    const x = point.x * factor + canvas.width / 2;
    const y = point.y * factor + canvas.height / 2;

    return new Point3D(x, y, point.z);
}

let baseAngleX = 0;
let baseAngleY = 0;
let mouseAngleX = 0;
let mouseAngleY = 0;
let lastFrameTime = 0;

const autoRotationSpeedX = 0.003;
const autoRotationSpeedY = 0.002;

function animate(timestamp = 0) {
    const delta = lastFrameTime ? (timestamp - lastFrameTime) / 16.67 : 1;
    lastFrameTime = timestamp;

    // Fade previous frame slightly to create motion trail
    ctx.fillStyle = 'rgba(10, 14, 39, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mouseInfluence = 0.002;
    const targetAngleX = (mouseY - canvas.height / 2) * mouseInfluence;
    const targetAngleY = (mouseX - canvas.width / 2) * mouseInfluence;

    mouseAngleX += (targetAngleX - mouseAngleX) * 0.05;
    mouseAngleY += (targetAngleY - mouseAngleY) * 0.05;

    baseAngleX += autoRotationSpeedX * delta;
    baseAngleY += autoRotationSpeedY * delta;

    const angleX = baseAngleX + mouseAngleX;
    const angleY = baseAngleY + mouseAngleY;

    const projectedVertices = cube.vertices.map(v => v.rotate(angleX, angleY)).map(project);

    cube.edges.forEach(edge => {
        const p1 = projectedVertices[edge[0]];
        const p2 = projectedVertices[edge[1]];

        // Glow effect
        ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
        ctx.shadowBlur = 10;

        // Gradient color based on depth
        const avgZ = (p1.z + p2.z) / 2;
        const hue = Math.atan2(angleY, angleX) * 180 / Math.PI;

        ctx.strokeStyle = avgZ > 0
            ? `hsl(${hue}, 100%, 50%)`
            : `hsl(${hue}, 100%, 40%)`;

        ctx.lineWidth = avgZ > 0 ? 3 : 1.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    // Draw vertices as glowing points
    projectedVertices.forEach(p => {
        ctx.fillStyle = p.z > 0
            ? 'rgba(0, 255, 136, 0.8)'
            : 'rgba(0, 255, 200, 0.4)';

        ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.z > 0 ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowColor = 'transparent';

    requestAnimationFrame(animate);
}

animate();

// ============ PARTICLE SYSTEM ============
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 80; // Увеличил количество частиц для более насыщенного эффекта

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 3 + 1;
        const duration = Math.random() * 8 + 6; // Замедлил анимацию для более плавного эффекта
        const delay = Math.random() * 5;
        const colors = [
            'rgba(0, 255, 136, 0.6)',
            'rgba(0, 255, 200, 0.5)',
            'rgba(100, 255, 200, 0.4)',
            'rgba(0, 200, 255, 0.5)'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        particle.style.cssText = `
            left: ${x}%;
            top: ${y}%;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, ${randomColor}, transparent);
            border-radius: 50%;
            box-shadow: 0 0 ${size * 3}px ${randomColor};
            animation: float ${duration}s ${delay}s infinite ease-in-out;
            will-change: transform, opacity;
        `;

        container.appendChild(particle);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% {
                transform: translateY(0) translateX(0) scale(1);
                opacity: 0;
            }
            5% {
                opacity: 1;
            }
            50% {
                transform: translateY(-150px) translateX(80px) scale(0.8);
                opacity: 0.8;
            }
            95% {
                opacity: 1;
            }
            100% {
                transform: translateY(-300px) translateX(-100px) scale(0.3);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

createParticles();

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
