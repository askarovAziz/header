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

    // Clear any previous drawing so the hero gradient shows through
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

let viewerDistance = 400;

function project(point) {
    const fov = 600;

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

const trailHistory = [];
const trailLength = 14; // Increased trail for a stronger motion-blur effect

const autoRotationSpeedX = 0.003;
const autoRotationSpeedY = 0.002;

const minZoom = 150;
const maxZoom = 900;
const zoomStep = 40;

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    viewerDistance = Math.min(
        maxZoom,
        Math.max(minZoom, viewerDistance + Math.sign(event.deltaY) * zoomStep)
    );
}, { passive: false });

function animate(timestamp = 0) {
    const delta = lastFrameTime ? (timestamp - lastFrameTime) / 16.67 : 1;
    lastFrameTime = timestamp;

    const mouseInfluence = 0.002;
    const targetAngleX = (mouseY - canvas.height / 2) * mouseInfluence;
    const targetAngleY = (mouseX - canvas.width / 2) * mouseInfluence;

    mouseAngleX += (targetAngleX - mouseAngleX) * 0.05;
    mouseAngleY += (targetAngleY - mouseAngleY) * 0.05;

    baseAngleX += autoRotationSpeedX * delta;
    baseAngleY += autoRotationSpeedY * delta;

    const angleX = baseAngleX + mouseAngleX;
    const angleY = baseAngleY + mouseAngleY;

    // Clear previous frame so the cube renders without a background overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const projectedVertices = cube.vertices.map(v => v.rotate(angleX, angleY)).map(project);
    const hue = Math.atan2(angleY, angleX) * 180 / Math.PI;

    // Keep a short history of frames to draw motion trails
    trailHistory.unshift({
        vertices: projectedVertices.map(v => ({ ...v })),
        hue
    });

    if (trailHistory.length > trailLength) {
        trailHistory.pop();
    }

    // Draw from the oldest frame to the newest for layered blur
    for (let i = trailHistory.length - 1; i >= 0; i--) {
        const { vertices, hue: frameHue } = trailHistory[i];
        const fade = 1 - i / trailLength;
        const opacity = 0.12 + fade * 0.32; // higher opacity to emphasize the trail
        const blurIntensity = 14 * fade; // stronger blur for deeper motion smearing

        cube.edges.forEach(edge => {
            const p1 = vertices[edge[0]];
            const p2 = vertices[edge[1]];

            const avgZ = (p1.z + p2.z) / 2;
            const lightness = avgZ > 0 ? 50 : 40;

            ctx.shadowColor = `hsla(${frameHue}, 100%, 70%, ${opacity * 0.6})`;
            ctx.shadowBlur = blurIntensity;

            const frontThickness = 5.5;
            const backThickness = 3.5;

            ctx.strokeStyle = `hsla(${frameHue}, 100%, ${lightness}%, ${opacity})`;
            ctx.lineWidth = (avgZ > 0 ? frontThickness : backThickness) * (1 + fade * 0.7);
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });

        // Draw vertices with diminishing intensity for the trail
        vertices.forEach(p => {
            const pointOpacity = opacity * 0.7;
            const radius = (p.z > 0 ? 6 : 3) * (0.5 + fade * 0.6);

            ctx.fillStyle = p.z > 0
                ? `rgba(0, 255, 136, ${pointOpacity})`
                : `rgba(0, 255, 200, ${pointOpacity * 0.7})`;

            ctx.shadowColor = `rgba(0, 255, 136, ${pointOpacity})`;
            ctx.shadowBlur = blurIntensity * 1.2;

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

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
