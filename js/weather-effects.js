// Weather visual and sound effects
class WeatherEffects {
    constructor() {
        this.currentEffect = null;
        this.particleSystem = null;
        this.ambientSound = null;
        this.initParticleSystem();
    }

    initParticleSystem() {
        const canvas = document.getElementById('particle-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
        
        this.particleSystem = new ParticleSystem(canvas, ctx);
    }

    changeWeatherEffect(condition) {
        // Clear previous effects
        this.clearEffects();
        
        const background = document.getElementById('weather-background');
        
        // Remove all weather classes
        background.className = 'fixed inset-0 -z-10 transition-all duration-1000';
        
        // Apply new effect based on condition
        switch(condition.toLowerCase()) {
            case 'sunny':
                this.applySunnyEffect(background);
                break;
            case 'cloudy':
                this.applyCloudyEffect(background);
                break;
            case 'rainy':
                this.applyRainyEffect(background);
                break;
            case 'stormy':
                this.applyStormyEffect(background);
                break;
            case 'snowy':
                this.applySnowyEffect(background);
                break;
            default:
                this.applySunnyEffect(background);
        }
        
        // Update particle system
        this.particleSystem.changeWeather(condition.toLowerCase());
        
        // Update ambient sound if enabled
        if (window.skyPulseApp && window.skyPulseApp.soundEnabled) {
            this.playAmbientSound(condition);
        }
    }

    applySunnyEffect(background) {
        background.classList.add('weather-bg-sunny');
        this.createSunElement();
    }

    applyCloudyEffect(background) {
        background.classList.add('weather-bg-cloudy');
        this.createCloudElements();
    }

    applyRainyEffect(background) {
        background.classList.add('weather-bg-rainy');
        this.createRainElements();
    }

    applyStormyEffect(background) {
        background.classList.add('weather-bg-stormy');
        this.createLightningEffect();
        this.createRainElements();
    }

    applySnowyEffect(background) {
        background.classList.add('weather-bg-snowy');
        this.createSnowElements();
    }

    createSunElement() {
        const sun = document.createElement('div');
        sun.className = 'fixed top-10 right-10 w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50 float';
        sun.style.zIndex = '-1';
        document.body.appendChild(sun);
        this.currentEffect = sun;
    }

    createCloudElements() {
        const cloudsContainer = document.createElement('div');
        cloudsContainer.className = 'fixed inset-0 -z-1';
        
        for (let i = 0; i < 5; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'absolute w-40 h-20 bg-white/20 rounded-full blur-xl';
            cloud.style.top = `${20 + i * 15}%`;
            cloud.style.left = `${i * 20}%`;
            cloud.style.animation = `float ${15 + i * 5}s ease-in-out infinite`;
            cloudsContainer.appendChild(cloud);
        }
        
        document.body.appendChild(cloudsContainer);
        this.currentEffect = cloudsContainer;
    }

    createRainElements() {
        const rainContainer = document.createElement('div');
        rainContainer.className = 'rain';
        
        for (let i = 0; i < 100; i++) {
            const raindrop = document.createElement('div');
            raindrop.className = 'raindrop';
            raindrop.style.left = `${Math.random() * 100}%`;
            raindrop.style.animationDuration = `${0.5 + Math.random() * 1}s`;
            raindrop.style.animationDelay = `${Math.random() * 2}s`;
            rainContainer.appendChild(raindrop);
        }
        
        document.body.appendChild(rainContainer);
        this.currentEffect = rainContainer;
    }

    createSnowElements() {
        const snowContainer = document.createElement('div');
        snowContainer.className = 'snow';
        
        for (let i = 0; i < 100; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.style.left = `${Math.random() * 100}%`;
            snowflake.style.width = `${5 + Math.random() * 5}px`;
            snowflake.style.height = snowflake.style.width;
            snowflake.style.animationDuration = `${5 + Math.random() * 10}s`;
            snowflake.style.animationDelay = `${Math.random() * 5}s`;
            snowContainer.appendChild(snowflake);
        }
        
        document.body.appendChild(snowContainer);
        this.currentEffect = snowContainer;
    }

    createLightningEffect() {
        const lightning = document.createElement('div');
        lightning.className = 'fixed inset-0 bg-white lightning';
        lightning.style.zIndex = '-1';
        lightning.style.opacity = '0';
        
        document.body.appendChild(lightning);
        
        // Random lightning flashes
        const flash = () => {
            lightning.style.opacity = '0.7';
            setTimeout(() => {
                lightning.style.opacity = '0';
                setTimeout(flash, Math.random() * 5000 + 2000);
            }, 100);
        };
        
        flash();
        this.currentEffect = lightning;
    }

    clearEffects() {
        if (this.currentEffect) {
            this.currentEffect.remove();
            this.currentEffect = null;
        }
    }

    playAmbientSound(condition) {
        this.stopAmbientSound();
        
        // In a real implementation, this would play actual sound files
        // For this demo, we'll just log the intended action
        console.log(`Playing ${condition} ambient sounds`);
        
        // Example of how you would implement Web Audio API for sounds
        /*
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create and play appropriate sound based on condition
        switch(condition.toLowerCase()) {
            case 'rainy':
            case 'stormy':
                this.playRainSound();
                break;
            case 'windy':
                this.playWindSound();
                break;
            // ... other cases
        }
        */
    }

    stopAmbientSound() {
        // Stop any playing sounds
        if (this.ambientSound) {
            this.ambientSound.stop();
            this.ambientSound = null;
        }
    }
}

// Particle System for background effects
class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.weatherType = 'sunny';
        this.init();
    }

    init() {
        this.createParticles();
        this.animate();
    }

    createParticles() {
        this.particles = [];
        const particleCount = this.weatherType === 'snowy' ? 150 : 
                            this.weatherType === 'rainy' ? 200 : 50;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        const types = {
            sunny: { color: '255, 215, 0', size: 2, speed: 0.5 },
            cloudy: { color: '200, 200, 200', size: 3, speed: 0.3 },
            rainy: { color: '100, 149, 237', size: 2, speed: 5 },
            stormy: { color: '50, 50, 100', size: 2, speed: 8 },
            snowy: { color: '255, 255, 255', size: 4, speed: 2 }
        };
        
        const config = types[this.weatherType] || types.sunny;
        
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * config.size + 1,
            speedX: (Math.random() - 0.5) * config.speed,
            speedY: (Math.random() - 0.5) * config.speed,
            color: `rgba(${config.color}, ${Math.random() * 0.5 + 0.2})`,
            weather: this.weatherType
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Update position based on weather type
            if (p.weather === 'rainy' || p.weather === 'stormy') {
                p.speedY = Math.abs(p.speedY); // Always fall down
                p.x += p.speedX;
                p.y += p.speedY;
                
                // Reset if out of bounds
                if (p.y > this.canvas.height) {
                    p.y = 0;
                    p.x = Math.random() * this.canvas.width;
                }
            } else if (p.weather === 'snowy') {
                p.x += p.speedX;
                p.y += Math.abs(p.speedY);
                
                // Reset if out of bounds
                if (p.y > this.canvas.height) {
                    p.y = 0;
                    p.x = Math.random() * this.canvas.width;
                }
            } else {
                p.x += p.speedX;
                p.y += p.speedY;
                
                // Bounce off edges
                if (p.x > this.canvas.width || p.x < 0) p.speedX *= -1;
                if (p.y > this.canvas.height || p.y < 0) p.speedY *= -1;
            }
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        }
        
        requestAnimationFrame(() => this.animate());
    }

    changeWeather(weatherType) {
        this.weatherType = weatherType;
        this.createParticles();
    }
}