import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/bot.db');
const dbDir = dirname(dbPath);

// Ensure data directory exists
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db;
try {
    db = new Database(dbPath);
    console.log(`✅ Database connected: ${dbPath}`);
} catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
}

// Enable foreign keys
try {
    db.pragma('foreign_keys = ON');
} catch (error) {
    console.error('❌ Failed to enable foreign keys:', error);
}

// Create tables
function initializeDatabase() {
    try {
        // Servers table
        db.exec(`
            CREATE TABLE IF NOT EXISTS servers (
                guild_id TEXT PRIMARY KEY,
                admin_channel_id TEXT,
                notification_enabled INTEGER DEFAULT 0,
                notification_target TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Forms table
        db.exec(`
            CREATE TABLE IF NOT EXISTS forms (
                form_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                creator_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                button_label TEXT NOT NULL,
                button_color TEXT NOT NULL,
                button_message_id TEXT,
                button_channel_id TEXT,
                submission_limit TEXT DEFAULT 'unlimited',
                approve_message TEXT,
                reject_message TEXT,
                target_guild_id TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (guild_id) REFERENCES servers(guild_id) ON DELETE CASCADE
            )
        `);

        // Questions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS questions (
                question_id TEXT PRIMARY KEY,
                form_id TEXT NOT NULL,
                question_text TEXT NOT NULL,
                is_required INTEGER DEFAULT 1,
                question_order INTEGER NOT NULL,
                FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
            )
        `);

        // Submissions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS submissions (
                submission_id TEXT PRIMARY KEY,
                form_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_message_id TEXT,
                reviewed_by TEXT,
                review_message TEXT,
                submitted_at TEXT DEFAULT (datetime('now')),
                reviewed_at TEXT,
                FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
            )
        `);

        // Answers table
        db.exec(`
            CREATE TABLE IF NOT EXISTS answers (
                answer_id TEXT PRIMARY KEY,
                submission_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                answer_text TEXT,
                FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
            )
        `);

        // Create indexes for performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_forms_guild_id ON forms(guild_id);
            CREATE INDEX IF NOT EXISTS idx_questions_form_id ON questions(form_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_guild_id ON submissions(guild_id);
            CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON answers(submission_id);
        `);

        console.log('✅ Database initialized successfully');
        
        // Run migrations
        runMigrations();
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Run database migrations
 */
function runMigrations() {
    try {
        // Check if columns exist
        const tableInfo = db.pragma('table_info(forms)');
        const hasApproveMessage = tableInfo.some(col => col.name === 'approve_message');
        const hasRejectMessage = tableInfo.some(col => col.name === 'reject_message');
        const hasTargetGuildId = tableInfo.some(col => col.name === 'target_guild_id');
        
        if (!hasApproveMessage) {
            db.exec('ALTER TABLE forms ADD COLUMN approve_message TEXT');
            console.log('✅ Migration: Added approve_message column to forms table');
        }
        
        if (!hasRejectMessage) {
            db.exec('ALTER TABLE forms ADD COLUMN reject_message TEXT');
            console.log('✅ Migration: Added reject_message column to forms table');
        }
        
        if (!hasTargetGuildId) {
            db.exec('ALTER TABLE forms ADD COLUMN target_guild_id TEXT');
            console.log('✅ Migration: Added target_guild_id column to forms table');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

// Initialize database on module load
try {
    initializeDatabase();
} catch (error) {
    console.error('❌ Database initialization failed. Exiting...');
    process.exit(1);
}

export default db;
