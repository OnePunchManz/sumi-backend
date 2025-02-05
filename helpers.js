const axios = require("axios");

// 🟢 OpenAI Image Analysis
const analyzeImageWithOpenAI = async (req, imageUrl, userMessage) => {
    console.log("Cloudinary URL for analysis:", imageUrl);
    console.log("User Message:", userMessage);

    if (!req.session.conversationHistory) {
        req.session.conversationHistory = [
            { role: "system", content: "You are an assistant specializing in analyzing stock charts." }
        ];
    }

    req.session.conversationHistory.push({
        role: "user",
        content: [
            { type: "text", text: userMessage || "Here is the stock chart, please analyze it and provide recommendations." },
            { type: "image_url", image_url: { url: imageUrl } }
        ]
    });

    const requestBody = {
        model: "gpt-4o",
        messages: req.session.conversationHistory,
        max_tokens: 1500,
        temperature: 0.7,
    };

    try {
        console.log("Sending request to OpenAI API...");
        const result = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            requestBody,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        if (!result.data.choices || result.data.choices.length === 0) {
            throw new Error("No response from OpenAI");
        }

        const aiResponse = result.data.choices[0].message;
        req.session.conversationHistory.push(aiResponse);
        return aiResponse.content;
    } catch (error) {
        console.error("Error calling OpenAI API:", error.response?.data || error.message);
        return "An error occurred while processing your request.";
    }
};

module.exports = { analyzeImageWithOpenAI };
