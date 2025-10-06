// 3D Weather Globe using Three.js
class WeatherGlobe {
    constructor(containerId) {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.weatherData = [];
        this.markers = [];
        this.animationId = null;
        
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create Three.js scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 2.5;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        container.appendChild(this.renderer.domElement);

        // Add lighting
        this.setupLighting();
        
        // Create globe
        this.createGlobe();
        
        // Add weather markers
        this.createWeatherMarkers();
        
        // Add auto-rotation
        this.autoRotate = true;
        
        // Handle window resize
        this.setupResizeHandler();
        
        // Start animation
        this.animate();
        
        // Add mouse controls
        this.setupInteractivity();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Point light for glow effect
        const pointLight = new THREE.PointLight(0x4fc3f7, 1, 100);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);
    }

    createGlobe() {
        // Create sphere geometry
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Load texture for Earth
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
        const earthBumpMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
        const earthSpecularMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');

        // Create material
        const material = new THREE.MeshPhongMaterial({
            map: earthTexture,
            bumpMap: earthBumpMap,
            bumpScale: 0.05,
            specularMap: earthSpecularMap,
            specular: new THREE.Color(0x333333),
            shininess: 5
        });

        // Create globe mesh
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);

        // Add atmosphere effect
        this.createAtmosphere();
        
        // Add cloud layer
        this.createCloudLayer();
    }

    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
    }

    createCloudLayer() {
        const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 64);
        const cloudTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.jpg');
        
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.4
        });

        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.scene.add(this.clouds);
    }

    createWeatherMarkers() {
        // Sample weather data for major cities
        this.weatherData = [
            { city: "New York", lat: 40.7128, lon: -74.0060, temp: 22, condition: "Sunny" },
            { city: "London", lat: 51.5074, lon: -0.1278, temp: 15, condition: "Cloudy" },
            { city: "Tokyo", lat: 35.6762, lon: 139.6503, temp: 18, condition: "Rainy" },
            { city: "Sydney", lat: -33.8688, lon: 151.2093, temp: 25, condition: "Sunny" },
            { city: "Dubai", lat: 25.2048, lon: 55.2708, temp: 35, condition: "Sunny" },
            { city: "Moscow", lat: 55.7558, lon: 37.6173, temp: 5, condition: "Snowy" }
        ];

        this.weatherData.forEach(data => {
            this.addWeatherMarker(data);
        });
    }

    addWeatherMarker(weatherData) {
        const { lat, lon, temp, condition } = weatherData;
        
        // Convert lat/lon to 3D position
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        
        const x = -(1.1 * Math.sin(phi) * Math.cos(theta));
        const y = (1.1 * Math.cos(phi));
        const z = (1.1 * Math.sin(phi) * Math.sin(theta));

        // Create marker based on weather condition
        let marker;
        let color;

        switch(condition.toLowerCase()) {
            case 'sunny':
                color = 0xffeb3b; // Yellow
                marker = this.createSunMarker(x, y, z, color);
                break;
            case 'cloudy':
                color = 0x9e9e9e; // Gray
                marker = this.createCloudMarker(x, y, z, color);
                break;
            case 'rainy':
                color = 0x2196f3; // Blue
                marker = this.createRainMarker(x, y, z, color);
                break;
            case 'stormy':
                color = 0x9c27b0; // Purple
                marker = this.createStormMarker(x, y, z, color);
                break;
            case 'snowy':
                color = 0xe3f2fd; // Light Blue
                marker = this.createSnowMarker(x, y, z, color);
                break;
            default:
                color = 0x4caf50; // Green
                marker = this.createDefaultMarker(x, y, z, color);
        }

        // Add temperature label
        this.addTemperatureLabel(x, y, z, temp, color);

        this.markers.push(marker);
        this.scene.add(marker);
    }

    createSunMarker(x, y, z, color) {
        const geometry = new THREE.SphereGeometry(0.03, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);
        
        // Add glow effect
        this.addGlowEffect(marker, color);
        
        return marker;
    }

    createCloudMarker(x, y, z, color) {
        const group = new THREE.Group();
        
        // Create cloud-like shape using multiple spheres
        const cloudGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const cloudMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });

        const positions = [
            [0, 0, 0],
            [0.015, 0.01, 0],
            [-0.015, 0.01, 0],
            [0.01, -0.01, 0],
            [-0.01, -0.01, 0]
        ];

        positions.forEach(pos => {
            const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloudPart.position.set(pos[0], pos[1], pos[2]);
            group.add(cloudPart);
        });

        group.position.set(x, y, z);
        return group;
    }

    createRainMarker(x, y, z, color) {
        const group = new THREE.Group();
        
        // Create raindrop shape
        const raindropGeometry = new THREE.ConeGeometry(0.01, 0.05, 8);
        const raindropMaterial = new THREE.MeshBasicMaterial({ color: color });
        
        const raindrop = new THREE.Mesh(raindropGeometry, raindropMaterial);
        raindrop.rotation.x = Math.PI;
        
        group.add(raindrop);
        group.position.set(x, y, z);
        
        // Add animation
        this.animateRaindrop(group);
        
        return group;
    }

    createStormMarker(x, y, z, color) {
        const group = new THREE.Group();
        
        // Lightning bolt
        const lightningGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0.03, 0,
            -0.01, 0.01, 0,
            0.01, -0.01, 0,
            -0.01, -0.03, 0,
            0.01, -0.05, 0
        ]);
        
        lightningGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const lightningMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.7
        });
        
        const lightning = new THREE.Line(lightningGeometry, lightningMaterial);
        group.add(lightning);
        group.position.set(x, y, z);
        
        // Add flashing animation
        this.animateLightning(group);
        
        return group;
    }

    createSnowMarker(x, y, z, color) {
        const geometry = new THREE.SphereGeometry(0.025, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.9
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);
        
        // Add gentle floating animation
        this.animateSnowflake(marker);
        
        return marker;
    }

    createDefaultMarker(x, y, z, color) {
        const geometry = new THREE.SphereGeometry(0.02, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: color });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);
        
        return marker;
    }

    addGlowEffect(marker, color) {
        const glowGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                "c": { value: 0.1 },
                "p": { value: 2.0 },
                glowColor: { value: new THREE.Color(color) },
                viewVector: { value: this.camera.position }
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normalMatrix * normal);
                    vec3 vNormel = normalize(normalMatrix * viewVector);
                    intensity = pow(c - dot(vNormal, vNormel), p);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying float intensity;
                void main() {
                    vec3 glow = glowColor * intensity;
                    gl_FragColor = vec4(glow, 1.0);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.multiplyScalar(1.2);
        marker.add(glow);
    }

    addTemperatureLabel(x, y, z, temp, color) {
        // Create a simple text sprite (in a real implementation, you'd use Three.js text geometry)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 32;
        
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`${temp}°`, 32, 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.set(x, y + 0.08, z);
        sprite.scale.set(0.1, 0.05, 1);
        
        this.scene.add(sprite);
    }

    animateRaindrop(group) {
        const originalY = group.position.y;
        let time = 0;
        
        const animate = () => {
            time += 0.1;
            group.position.y = originalY + Math.sin(time) * 0.02;
            group.rotation.z = Math.sin(time) * 0.1;
        };
        
        group.userData.animation = animate;
    }

    animateLightning(group) {
        let flashState = true;
        let flashCount = 0;
        
        const animate = () => {
            if (flashCount % 30 === 0) {
                group.visible = flashState;
                flashState = !flashState;
            }
            flashCount++;
        };
        
        group.userData.animation = animate;
    }

    animateSnowflake(marker) {
        const originalY = marker.position.y;
        let time = 0;
        
        const animate = () => {
            time += 0.05;
            marker.position.y = originalY + Math.sin(time) * 0.01;
            marker.rotation.y += 0.02;
        };
        
        marker.userData.animation = animate;
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            const container = document.getElementById(this.containerId);
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }

    setupInteractivity() {
        const canvas = this.renderer.domElement;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };

            if (this.globe) {
                this.globe.rotation.y += deltaMove.x * 0.01;
                this.globe.rotation.x += deltaMove.y * 0.01;
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.position.z += e.deltaY * 0.01;
            this.camera.position.z = Math.max(1.5, Math.min(5, this.camera.position.z));
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Auto-rotate globe
        if (this.autoRotate && this.globe) {
            this.globe.rotation.y += 0.001;
        }

        // Rotate clouds
        if (this.clouds) {
            this.clouds.rotation.y += 0.0005;
        }

        // Animate markers
        this.markers.forEach(marker => {
            if (marker.userData.animation) {
                marker.userData.animation();
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    updateWeatherData(weatherData) {
        // Clear existing markers
        this.markers.forEach(marker => {
            this.scene.remove(marker);
        });
        this.markers = [];

        // Add current city as a highlighted marker
        if (weatherData && weatherData.city) {
            const cityData = {
                city: weatherData.city,
                lat: weatherData.lat || 40.7128,
                lon: weatherData.lon || -74.0060,
                temp: weatherData.temperature || 20,
                condition: weatherData.condition || 'Sunny'
            };
            
            this.addWeatherMarker(cityData);
            
            // Highlight this marker
            const marker = this.markers[this.markers.length - 1];
            this.highlightMarker(marker);
        }
    }

    highlightMarker(marker) {
        // Scale up the marker
        marker.scale.set(1.5, 1.5, 1.5);
        
        // Add pulsing animation
        let scale = 1.5;
        let growing = false;
        
        const pulse = () => {
            if (growing) {
                scale += 0.01;
                if (scale >= 1.7) growing = false;
            } else {
                scale -= 0.01;
                if (scale <= 1.3) growing = true;
            }
            
            marker.scale.set(scale, scale, scale);
        };
        
        marker.userData.pulseAnimation = pulse;
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize globe when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the container to be fully rendered
    setTimeout(() => {
        try {
            window.weatherGlobe = new WeatherGlobe('globe-container');
        } catch (error) {
            console.error('Failed to initialize weather globe:', error);
            // Fallback: Show a static image or message
            const container = document.getElementById('globe-container');
            if (container) {
                container.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl">
                        <div class="text-center">
                            <p class="text-gray-400 mb-2">3D Weather Globe</p>
                            <p class="text-gray-500 text-sm">Interactive globe visualization</p>
                        </div>
                    </div>
                `;
            }
        }
    }, 1000);
});