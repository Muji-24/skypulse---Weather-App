// Main application logic
class SkyPulseApp {
    constructor() {
        this.currentWeather = null;
        this.weatherEffects = new WeatherEffects();
        this.soundEnabled = false;
        this.audioContext = null;
        this.searchHistory = JSON.parse(localStorage.getItem('skyPulseSearchHistory')) || [];
        this.init();
    }

    init() {
        // Initialize the application
        this.setupEventListeners();
        this.loadDefaultWeather();
        this.initializeGlobe();
        this.updateDateTime();
        this.setupSearchSuggestions();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
        
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Real-time search suggestions
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchSuggestions();
            }
        });

        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());

        // Add hover effects to cards
        this.addHoverEffects();
    }

    handleSearch() {
        const searchInput = document.getElementById('search-input');
        const city = searchInput.value.trim();
        
        if (!city) {
            this.showSearchError('Please enter a city name');
            return;
        }

        this.performSearch(city);
    }

    async performSearch(city) {
        const searchInput = document.getElementById('search-input');
        
        try {
            // Show loading state
            this.setSearchLoading(true);
            
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch weather data');
            }
            
            if (result.success) {
                // Transform API data to our app format
                const transformedData = this.transformAPIData(result.data);
                this.updateWeatherDisplay(transformedData);
                this.weatherEffects.changeWeatherEffect(transformedData.condition);
                
                // Update globe
                if (window.weatherGlobe) {
                    window.weatherGlobe.updateWeatherData(transformedData);
                }
                
                // Add to search history
                this.addToSearchHistory(city);
                
                // Show success
                this.showSearchSuccess();
                
                // Hide suggestions
                this.hideSearchSuggestions();
                
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showSearchError('City not found. Please try again.');
            
            // Fallback to mock data
            const mockWeatherData = this.generateMockWeatherData(city);
            this.updateWeatherDisplay(mockWeatherData);
            this.weatherEffects.changeWeatherEffect(mockWeatherData.condition);
            
        } finally {
            this.setSearchLoading(false);
        }
    }

    handleSearchInput(query) {
        if (query.length < 2) {
            this.hideSearchSuggestions();
            return;
        }

        const suggestions = this.getSearchSuggestions(query);
        this.showSearchSuggestions(suggestions);
    }

    getSearchSuggestions(query) {
        const popularCities = [
            'New York', 'London', 'Tokyo', 'Paris', 'Sydney',
            'Berlin', 'Mumbai', 'Moscow', 'Dubai', 'Singapore',
            'Toronto', 'Los Angeles', 'Chicago', 'Miami', 'Seattle',
            'Beijing', 'Shanghai', 'Hong Kong', 'Seoul', 'Bangkok',
            'Rome', 'Madrid', 'Amsterdam', 'Vienna', 'Prague'
        ];

        // Filter cities that match the query
        const matchedCities = popularCities.filter(city => 
            city.toLowerCase().includes(query.toLowerCase())
        );

        // Add recent searches that match
        const recentMatches = this.searchHistory.filter(history => 
            history.toLowerCase().includes(query.toLowerCase()) && 
            !matchedCities.includes(history)
        );

        return [...matchedCities, ...recentMatches].slice(0, 8); // Limit to 8 suggestions
    }

    showSearchSuggestions(suggestions) {
        this.hideSearchSuggestions();

        if (suggestions.length === 0) return;

        const searchContainer = document.querySelector('.search-container');
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'search-suggestions absolute top-full left-0 right-0 mt-2 bg-gray-800/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden';
        
        suggestions.forEach((suggestion, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = `suggestion-item p-3 border-b border-gray-700/50 cursor-pointer transition-all duration-200 hover:bg-cyan-500/20 ${index === suggestions.length - 1 ? 'border-b-0' : ''}`;
            suggestionItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas fa-search text-cyan-400 text-sm"></i>
                    <span class="text-white">${suggestion}</span>
                </div>
            `;
            
            suggestionItem.addEventListener('click', () => {
                document.getElementById('search-input').value = suggestion;
                this.performSearch(suggestion);
            });
            
            suggestionsDiv.appendChild(suggestionItem);
        });

        searchContainer.appendChild(suggestionsDiv);
    }

    hideSearchSuggestions() {
        const existingSuggestions = document.querySelector('.search-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }
    }

    setupSearchSuggestions() {
        // Add search container class to the search element's parent
        const searchInput = document.getElementById('search-input');
        searchInput.parentElement.classList.add('search-container', 'relative');
    }

    setSearchLoading(isLoading) {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (isLoading) {
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            searchBtn.disabled = true;
            searchInput.disabled = true;
            searchInput.classList.add('animate-pulse');
        } else {
            searchBtn.innerHTML = '<i class="fas fa-search"></i>';
            searchBtn.disabled = false;
            searchInput.disabled = false;
            searchInput.classList.remove('animate-pulse');
        }
    }

    showSearchError(message) {
        const searchInput = document.getElementById('search-input');
        
        // Remove any existing error states
        searchInput.classList.remove('border-green-500', 'animate-pulse');
        
        // Add error state
        searchInput.classList.add('border-red-500');
        
        // Show error message
        this.showSearchMessage(message, 'error');
        
        // Remove error state after 3 seconds
        setTimeout(() => {
            searchInput.classList.remove('border-red-500');
        }, 3000);
    }

    showSearchSuccess() {
        const searchInput = document.getElementById('search-input');
        
        // Remove any existing states
        searchInput.classList.remove('border-red-500', 'animate-pulse');
        
        // Add success state
        searchInput.classList.add('border-green-500');
        
        // Remove success state after 2 seconds
        setTimeout(() => {
            searchInput.classList.remove('border-green-500');
        }, 2000);
    }

    showSearchMessage(message, type = 'info') {
        // Remove any existing message
        this.hideSearchMessage();
        
        const searchContainer = document.querySelector('.search-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `search-message absolute top-full left-0 right-0 mt-2 p-3 rounded-xl backdrop-blur-xl border z-40 ${
            type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 
            'bg-green-500/20 border-green-500/50 text-green-200'
        }`;
        messageDiv.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        searchContainer.appendChild(messageDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            this.hideSearchMessage();
        }, 3000);
    }

    hideSearchMessage() {
        const existingMessage = document.querySelector('.search-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    addToSearchHistory(city) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
        
        // Add to beginning
        this.searchHistory.unshift(city);
        
        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        // Save to localStorage
        localStorage.setItem('skyPulseSearchHistory', JSON.stringify(this.searchHistory));
    }

    // Transform API data to our app's format
    transformAPIData(apiData) {
        return {
            city: apiData.location.name,
            country: apiData.location.country,
            lat: apiData.location.lat,
            lon: apiData.location.lon,
            temperature: apiData.current.temp_c,
            condition: apiData.current.condition.text,
            feelsLike: apiData.current.feelslike_c,
            humidity: apiData.current.humidity,
            windSpeed: apiData.current.wind_kph,
            pressure: apiData.current.pressure_mb,
            hourly: this.processHourlyForecast(apiData.forecast.forecastday[0]?.hour || []),
            weekly: this.processWeeklyForecast(apiData.forecast.forecastday || [])
        };
    }

    // Process hourly forecast from API
    processHourlyForecast(hourlyData) {
        return hourlyData.slice(0, 8).map(hour => {
            let icon, animation = '';
            const condition = hour.condition.text.toLowerCase();
            
            if (condition.includes('sun') || condition.includes('clear')) {
                icon = 'fas fa-sun text-yellow-400';
                animation = 'float';
            } else if (condition.includes('cloud')) {
                icon = 'fas fa-cloud text-gray-300';
            } else if (condition.includes('rain')) {
                icon = 'fas fa-cloud-rain text-blue-300';
                animation = 'animate-bounce';
            } else if (condition.includes('storm') || condition.includes('thunder')) {
                icon = 'fas fa-bolt text-yellow-300';
                animation = 'lightning';
            } else if (condition.includes('snow')) {
                icon = 'fas fa-snowflake text-blue-100';
                animation = 'animate-spin';
            } else {
                icon = 'fas fa-sun text-yellow-400';
            }
            
            return {
                time: hour.time.substring(0, 5), // Format as HH:MM
                temp: hour.temp_c,
                icon: icon,
                animation: animation,
                humidity: hour.humidity,
                wind: hour.wind_kph
            };
        });
    }

    // Process weekly forecast from API
    processWeeklyForecast(weeklyData) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return weeklyData.slice(0, 7).map((day, index) => {
            const date = new Date(day.date);
            const dayName = days[date.getDay()];
            
            let icon, animation = '';
            const condition = day.day.condition.text.toLowerCase();
            
            if (condition.includes('sun') || condition.includes('clear')) {
                icon = 'fas fa-sun text-yellow-400';
                animation = 'float';
            } else if (condition.includes('cloud')) {
                icon = 'fas fa-cloud text-gray-300';
            } else if (condition.includes('rain')) {
                icon = 'fas fa-cloud-rain text-blue-300';
                animation = 'animate-bounce';
            } else if (condition.includes('storm') || condition.includes('thunder')) {
                icon = 'fas fa-bolt text-yellow-300';
                animation = 'lightning';
            } else if (condition.includes('snow')) {
                icon = 'fas fa-snowflake text-blue-100';
                animation = 'animate-spin';
            } else {
                icon = 'fas fa-sun text-yellow-400';
            }
            
            return {
                day: index === 0 ? 'Today' : dayName,
                high: day.day.maxtemp_c,
                low: day.day.mintemp_c,
                icon: icon,
                animation: animation
            };
        });
    }

    loadDefaultWeather() {
        // Load default weather for New York
        this.performSearch('New York');
    }

    updateWeatherDisplay(weatherData) {
        this.currentWeather = weatherData;
        
        // Update main weather display
        document.getElementById('current-city').textContent = weatherData.city;
        document.getElementById('current-temp').textContent = `${weatherData.temperature}°`;
        document.getElementById('current-condition').textContent = weatherData.condition;
        document.getElementById('feels-like').textContent = `${weatherData.feelsLike}°`;
        document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
        document.getElementById('wind-speed').textContent = `${weatherData.windSpeed} km/h`;
        document.getElementById('pressure').textContent = `${weatherData.pressure} hPa`;
        
        // Update weather icon
        this.updateWeatherIcon(weatherData.condition);
        
        // Update hourly forecast
        this.updateHourlyForecast(weatherData.hourly);
        
        // Update weekly forecast
        this.updateWeeklyForecast(weatherData.weekly);
    }

    updateWeatherIcon(condition) {
        const iconContainer = document.getElementById('weather-icon');
        iconContainer.innerHTML = '';
        
        let iconClass, animationClass = '';
        
        switch(condition.toLowerCase()) {
            case 'sunny':
            case 'clear':
                iconClass = 'fas fa-sun text-yellow-400 text-6xl float';
                break;
            case 'cloudy':
            case 'overcast':
            case 'clouds':
                iconClass = 'fas fa-cloud text-gray-300 text-6xl';
                break;
            case 'rainy':
            case 'rain':
            case 'drizzle':
                iconClass = 'fas fa-cloud-rain text-blue-300 text-6xl';
                animationClass = 'animate-bounce';
                break;
            case 'stormy':
            case 'thunderstorm':
                iconClass = 'fas fa-bolt text-yellow-300 text-6xl lightning';
                break;
            case 'snowy':
            case 'snow':
                iconClass = 'fas fa-snowflake text-blue-100 text-6xl';
                animationClass = 'animate-spin';
                break;
            default:
                iconClass = 'fas fa-sun text-yellow-400 text-6xl';
        }
        
        const icon = document.createElement('i');
        icon.className = `${iconClass} ${animationClass}`;
        iconContainer.appendChild(icon);
    }

    updateHourlyForecast(hourlyData) {
        const container = document.getElementById('hourly-forecast');
        container.innerHTML = '';
        
        hourlyData.forEach(hour => {
            const card = document.createElement('div');
            card.className = 'bg-black/20 backdrop-blur-md rounded-xl p-4 text-center border border-white/5 flip-card h-32';
            
            card.innerHTML = `
                <div class="flip-card-inner">
                    <div class="flip-card-front flex flex-col items-center justify-center">
                        <p class="font-semibold text-sm">${hour.time}</p>
                        <i class="${hour.icon} text-2xl my-2 ${hour.animation}"></i>
                        <p class="text-lg font-bold">${hour.temp}°</p>
                    </div>
                    <div class="flip-card-back flex flex-col items-center justify-center bg-cyan-900/30 rounded-xl p-2">
                        <p class="text-xs">Humidity</p>
                        <p class="font-bold text-sm">${hour.humidity}%</p>
                        <p class="text-xs mt-1">Wind</p>
                        <p class="font-bold text-sm">${hour.wind} km/h</p>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    updateWeeklyForecast(weeklyData) {
        const container = document.getElementById('weekly-forecast');
        container.innerHTML = '';
        
        weeklyData.forEach(day => {
            const card = document.createElement('div');
            card.className = 'bg-black/20 backdrop-blur-md rounded-xl p-4 text-center border border-white/5 hover:bg-cyan-900/20 transition-all duration-300 ripple';
            
            card.innerHTML = `
                <p class="font-semibold">${day.day}</p>
                <i class="${day.icon} text-2xl my-3 ${day.animation}"></i>
                <div class="flex justify-between mt-2">
                    <p class="font-bold">${day.high}°</p>
                    <p class="text-gray-400">${day.low}°</p>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    generateMockWeatherData(city) {
        const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const baseTemp = 15 + Math.random() * 20;
        
        return {
            city: city,
            temperature: Math.round(baseTemp),
            condition: condition,
            feelsLike: Math.round(baseTemp + (Math.random() * 4 - 2)),
            humidity: Math.round(30 + Math.random() * 60),
            windSpeed: Math.round(5 + Math.random() * 25),
            pressure: Math.round(1000 + Math.random() * 30),
            hourly: this.generateHourlyForecast(),
            weekly: this.generateWeeklyForecast()
        };
    }

    generateHourlyForecast() {
        const hours = [];
        const now = new Date();
        
        for (let i = 0; i < 8; i++) {
            const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
            const time = hour.getHours() + ':00';
            const temp = Math.round(15 + Math.random() * 10);
            const condition = ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)];
            
            let icon, animation = '';
            switch(condition) {
                case 'sunny':
                    icon = 'fas fa-sun text-yellow-400';
                    animation = 'float';
                    break;
                case 'cloudy':
                    icon = 'fas fa-cloud text-gray-300';
                    break;
                case 'rainy':
                    icon = 'fas fa-cloud-rain text-blue-300';
                    animation = 'animate-bounce';
                    break;
            }
            
            hours.push({
                time,
                temp,
                icon,
                animation,
                humidity: Math.round(40 + Math.random() * 40),
                wind: Math.round(5 + Math.random() * 15)
            });
        }
        
        return hours;
    }

    generateWeeklyForecast() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const forecast = [];
        
        days.forEach(day => {
            const high = Math.round(18 + Math.random() * 12);
            const low = Math.round(high - 5 - Math.random() * 5);
            const condition = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'][Math.floor(Math.random() * 5)];
            
            let icon, animation = '';
            switch(condition) {
                case 'sunny':
                    icon = 'fas fa-sun text-yellow-400';
                    animation = 'float';
                    break;
                case 'cloudy':
                    icon = 'fas fa-cloud text-gray-300';
                    break;
                case 'rainy':
                    icon = 'fas fa-cloud-rain text-blue-300';
                    animation = 'animate-bounce';
                    break;
                case 'stormy':
                    icon = 'fas fa-bolt text-yellow-300';
                    animation = 'lightning';
                    break;
                case 'snowy':
                    icon = 'fas fa-snowflake text-blue-100';
                    animation = 'animate-spin';
                    break;
            }
            
            forecast.push({
                day,
                high,
                low,
                icon,
                animation
            });
        });
        
        return forecast;
    }

    updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    }

    initializeGlobe() {
        // The globe is now initialized automatically by three-globe.js
        console.log('3D Globe initialized automatically');
        
        setTimeout(() => {
            if (window.weatherGlobe) {
                console.log('Weather globe is ready');
            }
        }, 2000);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundIcon = document.querySelector('#sound-toggle i');
        
        if (this.soundEnabled) {
            soundIcon.className = 'fas fa-volume-up';
            if (this.currentWeather) {
                this.weatherEffects.playAmbientSound(this.currentWeather.condition);
            }
        } else {
            soundIcon.className = 'fas fa-volume-mute';
            this.weatherEffects.stopAmbientSound();
        }
    }

    addHoverEffects() {
        // Add floating effect to weather cards on hover
        const cards = document.querySelectorAll('.bg-black\\/20');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.classList.add('transform', 'transition-all', 'duration-300', 'hover:-translate-y-2');
            });
            
            card.addEventListener('mouseleave', () => {
                card.classList.remove('transform', 'transition-all', 'duration-300', 'hover:-translate-y-2');
            });
        });

        // Add ripple effect to clickable elements
        const rippleElements = document.querySelectorAll('.ripple');
        rippleElements.forEach(element => {
            element.addEventListener('click', function(e) {
                const existingRipple = this.querySelector('.ripple-effect');
                if (existingRipple) {
                    existingRipple.remove();
                }

                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');
                this.appendChild(ripple);

                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';

                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.skyPulseApp = new SkyPulseApp();
});

// Add CSS for search features
const searchStyles = `
.search-container {
    position: relative;
}

.search-suggestions {
    backdrop-filter: blur(20px);
    animation: slideDown 0.3s ease-out;
}

.suggestion-item {
    transition: all 0.2s ease;
}

.suggestion-item:hover {
    transform: translateX(5px);
}

.search-message {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.ripple {
    position: relative;
    overflow: hidden;
}

.ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = searchStyles;
document.head.appendChild(styleSheet);