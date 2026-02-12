import * as THREE from 'three';

// --- 1. SETUP ---
const scene = new THREE.Scene();
const cameraThree = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const particleCount = 8000;
const geometry = new THREE.BufferGeometry();
const posArray = new Float32Array(particleCount * 3);
const targetArray = new Float32Array(particleCount * 3);
const colorArray = new Float32Array(particleCount * 3);

function updateColor(i, r, g, b) {
    colorArray[i*3] = r; colorArray[i*3+1] = g; colorArray[i*3+2] = b;
}

// Initial Scatter state
function scatter() {
    for (let i = 0; i < particleCount * 3; i++) {
        targetArray[i] = (Math.random() - 0.5) * 25;
        colorArray[i] = Math.random();
    }
}
scatter();

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, blending: THREE.AdditiveBlending });
const particles = new THREE.Points(geometry, material);
scene.add(particles);
cameraThree.position.z = 12;

// --- 2. GESTURE SHAPES ---
function createHeart() {
    for (let i = 0; i < particleCount; i++) {
        const t = Math.random() * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
        targetArray[i*3] = x * 0.25; targetArray[i*3+1] = y * 0.25; targetArray[i*3+2] = (Math.random()-0.5);
        updateColor(i, 1, 0, 0.4);
    }
}

function createCircle() {
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + (Math.random() - 0.5) * 0.5;
        targetArray[i*3] = Math.cos(angle) * radius;
        targetArray[i*3+1] = Math.sin(angle) * radius;
        targetArray[i*3+2] = (Math.random() - 0.5) * 2;
        updateColor(i, 0.4, 0, 1); // Purple
    }
}

function createText(msg) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400; canvas.height = 100;
    ctx.fillStyle = 'white'; ctx.font = 'bold 60px Arial'; ctx.textAlign = 'center';
    ctx.fillText(msg, 200, 60);
    const data = ctx.getImageData(0,0,400,100).data;
    const pts = [];
    for(let y=0; y<100; y+=2) for(let x=0; x<400; x+=2) if(data[(y*400+x)*4] > 128) pts.push({x: (x-200)*0.05, y: -(y-50)*0.05});
    for(let i=0; i<particleCount; i++) {
        const p = pts[i % pts.length] || {x:0, y:0};
        targetArray[i*3] = p.x; targetArray[i*3+1] = p.y; targetArray[i*3+2] = (Math.random()-0.5);
        updateColor(i, 0, 1, 1);
    }
}

// --- 3. AI TRACKING ---
const videoElement = document.getElementById('input_video');
const label = document.getElementById('label');

function startCamera() {
    label.innerText = "Loading REYU AI...";
    const hands = new window.Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5 });

    hands.onResults((res) => {
        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            const marks = res.multiHandLandmarks[0];
            
            const isPinch = Math.hypot(marks[8].x - marks[4].x, marks[8].y - marks[4].y) < 0.05;
            const isPeace = marks[8].y < marks[6].y && marks[12].y < marks[10].y && marks[16].y > marks[14].y;
            const isFist = marks[8].y > marks[6].y && marks[12].y > marks[10].y && marks[16].y > marks[14].y;
            // Wave detection: Thumb and Pinky out, others in
            const isWave = marks[4].x < marks[3].x && marks[20].x > marks[19].x && marks[8].y > marks[6].y;

            if (isFist) scatter();
            else if (isWave) createCircle();
            else if (isPinch) createHeart();
            else if (isPeace) createText("I LOVE YOU ");
            
            label.innerText = "Gesture Detected!";
        }
    });

    const cam = new window.Camera(videoElement, {
        onFrame: async () => { await hands.send({image: videoElement}); },
        width: 480, height: 360
    });
    cam.start();
}

window.addEventListener('click', () => {
    if(label.innerText.includes("TAP")) startCamera();
}, { once: true });

// --- 4. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    for (let i = 0; i < particleCount * 3; i++) {
        pos[i] += (targetArray[i] - pos[i]) * 0.1;
        col[i] += (colorArray[i] - col[i]) * 0.1;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, cameraThree);
}
animate();

window.addEventListener('resize', () => {
    cameraThree.aspect = window.innerWidth / window.innerHeight;
    cameraThree.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});