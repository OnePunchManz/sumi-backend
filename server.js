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
    process.env.SUMI_FE_URL
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
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

// 🔥 Use routes directly without `/api`
app.use("/", require("./routes"));

app.listen(port, () => {
    console.log(`🔥 Server running on port ${port}`);
});
