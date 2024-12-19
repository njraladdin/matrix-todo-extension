class MatrixBackground {
    constructor() {
        this.canvas = document.getElementById('matrix-bg');
        this.ctx = this.canvas.getContext('2d');
        this.matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
        this.drops = [];
        this.xPositions = [];
        this.fontSize = 14;
        this.dropDelays = [];

        this.setupCanvas();
        this.initDrops();
        this.startAnimation();

        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initDrops();
    }

    initDrops() {
        const numColumns = Math.ceil(this.canvas.width/(this.fontSize * 20));
        this.drops = Array(numColumns).fill(0);
        
        this.xPositions = Array(numColumns).fill(0).map(() => 
            Math.random() * (this.canvas.width - this.fontSize)
        );

        this.dropDelays = Array(numColumns).fill(0).map(() => 
            Math.floor(Math.random() * 100)
        );

        this.drops = this.drops.map(() => 
            Math.floor(Math.random() * this.canvas.height / this.fontSize)
        );
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#0F0';
        this.ctx.font = this.fontSize + 'px monospace';
        
        for(let i = 0; i < this.drops.length; i++) {
            if (this.dropDelays[i] === 0 && Math.random() > 0.5) {
                const text = this.matrix[Math.floor(Math.random()*this.matrix.length)];
                this.ctx.fillText(text, this.xPositions[i], this.drops[i]*this.fontSize);
            }
            
            if (this.dropDelays[i] > 0) {
                this.dropDelays[i]--;
            }
            
            if(this.drops[i]*this.fontSize > this.canvas.height && Math.random() > 0.98) {
                this.drops[i] = 0;
                this.dropDelays[i] = Math.floor(Math.random() * 150);
            }
            
            this.drops[i]++;
        }
    }

    startAnimation() {
        setInterval(() => this.draw(), 65);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MatrixBackground();
}); 