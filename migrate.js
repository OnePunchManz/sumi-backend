const pool = require("./db");

const migrateDB = async () => {
    try {
        console.log("🚀 Running migrations...");

        // Create Users Table (Includes Guest Users with Expiry)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE, -- Google users have email, guest users don’t
                name VARCHAR(255),
                guest BOOLEAN DEFAULT FALSE, -- True for guest users
                expires_at TIMESTAMP DEFAULT NULL, -- TTL for guest users
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create Chats Table (Linked to Users)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chats (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) DEFAULT 'New Chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create Messages Table (Linked to Chats)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
                sender VARCHAR(10) CHECK (sender IN ('user', 'ai')), 
                content TEXT NOT NULL,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Database migrations completed!");
    } catch (error) {
        console.error("❌ Migration Error:", error);
    } finally {
        pool.end();
    }
};

// Run migrations
migrateDB();
