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
        console.error("❌ Gagal membaca file token.txt:", err.message);
        return null;
    }
}

const SESSION_ID = readSessionToken();
if (!SESSION_ID) {
    console.log("⚠️ Token tidak ditemukan, pastikan token.txt sudah benar.");
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
    console.log("\n" + figlet.textSync("NT - Exhaust", { font: "Big" }));
    console.log("🔥 Automasi Daily Reward by NT - Exhaust 🔥\n");
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

        console.log(`👤 Nama: ${data.name}`);
        console.log(`📩 Email: ${data.email}`);
        console.log(`🆔 ID: ${data.id}`);
        console.log(`🏆 Rank: ${data.rank}`);
        console.log(`🔗 Referral Code: ${data.referralCode}`);
        console.log(`⚡ Power: ${data.power}`);
        console.log(`🎖 Level: ${data.level}`);
        console.log(`🔄 Next Daily Reward At: ${formatWaktu(data.nextDailyRewardAt)}`);

        return data.nextDailyRewardAt;
    } catch (error) {
        console.error("❌ Gagal mendapatkan status user:", error.response?.data || error.message);
        return null;
    }
}

async function claimDailyReward() {
    try {
        const response = await axios.post("https://signup-backend.billions.network/claim-daily-reward", {}, { headers });

        if (response.status === 200) {
            console.log(`✅ Berhasil klaim daily reward pada ${moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY, HH:mm:ss [WIB]")}`);
        } else {
            console.log("⚠️ Gagal klaim daily reward:", response.data);
        }
    } catch (error) {
        console.error("❌ Gagal klaim daily reward:", error.response?.data || error.message);
    }
}

async function countdownAndClaim(nextClaimTime) {
    let nextClaimTimestamp = moment(nextClaimTime).tz("Asia/Jakarta").valueOf();
    console.log(`⏳ Menunggu hingga: ${formatWaktu(nextClaimTime)}...`);

    const interval = setInterval(() => {
        let nowTimestamp = moment().tz("Asia/Jakarta").valueOf();
        let timeUntilClaim = nextClaimTimestamp - nowTimestamp;

        if (timeUntilClaim <= 0) {
            clearInterval(interval);
            console.log("\n🚀 Waktunya klaim! Mengirim permintaan...");
            claimDailyReward().then(() => {
                console.log("\n🔄 Menunggu daily reward berikutnya...\n");
                waitUntilNextClaim();
            });
            return;
        }

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`⏳ ${formatSisaWaktu(timeUntilClaim)} lagi untuk claim daily`);
    }, 1000);
}

async function waitUntilNextClaim() {
    showBanner();

    while (true) {
        const nextRewardTime = await getUserStatus();
        if (!nextRewardTime) return;

        countdownAndClaim(nextRewardTime);
        await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000)); // Tunggu 24 jam sebelum loop ulang
    }
}

waitUntilNextClaim();
