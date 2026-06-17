const axios = require('axios');

function getAqiInfo(aqi) {
    if (aqi <= 50) return { color: '#009966', status: 'Good', emoji: '🟢', level: 'good' };
    if (aqi <= 100) return { color: '#ffde33', status: 'Moderate', emoji: '🟡', level: 'moderate' };
    if (aqi <= 150) return { color: '#ff9933', status: 'Unhealthy for Sensitive Groups', emoji: '🟠', level: 'sensitive' };
    if (aqi <= 200) return { color: '#cc0033', status: 'Unhealthy', emoji: '🔴', level: 'unhealthy' };
    if (aqi <= 300) return { color: '#660099', status: 'Very Unhealthy', emoji: '🟪', level: 'very_unhealthy' };
    return { color: '#7e0023', status: 'Hazardous', emoji: '🟤', level: 'hazardous' };
}

async function fetchAqiData(location) {
    const token = process.env.WAQI_TOKEN;
    if (!token) throw new Error('MISSING_TOKEN');

    const response = await axios.get(`https://api.waqi.info/feed/${encodeURIComponent(location)}/?token=${token}`);
    const data = response.data.data;

    if (response.data.status !== 'ok' || !data || typeof data === 'string') {
        throw new Error('NOT_FOUND');
    }

    return {
        aqi: data.aqi,
        info: getAqiInfo(data.aqi),
        cityName: data.city.name,
        pm25: data.iaqi.pm25 ? data.iaqi.pm25.v : 'N/A',
        temp: data.iaqi.t ? `${data.iaqi.t.v}°C` : 'N/A',
        updatedAt: data.time.s
    };
}

module.exports = { getAqiInfo, fetchAqiData };
