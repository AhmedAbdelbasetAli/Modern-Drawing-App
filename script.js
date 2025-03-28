class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.layers = [];
        this.currentLayerIndex = 0;
        this.brushType = 'round';
        this.isDrawing = false;
        this.history = [];
        this.step = -1;

        this.init();
    }

    init() {
        // Canvas Setup
        this.setCanvasSize();
        this.createNewLayer();
        this.setupEventListeners();
        this.setupPressure();
    }

    setCanvasSize() {
        this.canvas.width = window.innerWidth * 0.7;
        this.canvas.height = window.innerHeight * 0.8;
    }

    createNewLayer() {
        const layer = {
            canvas: document.createElement('canvas'),
            history: [],
            step: -1,
            visible: true
        };
        
        layer.canvas.width = this.canvas.width;
        layer.canvas.height = this.canvas.height;
        this.layers.push(layer);
        this.updateLayerList();
    }

    get currentLayer() {
        return this.layers[this.currentLayerIndex];
    }

    setupEventListeners() {
        // Brush Events
        document.querySelectorAll('[data-brush]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-brush]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brushType = btn.dataset.brush;
                if(this.brushType === 'eraser') this.ctx.globalCompositeOperation = 'destination-out';
                else this.ctx.globalCompositeOperation = 'source-over';
            });
        });

        // Drawing Events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.endDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.endDrawing.bind(this));

        // Tools
        document.getElementById('brushSize').addEventListener('input', this.updateBrushSize.bind(this));
        document.getElementById('newLayer').addEventListener('click', () => this.createNewLayer());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveImage());
    }

    setupPressure() {
        if (window.Pressure) {
            Pressure.set('#mainCanvas', {
                change: (force) => {
                    this.currentPressure = force * 2;
                },
                end: () => {
                    this.currentPressure = 1;
                }
            });
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = this.getPosition(e);
        this.ctx.beginPath();
        this.saveState();
    }

    draw(e) {
        if (!this.isDrawing) return;

        const [x, y] = this.getPosition(e);
        const brushSize = document.getElementById('brushSize').value;
        const pressureSize = brushSize * (this.currentPressure || 1);

        this.ctx.strokeStyle = document.getElementById('colorPicker').value;
        this.ctx.lineWidth = pressureSize;

        switch(this.brushType) {
            case 'round':
                this.drawRound(x, y);
                break;
            case 'square':
                this.drawSquare(x, y);
                break;
            case 'spray':
                this.drawSpray(x, y, pressureSize);
                break;
            case 'eraser':
                this.drawEraser(x, y, pressureSize);
                break;
        }

        this.lastX = x;
        this.lastY = y;
    }

    drawRound(x, y) {
        this.ctx.lineCap = 'round';
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    drawSquare(x, y) {
        const size = this.ctx.lineWidth;
        this.ctx.fillRect(x - size/2, y - size/2, size, size);
    }

    drawSpray(x, y, density) {
        const particles = density * 2;
        for(let i = 0; i < particles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * density;
            this.ctx.fillRect(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                1, 1
            );
        }
    }

    drawEraser(x, y, size) {
        this.ctx.clearRect(x - size/2, y - size/2, size, size);
    }

    endDrawing() {
        this.isDrawing = false;
        this.ctx.closePath();
    }

    saveState() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.currentLayer.history = this.currentLayer.history.slice(0, this.currentLayer.step + 1);
        this.currentLayer.history.push(imageData);
        this.currentLayer.step++;
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'drawing.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    updateLayerList() {
        const layerList = document.getElementById('layerList');
        layerList.innerHTML = this.layers.map((layer, index) => `
            <div class="layer-item ${index === this.currentLayerIndex ? 'active' : ''}">
                <span>Layer ${index + 1}</span>
                <button onclick="app.toggleLayer(${index})">👁️</button>
                <button onclick="app.deleteLayer(${index})">🗑️</button>
            </div>
        `).join('');
    }

    // Additional methods for layer management
    toggleLayer(index) {
        this.layers[index].visible = !this.layers[index].visible;
        this.updateLayerList();
        this.redrawCanvas();
    }

    deleteLayer(index) {
        if(this.layers.length === 1) return;
        this.layers.splice(index, 1);
        if(this.currentLayerIndex >= index) this.currentLayerIndex--;
        this.updateLayerList();
        this.redrawCanvas();
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.layers.forEach(layer => {
            if(layer.visible) {
                this.ctx.drawImage(layer.canvas, 0, 0);
            }
        });
    }

    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    updateBrushSize(e) {
        document.getElementById('brushSizeValue').textContent = e.target.value;
    }
}

// Initialize the app
const app = new DrawingApp();
