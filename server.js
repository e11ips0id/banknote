const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 데이터 파일 경로
const dataFilePath = path.join(__dirname, 'chartData.json');
const quickButtonFilePath = path.join(__dirname, 'quickButtons.json');

// 데이터 파일 읽기
function readDataFile(filePath) {
    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath);
        return JSON.parse(rawData);
    }
    return [];
}

// 데이터 파일 쓰기
function writeDataFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 홈 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 차트 페이지 라우트
app.get('/income', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'income.html'));
});

app.get('/outcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'outcome.html'));
});

// 데이터 입력 페이지 라우트
app.get('/data-entry', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data.html'));
});

// 데이터 가져오기 API
app.get('/data', (req, res) => {
    const data = readDataFile(dataFilePath);
    res.json(data);
});

// 데이터 저장 API
app.post('/data', (req, res) => {
    const data = req.body;
    writeDataFile(dataFilePath, data);
    res.json({ message: 'Data saved successfully' });
});

// 퀵버튼 가져오기 API
app.get('/quick-buttons', (req, res) => {
    const quickButtons = readDataFile(quickButtonFilePath);
    res.json(quickButtons);
});

// 퀵버튼 저장 API
app.post('/quick-buttons', (req, res) => {
    const quickButtons = req.body;
    writeDataFile(quickButtonFilePath, quickButtons);
    res.json({ message: 'Quick buttons saved successfully' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
