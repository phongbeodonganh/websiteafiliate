import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: "AQ.Ab8RN6Krs7Ws-AxWPeyh2JVN-0ORBZNGZAUwoMax-XxccwHcJg"
});

async function run() {
    try {
        // 1. Kiểm tra danh sách các Model được hỗ trợ cho Key này
        console.log("=== Danh sách Model khả dụng ===");
        const responseList = await ai.models.list();
        for await (const m of responseList) {
            if (m.name.includes("flash") || m.name.includes("gemini")) {
                console.log("-", m.name.replace("models/", ""));
            }
        }

        // 2. Chạy thử nghiệm với gemini-2.0-flash (hoặc gemini-2.5-flash)
        console.log("\n=== Kết quả test sinh nội dung ===");
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: "Hello Gemini",
        });
        console.log("Thành công:\n", response.text);

    } catch (err) {
        console.error("Lỗi SDK:", err);
    }
}

run();