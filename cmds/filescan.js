const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

// 환경변수에서 VirusTotal API 키 가져오기
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

// 파일 저장 경로 설정
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// 파일 해시 생성 함수
async function calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

// VirusTotal API 함수들
async function scanFile(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post('https://www.virustotal.com/vtapi/v2/file/scan', form, {
        headers: {
            ...form.getHeaders(),
            'apikey': VIRUSTOTAL_API_KEY
        }
    });

    return response.data.scan_id;
}

async function getResults(scanId) {
    const response = await axios.get('https://www.virustotal.com/vtapi/v2/file/report', {
        params: {
            apikey: VIRUSTOTAL_API_KEY,
            resource: scanId
        }
    });

    return response.data;
}

module.exports = {
    name: 'filescan',
    description: '파일을 VirusTotal로 검사하고 안전성을 확인합니다.',
    async execute(message, args, isSlash) {
        try {
            // 파일 첨부 확인
            const attachment = isSlash ? 
                message.options.getAttachment('file') :
                message.attachments.first();

            if (!attachment) {
                return message.reply('검사할 파일을 첨부해주세요!');
            }

            // 임시 응답
            const response = await message.reply('파일을 검사하고 있습니다... (약 1-2분 소요)');

            // 파일 다운로드 및 저장
            const fileResponse = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileResponse.data);
            const fileName = `${Date.now()}-${attachment.name}`;
            const filePath = path.join(UPLOAD_DIR, fileName);
            
            fs.writeFileSync(filePath, buffer);

            // 파일 해시 계산
            const fileHash = await calculateSHA256(filePath);

            // VirusTotal에 파일 스캔 요청
            const scanId = await scanFile(filePath);

            // 결과가 나올 때까지 대기 (15초 간격으로 최대 4번 확인)
            let results = null;
            for (let i = 0; i < 4; i++) {
                await new Promise(resolve => setTimeout(resolve, 15000));
                results = await getResults(scanId);
                if (results.response_code === 1) break;
            }

            if (!results || results.response_code !== 1) {
                throw new Error('스캔 결과를 가져올 수 없습니다.');
            }

            // 결과 분석
            const totalScans = Object.keys(results.scans).length;
            const detections = results.positives;
            const safetyPercentage = ((totalScans - detections) / totalScans * 100).toFixed(1);

            // 결과 메시지 생성
            let resultMessage = `🔍 바이러스 검사 결과:\n`;
            resultMessage += `- 안전도: ${safetyPercentage}%\n`;
            resultMessage += `- 탐지: ${detections}/${totalScans}\n`;
            resultMessage += `- 파일명: ${attachment.name}\n`;
            resultMessage += `- 상세결과: ${results.permalink}`;

            // 결과 전송
            await response.edit({
                content: resultMessage,
                files: [{
                    attachment: filePath,
                    name: attachment.name
                }]
            });

            // 일주일 후 파일 삭제 예약
            schedule.scheduleJob(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), () => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted file: ${fileName}`);
                    }
                } catch (error) {
                    console.error(`Error deleting file ${fileName}:`, error);
                }
            });

        } catch (error) {
            console.error('File processing error:', error);
            if (message.reply) {
                message.reply('파일 처리 중 오류가 발생했습니다.');
            }
        }
    }
};
