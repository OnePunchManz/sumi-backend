const express = require("express");
const { analyzeImageWithOpenAI } = require("./helpers");
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🟢 Google Authentication (Login/Register)
router.post("/auth/google", async (req, res) => {
    try {
        console.log("🔵 [Google Auth] Received request...");

        const { token } = req.body;
        if (!token) {
            console.log("❌ [Google Auth] No token provided!");
            return res.status(400).json({ error: "No token provided" });
        }

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { email, name } = ticket.getPayload();
        console.log(`🔍 [Google Auth] Verifying user: ${email}`);

        let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            console.log(`🆕 [Google Auth] User not found, creating: ${name} (${email})`);

            const newUser = await pool.query(
                "INSERT INTO users (email, name, guest) VALUES ($1, $2, false) RETURNING *",
                [email, name]
            );
            user = newUser;
        } else {
            console.log(`✅ [Google Auth] User found: ${email}`);
        }

        req.session.userId = user.rows[0].id;
        console.log(`🔐 [Google Auth] Session set for user: ${email}`);

        res.json({ user: user.rows[0] });

    } catch (error) {
        console.error("❌ [Google Auth] Error:", error);
        res.status(401).json({ error: "Authentication failed" });
    }
});

// 🔵 Guest User Login
router.post("/auth/guest", async (req, res) => {
    try {
        console.log("🟠 [Guest Auth] Creating guest user...");

        const guestId = `guest-${Date.now()}`;
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + 24); // Expire after 24 hours

        console.log(`🆕 [Guest Auth] Guest ID: ${guestId}, Expires: ${expirationTime}`);

        const guestUser = await pool.query(
            "INSERT INTO users (email, name, guest, expires_at) VALUES ($1, $2, true, $3) RETURNING *",
            [null, guestId, expirationTime]
        );

        req.session.userId = guestUser.rows[0].id;
        console.log(`🔐 [Guest Auth] Session set for guest user: ${guestId}`);

        res.json({ user: guestUser.rows[0] });

    } catch (error) {
        console.error("❌ [Guest Auth] Error:", error);
        res.status(500).json({ error: "Failed to create guest user" });
    }
});

// 🔹 Get Current User Session
router.get("/user", async (req, res) => {
    console.log("🔎 [User] Fetching user session...");

    if (!req.session.userId) {
        console.log("❌ [User] No user session found.");
        return res.status(401).json({ error: "No user session found" });
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);

    if (rows.length === 0) {
        console.log("❌ [User] User not found in database.");
        return res.status(404).json({ error: "User not found" });
    }

    console.log(`✅ [User] User found: ${rows[0].name}`);
    res.json({ user: rows[0] });
});

// 🟣 Logout User
router.post("/logout", (req, res) => {
    console.log("🚪 [Logout] Logging out user...");
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ [Logout] Logout failed:", err);
            return res.status(500).json({ error: "Logout failed" });
        }
        console.log("✅ [Logout] User logged out.");
        res.json({ message: "Logged out successfully" });
    });
});

// 🔵 Analyze Image API
router.post("/analyze", async (req, res) => {
    try {
        console.log("🖼️ [Analyze] Received request...");

        const { imageUrl, userInput } = req.body;
        if (!imageUrl) {
            console.log("❌ [Analyze] No image URL provided!");
            return res.status(400).json({ error: "No image URL provided." });
        }

        console.log(`✅ [Analyze] Image URL: ${imageUrl}, User Input: ${userInput}`);

        const analysis = await analyzeImageWithOpenAI(req, imageUrl, userInput);
        res.json({ analysis });

    } catch (error) {
        console.error("🔥 [Analyze] Error:", error);
        res.status(500).json({ error: "An error occurred during analysis." });
    }
});

module.exports = router;
