const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SkyPulse server is running',
        weatherAPI: process.env.OPENWEATHER_API_KEY ? 'Configured' : 'Not configured'
    });
});

// Weather API endpoint - REAL DATA
app.get('/api/weather', async (req, res) => {
    try {
        const { city } = req.query;
        
        if (!city) {
            return res.status(400).json({ error: 'City parameter is required' });
        }
        
        console.log(`Fetching weather for: ${city}`);
        
        let weatherData;
        
        // Try real API first if key is configured
        if (process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_actual_api_key_here') {
            try {
                weatherData = await getRealWeatherData(city);
                console.log(`✅ Real weather data fetched for ${city}`);
            } catch (apiError) {
                console.log('❌ API failed, falling back to mock data:', apiError.message);
                weatherData = getMockWeatherData(city);
            }
        } else {
            console.log('ℹ️ Using mock data (API key not configured)');
            weatherData = getMockWeatherData(city);
        }
        
        res.json({
            success: true,
            data: weatherData,
            timestamp: new Date().toISOString(),
            source: weatherData.source || 'mock'
        });
        
    } catch (error) {
        console.error('Error in weather endpoint:', error);
        
        // Final fallback
        const mockData = getMockWeatherData(req.query.city || 'New York');
        
        res.json({
            success: true,
            data: mockData,
            timestamp: new Date().toISOString(),
            source: 'mock-fallback',
            note: 'Using fallback data'
        });
    }
});

// REAL OpenWeatherMap API function
async function getRealWeatherData(city) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey || apiKey === 'your_actual_api_key_here') {
        throw new Error('OpenWeatherMap API key not configured');
    }

    // Current weather + 5-day forecast
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    console.log(`🌤️ Calling OpenWeatherMap API for: ${city}`);

    const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl)
    ]);

    if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status} ${currentResponse.statusText}`);
    }

    const currentData = await currentResponse.json();
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

    // Transform OpenWeatherMap data to our format
    const transformedData = transformWeatherData(currentData, forecastData);
    transformedData.source = 'api';
    
    return transformedData;
}

// Transform OpenWeatherMap data to our app's format
function transformWeatherData(currentData, forecastData) {
    // Map OpenWeatherMap condition codes to our conditions
    const conditionMap = {
        // Thunderstorm
        200: 'Stormy', 201: 'Stormy', 202: 'Stormy', 210: 'Stormy', 
        211: 'Stormy', 212: 'Stormy', 221: 'Stormy', 230: 'Stormy', 
        231: 'Stormy', 232: 'Stormy',
        
        // Drizzle
        300: 'Rainy', 301: 'Rainy', 302: 'Rainy', 310: 'Rainy', 
        311: 'Rainy', 312: 'Rainy', 313: 'Rainy', 314: 'Rainy', 
        321: 'Rainy',
        
        // Rain
        500: 'Rainy', 501: 'Rainy', 502: 'Rainy', 503: 'Rainy', 
        504: 'Rainy', 511: 'Snowy', 520: 'Rainy', 521: 'Rainy', 
        522: 'Rainy', 531: 'Rainy',
        
        // Snow
        600: 'Snowy', 601: 'Snowy', 602: 'Snowy', 611: 'Snowy', 
        612: 'Snowy', 613: 'Snowy', 615: 'Snowy', 616: 'Snowy', 
        620: 'Snowy', 621: 'Snowy', 622: 'Snowy',
        
        // Atmosphere
        701: 'Cloudy', 711: 'Cloudy', 721: 'Cloudy', 731: 'Cloudy', 
        741: 'Cloudy', 751: 'Cloudy', 761: 'Cloudy', 762: 'Cloudy', 
        771: 'Cloudy', 781: 'Stormy',
        
        // Clear
        800: 'Sunny',
        
        // Clouds
        801: 'Cloudy', 802: 'Cloudy', 803: 'Cloudy', 804: 'Cloudy'
    };

    const conditionCode = currentData.weather[0].id;
    const condition = conditionMap[conditionCode] || 'Sunny';

    const result = {
        location: {
            name: currentData.name,
            country: currentData.sys.country,
            lat: currentData.coord.lat,
            lon: currentData.coord.lon
        },
        current: {
            temp_c: Math.round(currentData.main.temp),
            temp_f: Math.round((currentData.main.temp * 9/5) + 32),
            condition: {
                text: condition,
                description: currentData.weather[0].description,
                icon: `https://openweathermap.org/img/wn/${currentData.weather[0].icon}@2x.png`
            },
            feelslike_c: Math.round(currentData.main.feels_like),
            humidity: currentData.main.humidity,
            wind_kph: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
            pressure_mb: currentData.main.pressure,
            visibility: currentData.visibility ? currentData.visibility / 1000 : 10, // Convert to km
            uv: 5 // OpenWeatherMap doesn't provide UV in free tier
        },
        forecast: {
            forecastday: forecastData ? processForecastData(forecastData) : []
        }
    };

    return result;
}

// Process 5-day forecast data
function processForecastData(forecastData) {
    const dailyForecasts = {};
    
    forecastData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0]; // Get date part
        
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                date: date,
                hours: [],
                maxTemp: -Infinity,
                minTemp: Infinity
            };
        }
        
        // Add hourly data
        dailyForecasts[date].hours.push({
            time: item.dt_txt.split(' ')[1].substring(0, 5),
            temp_c: Math.round(item.main.temp),
            condition: {
                text: item.weather[0].main,
                icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`
            },
            humidity: item.main.humidity,
            wind_kph: Math.round(item.wind.speed * 3.6)
        });
        
        // Update min/max temps
        dailyForecasts[date].maxTemp = Math.max(dailyForecasts[date].maxTemp, item.main.temp);
        dailyForecasts[date].minTemp = Math.min(dailyForecasts[date].minTemp, item.main.temp);
    });
    
    // Convert to array and format
    return Object.values(dailyForecasts).map(day => ({
        date: day.date,
        day: {
            maxtemp_c: Math.round(day.maxTemp),
            mintemp_c: Math.round(day.minTemp),
            condition: {
                text: getDominantCondition(day.hours),
                icon: day.hours[Math.floor(day.hours.length / 2)]?.condition?.icon || '❓'
            }
        },
        hour: day.hours.slice(0, 8) // Only return first 8 hours for performance
    }));
}

function getDominantCondition(hours) {
    const conditionCount = {};
    hours.forEach(hour => {
        const condition = hour.condition.text;
        conditionCount[condition] = (conditionCount[condition] || 0) + 1;
    });
    
    return Object.keys(conditionCount).reduce((a, b) => 
        conditionCount[a] > conditionCount[b] ? a : b
    );
}

// Mock data function - FIXED the city parameter issue
function getMockWeatherData(city) {
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const baseTemp = 15 + Math.random() * 20;
    
    return {
        location: {
            name: city || 'Unknown City',
            country: 'US',
            lat: 40.7128,
            lon: -74.0060
        },
        current: {
            temp_c: Math.round(baseTemp),
            temp_f: Math.round((baseTemp * 9/5) + 32),
            condition: {
                text: condition,
                icon: getWeatherIcon(condition)
            },
            feelslike_c: Math.round(baseTemp + (Math.random() * 4 - 2)),
            humidity: Math.round(30 + Math.random() * 60),
            wind_kph: Math.round(5 + Math.random() * 25),
            pressure_mb: Math.round(1000 + Math.random() * 30),
            uv: Math.round(Math.random() * 10)
        },
        forecast: {
            forecastday: generateForecastData()
        },
        source: 'mock'
    };
}

function getWeatherIcon(condition) {
    const icons = {
        'Sunny': '☀️',
        'Cloudy': '☁️',
        'Rainy': '🌧️',
        'Stormy': '⛈️',
        'Snowy': '❄️'
    };
    return icons[condition] || '☀️';
}

function generateForecastData() {
    const forecast = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        forecast.push({
            date: date.toISOString().split('T')[0],
            day: {
                maxtemp_c: Math.round(20 + Math.random() * 15),
                mintemp_c: Math.round(10 + Math.random() * 10),
                condition: {
                    text: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
                }
            },
            hour: generateHourlyForecast()
        });
    }
    
    return forecast;
}

function generateHourlyForecast() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        hours.push({
            time: `${i.toString().padStart(2, '0')}:00`,
            temp_c: Math.round(15 + Math.random() * 10),
            condition: {
                text: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
            }
        });
    }
    return hours;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SkyPulse server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
    
    // Check API key status
    if (process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_actual_api_key_here') {
        console.log(`🌤️  Weather API: ✅ Configured`);
    } else {
        console.log(`🌤️  Weather API: ❌ Not configured - using mock data`);
        console.log(`   💡 Get free API key from: https://openweathermap.org/api`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down SkyPulse server...');
    process.exit(0);
});