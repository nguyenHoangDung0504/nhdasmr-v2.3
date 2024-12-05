import Database from "../../models/Database.class.js";

await initializeData();

const urlParams = new URLSearchParams(window.location.search);
const trackKey = urlParams.get("code");
const track = Database.getTrackByIdentify(trackKey);
console.log(Database.trackMap);
if(!track) {
    alert('Code not found!');
}

document.title = 'NHD ASMR - Downloading: ' + trackKey;

const data = track;
let images = [data.thumbnail], imgs = [];
const uniqueElements = data.images.filter(item => !images.includes(item));
images.push(...uniqueElements);
for (let i = 0; i < images.length; i++) {
    if (images[i].indexOf('kiko-play') == -1) {
        imgs.push(images[i]);
    }
}
images = imgs;
let audios = data.audios;

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => {
    downloadZip();
}) : (() => {
    downloadZip();
})();

async function initializeData() {
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
                encodedURL = encodedURL.split('->');
                return url_prefixs.get(encodedURL[0]) + encodedURL[1];
            }

            return line;
        }));
    } catch (error) {
        console.error("Error initializing data:", error);
    }
}

function extractNumberFromLink(link) {
    let startIndex = link.lastIndexOf('/') + 1;
    let endIndex = link.lastIndexOf('.');
    endIndex = (endIndex > startIndex) ? endIndex : (link.lastIndexOf('?v'));
    let number = link.substring(startIndex, endIndex);
    return number;
}

function downloadZip() {
    var zip = new JSZip();
    const filename = `${data.code} - ${data.rjCode}`;
    var folder = zip.folder(filename);

    let imageLinks = images;
    let audioLinks = audios;

    const numberOfImages = imageLinks.length;
    const numberOfAudios = audioLinks.length;
    const totalFiles = numberOfImages + numberOfAudios;

    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `Processing: ${filename}.zip
        <br><br>
        The file is being compressed and is ready to download immediately, 
        this will take time, but you will no longer have to wait for downloads once the compression process is complete.
        <br>`;
    const percent = document.getElementById('percent');
    const process = document.getElementById('process');

    function updateProgress(filesDownloaded, mess) {
        let percentage = (filesDownloaded / totalFiles) * 100;
        percent.innerText = mess ? `${filesDownloaded}/${totalFiles} File has been processed - Done!` : `${filesDownloaded}/${totalFiles} File has been processed`;
        process.style.width = `${percentage}%`;
        if (mess)
            document.querySelector('body').innerHTML += `<br><a href="${window.location.href.includes('s2') ? '/s2' : ''}/watch/?code=${trackKey}">Go Back</a>`;
    }

    /***/

    function downloadFiles() {
        let filesDownloaded = 0;

        function downloadImage(index) {
            if (index >= imageLinks.length) {
                return Promise.resolve();
            }

            const link = imageLinks[index];
            return fetch(link)
                .then(function (res) {
                    return res.blob();
                })
                .then(function (blob) {
                    const imageNumber = extractNumberFromLink(link);
                    if (link.indexOf('.mp4') !== -1) {
                        folder.file(`${imageNumber}.mp4`, blob, { binary: true });
                    } else {
                        folder.file(`${imageNumber}.jpg`, blob, { binary: true });
                    }
                    filesDownloaded++;
                    updateProgress(filesDownloaded);
                    return downloadImage(index + 1);
                });
        }

        function downloadAudio(index) {
            if (index >= audioLinks.length) {
                return Promise.resolve();
            }

            const link = audioLinks[index];
            return fetch(link)
                .then(function (res) {
                    return res.blob();
                })
                .then(function (blob) {
                    const audioNumber = extractNumberFromLink(link);
                    if (link.indexOf('.mp4') !== -1) {
                        folder.file(`${audioNumber}.mp4`, blob, { binary: true });
                    } else {
                        folder.file(`${audioNumber}.mp3`, blob, { binary: true });
                    }
                    filesDownloaded++;
                    updateProgress(filesDownloaded);
                    return downloadAudio(index + 1);
                });
        }

        downloadImage(0)
            .then(function () {
                return downloadAudio(0);
            })
            .then(function () {
                zip.generateAsync({ type: 'blob' }).then(function (content) {
                    saveAs(content, filename);
                    updateProgress(filesDownloaded, 'done');
                });
            });
    }
    downloadFiles();
}

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