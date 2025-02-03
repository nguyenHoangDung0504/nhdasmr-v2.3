import App from "../app/App.class.js";
import Database from "../models/Database.class.js";

// Biến toàn cục để lưu trữ dữ liệu CSV
window.data = null;

// Hàm chờ tải CSV xong trước khi các script bên dưới chạy
async function initializeApp() {
    try {
        // Tải dữ liệu CSV
        const csvData = await getCSVData("/data/s1.csv");
        const { cv, tag, series: seriess, tracks, url_prefix } = parseCombinedFile(csvData);
        const cvs = new Map(cv.split('\n').filter(Boolean).map(line => line.split(',').splice(0, 2)));
        const tags = new Map(tag.split('\n').filter(Boolean).map(line => line.split(',').splice(0, 2)));
        const series = new Map(seriess.split('\n').filter(Boolean).map(line => line.split(',').splice(0, 2)));
        const url_prefixs = new Map(url_prefix.split('\n').filter(Boolean).map(line => line.split(',')));
        
        Database.setData(tracks.split('\n').filter(Boolean).map(line => {
            line = parseTrackLine(line);
            line[0] = parseInt(line[0]);

            line[2] = line[2].split('-').map(col => cvs.get(col)).join(',');
            line[3] = line[3].split('-').map(col => tags.get(col)).join(',');
            line[4] = line[4].split('-').map(col => series.get(col)).join(',');

            line[7] = parseEncodedURL(line[7]);
            line[8] = line[8].split(',').map(col => parseEncodedURL(col)).join(',');
            line[9] = line[9].split(',').map(col => parseEncodedURL(col)).join(',');

            function parseEncodedURL(encodedURL) {
                if (encodedURL.trim().length === 0) return '';
                encodedURL = encodedURL.split('->');
                return url_prefixs.get(encodedURL[0]) + encodedURL[1];
            }

            return line;
        }));

        document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => {
            App.build(App.types.WATCH);
        }) : (() => {
            App.build(App.types.WATCH);
        })();
    } catch (error) {
        console.error("Error initializing app:", error);
    }
}

// Bắt đầu quá trình tải và khởi chạy
initializeApp();

function parseCombinedFile(data) {
    const sections = {};
    let currentSection = null;
    let currentData = [];

    // Đọc từng dòng và xử lý
    data.split('\n').forEach((line) => {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('##')) {
            // Nếu gặp header phần mới, lưu phần hiện tại (nếu có)
            if (currentSection && currentData.length > 0) {
                sections[currentSection] = currentData.join('\n');
            }
            // Bắt đầu phần mới
            currentSection = trimmedLine.replaceAll('##', '').replaceAll('-', '').toLowerCase(); // Tên phần viết thường
            currentData = [];
        } else if (trimmedLine) {
            // Bỏ qua các dòng comment hoặc dòng rỗng, lưu dòng dữ liệu thô
            currentData.push(trimmedLine);
        }
    });

    // Lưu phần cuối cùng vào sections
    if (currentSection && currentData.length > 0) {
        sections[currentSection] = currentData.join('\n');
    }

    return sections;
}

function parseTrackLine(line) {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (const char of line) {
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

async function getCSVData(url) {
    const CACHE_KEY = 'cachedCSV';
    const CACHE_TIMESTAMP_KEY = 'cacheTimestamp';
    const CACHE_EXPIRATION = 1000 * 60 * 5;

    const now = Date.now();
    const cachedCSV = localStorage.getItem(CACHE_KEY);
    const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    // Kiểm tra cache
    if (cachedCSV && cacheTimestamp && now - parseInt(cacheTimestamp) < CACHE_EXPIRATION) {
        console.log("Loading CSV from cache...");
        return cachedCSV;
    }

    console.log("Fetching CSV from server...");

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch CSV file");
    }

    const csvData = await response.text();

    localStorage.setItem(CACHE_KEY, csvData);
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

    return csvData;
}