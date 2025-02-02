const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    process.env.SUMI_FE_URL // Use frontend URL from Render env variables
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin); // Set the allowed origin dynamically
        } else {
            console.error("Blocked by CORS:", origin);
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true
}));


app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "stock_analysis_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "none"
    }
}));

// CORS Headers Fix
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", allowedOrigins.includes(req.headers.origin) ? req.headers.origin : "");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Analyze Image with OpenAI
const analyzeImageWithOpenAI = async (req, imageUrl, userMessage) => {
    console.log("Cloudinary URL for analysis:", imageUrl);
    console.log("User Message:", userMessage);

    if (!req.session.conversationHistory) {
        req.session.conversationHistory = [
            { role: "system", content: "You are an assistant specializing in analyzing stock charts." }
        ];
    }

    // Add user message and image to history
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

        // Store AI response in session history
        const aiResponse = result.data.choices[0].message;
        req.session.conversationHistory.push(aiResponse);

        console.log("OpenAI API Response:", aiResponse);
        return aiResponse.content;
    } catch (error) {
        console.error("Error calling OpenAI API:", error.response?.data || error.message);
        return "An error occurred while processing your request.";
    }
};

// API to receive Cloudinary URL & analyze the image
app.post("/analyze", async (req, res) => {
    try {
        const { imageUrl, userInput } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ error: "No image URL provided." });
        }

        console.log("✅ Received Cloudinary URL:", imageUrl);
        console.log("✅ Received User Input:", userInput);

        // Analyze image with OpenAI and maintain session history
        const analysis = await analyzeImageWithOpenAI(req, imageUrl, userInput);
        console.log("✅ Analysis completed");

        res.json({ analysis });
    } catch (error) {
        console.error("🔥 ERROR in /analyze endpoint:", error);

        if (error.response) {
            console.error("🔴 OpenAI API Error Response:", error.response.data);
        }

        res.status(500).json({ error: "An error occurred during analysis." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
