const fs = require("fs");
const axios = require("axios");
const moment = require("moment-timezone");
const figlet = require("figlet");
const path = require("path");

const tokenPath = path.join(__dirname, "token.txt");

function readSessionToken() {
    try {
        const data = fs.readFileSync(tokenPath, "utf8").trim();
        const token = data.split("=")[1];
        return token;
    } catch (err) {
        console.error("❌ Không đọc được tệp token.txt:", err.message);
        return null;
    }
}

const SESSION_ID = readSessionToken();
if (!SESSION_ID) {
    console.log("⚠️ Không tìm thấy mã thông báo, vui lòng kiểm tra token.txt.");
    process.exit(1);
}

const headers = {
    "accept": "application/json, text/plain, */*",
    "cookie": `session_id=${SESSION_ID}`,
    "origin": "https://signup.billions.network",
    "referer": "https://signup.billions.network/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
};

function showBanner() {
    console.log("\n" + figlet.textSync("LocalSec", { font: "Big" }));
    console.log("🔥 Tự động hóa phần thưởng hàng ngày - LocalSec 🔥\n");
}

function formatWaktu(utcTime) {
    return moment(utcTime).tz("Asia/Jakarta").format("dddd, DD MMMM YYYY, HH:mm:ss [WIB]");
}

function formatSisaWaktu(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let jam = Math.floor(totalSeconds / 3600);
    let menit = Math.floor((totalSeconds % 3600) / 60);
    let detik = totalSeconds % 60;
    return `${jam} jam ${menit} menit ${detik} detik`;
}

async function getUserStatus() {
    try {
        const response = await axios.get("https://signup-backend.billions.network/me", { headers });
        const data = response.data;

        console.log(`👤 Tên: ${data.name}`);
        console.log(`📩 Email: ${data.email}`);
        console.log(`🆔 ID: ${data.id}`);
        console.log(`🏆 Rank: ${data.rank}`);
        console.log(`🔗 Referral Code: ${data.referralCode}`);
        console.log(`⚡ Power: ${data.power}`);
        console.log(`🎖 Level: ${data.level}`);
        console.log(`🔄 Phần thưởng tiếp theo: ${formatWaktu(data.nextDailyRewardAt)}`);

        return data.nextDailyRewardAt;
    } catch (error) {
        console.error("❌ Không thể lấy được trạng thái người dùng:", error.response?.data || error.message);
        return null;
    }
}

async function claimDailyReward() {
    try {
        const response = await axios.post("https://signup-backend.billions.network/claim-daily-reward", {}, { headers });

        if (response.status === 200) {
            console.log(`✅ Thành công lấy phần thưởng hàng ngày trên ${moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY, HH:mm:ss [WIB]")}`);
        } else {
            console.log("⚠️ Không thể nhận phần thưởng hàng ngày:", response.data);
        }
    } catch (error) {
        console.error("❌ Không thể nhận phần thưởng hàng ngày:", error.response?.data || error.message);
    }
}

async function countdownAndClaim(nextClaimTime) {
    let nextClaimTimestamp = moment(nextClaimTime).tz("Asia/Jakarta").valueOf();
    console.log(`⏳ Đang chờ: ${formatWaktu(nextClaimTime)}...`);

    const interval = setInterval(() => {
        let nowTimestamp = moment().tz("Asia/Jakarta").valueOf();
        let timeUntilClaim = nextClaimTimestamp - nowTimestamp;

        if (timeUntilClaim <= 0) {
            clearInterval(interval);
            console.log("\n🚀 Đã đến lúc kiếm tiền rồi! Gửi yêu cầu...");
            claimDailyReward().then(() => {
                console.log("\n🔄 Đang chờ phần thưởng hàng ngày tiếp theo...\n");
                waitUntilNextClaim();
            });
            return;
        }

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`⏳ ${formatSisaWaktu(timeUntilClaim)} lại đi kiếm tiền nào`);
    }, 1000);
}

async function waitUntilNextClaim() {
    showBanner();

    while (true) {
        const nextRewardTime = await getUserStatus();
        if (!nextRewardTime) return;

        countdownAndClaim(nextRewardTime);
        await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000)); // Chờ 24 giờ trước khi lặp lại
    }
}

waitUntilNextClaim();
