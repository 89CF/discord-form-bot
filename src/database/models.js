import db from './db.js';
import { randomUUID } from 'crypto';
import { logError, logWarning } from '../utils/errorHandler.js';

// ==================== Server Operations ====================

/**
 * Get server configuration by guild ID
 * @param {string} guildId - Discord guild ID
 * @returns {object|null} Server configuration or null if not found
 */
export function getServer(guildId) {
    try {
        const stmt = db.prepare('SELECT * FROM servers WHERE guild_id = ?');
        return stmt.get(guildId);
    } catch (error) {
        logError('getServer', error, { guildId });
        return null;
    }
}

/**
 * Update or create server configuration
 * @param {string} guildId - Discord guild ID
 * @param {object} data - Server configuration data
 * @returns {object} Updated server configuration
 */
export function updateServer(guildId, data) {
    try {
        const existing = getServer(guildId);
        
        if (existing) {
            const stmt = db.prepare(`
                UPDATE servers 
                SET admin_channel_id = COALESCE(?, admin_channel_id),
                    notification_enabled = COALESCE(?, notification_enabled),
                    notification_target = COALESCE(?, notification_target)
                WHERE guild_id = ?
            `);
            stmt.run(
                data.adminChannelId ?? null,
                data.notificationEnabled ?? null,
                data.notificationTarget ?? null,
                guildId
            );
        } else {
            const stmt = db.prepare(`
                INSERT INTO servers (guild_id, admin_channel_id, notification_enabled, notification_target)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(
                guildId,
                data.adminChannelId ?? null,
                data.notificationEnabled ?? 0,
                data.notificationTarget ?? null
            );
        }
        
        return getServer(guildId);
    } catch (error) {
        logError('updateServer', error, { guildId, data });
        throw error;
    }
}

// ==================== Form Operations ====================

/**
 * Create a new form
 * @param {object} formData - Form data
 * @returns {object} Created form
 */
export function createForm(formData) {
    try {
        const formId = randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO forms (
                form_id, guild_id, creator_id, title, description,
                button_label, button_color, button_message_id, button_channel_id, submission_limit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            formId,
            formData.guildId,
            formData.creatorId,
            formData.title,
            formData.description ?? null,
            formData.buttonLabel,
            formData.buttonColor,
            formData.buttonMessageId ?? null,
            formData.buttonChannelId ?? null,
            formData.submissionLimit ?? 'unlimited'
        );
        
        return getForm(formId);
    } catch (error) {
        logError('createForm', error, { formData });
        throw error;
    }
}

/**
 * Get form by ID
 * @param {string} formId - Form ID
 * @returns {object|null} Form data or null if not found
 */
export function getForm(formId) {
    try {
        const stmt = db.prepare('SELECT * FROM forms WHERE form_id = ?');
        return stmt.get(formId);
    } catch (error) {
        logError('getForm', error, { formId });
        return null;
    }
}

/**
 * Update form
 * @param {string} formId - Form ID
 * @param {object} data - Form data to update
 * @returns {object} Updated form
 */
export function updateForm(formId, data) {
    try {
        const stmt = db.prepare(`
            UPDATE forms 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                button_label = COALESCE(?, button_label),
                button_color = COALESCE(?, button_color),
                button_message_id = COALESCE(?, button_message_id),
                button_channel_id = COALESCE(?, button_channel_id),
                submission_limit = COALESCE(?, submission_limit),
                approve_message = COALESCE(?, approve_message),
                reject_message = COALESCE(?, reject_message),
                target_guild_id = COALESCE(?, target_guild_id),
                updated_at = datetime('now')
            WHERE form_id = ?
        `);
        
        stmt.run(
            data.title ?? null,
            data.description ?? null,
            data.buttonLabel ?? null,
            data.buttonColor ?? null,
            data.buttonMessageId ?? null,
            data.buttonChannelId ?? null,
            data.submissionLimit ?? null,
            data.approveMessage ?? null,
            data.rejectMessage ?? null,
            data.targetGuildId ?? null,
            formId
        );
        
        return getForm(formId);
    } catch (error) {
        logError('updateForm', error, { formId, data });
        throw error;
    }
}

/**
 * Delete form (cascade deletes questions, submissions, and answers)
 * @param {string} formId - Form ID
 * @returns {boolean} True if deleted
 */
export function deleteForm(formId) {
    try {
        const stmt = db.prepare('DELETE FROM forms WHERE form_id = ?');
        const result = stmt.run(formId);
        return result.changes > 0;
    } catch (error) {
        logError('deleteForm', error, { formId });
        throw error;
    }
}

/**
 * List all forms for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {array} Array of forms
 */
export function listForms(guildId) {
    try {
        const stmt = db.prepare('SELECT * FROM forms WHERE guild_id = ? ORDER BY created_at DESC');
        return stmt.all(guildId);
    } catch (error) {
        logError('listForms', error, { guildId });
        return [];
    }
}

// ==================== Question Operations ====================

/**
 * Add a question to a form
 * @param {object} questionData - Question data
 * @returns {object} Created question
 */
export function addQuestion(questionData) {
    try {
        const questionId = randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO questions (question_id, form_id, question_text, is_required, question_order)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            questionId,
            questionData.formId,
            questionData.questionText,
            questionData.isRequired ? 1 : 0,
            questionData.order
        );
        
        const getStmt = db.prepare('SELECT * FROM questions WHERE question_id = ?');
        return getStmt.get(questionId);
    } catch (error) {
        logError('addQuestion', error, { questionData });
        throw error;
    }
}

/**
 * Remove a question from a form
 * @param {string} questionId - Question ID
 * @returns {boolean} True if deleted
 */
export function removeQuestion(questionId) {
    try {
        const stmt = db.prepare('DELETE FROM questions WHERE question_id = ?');
        const result = stmt.run(questionId);
        return result.changes > 0;
    } catch (error) {
        logError('removeQuestion', error, { questionId });
        throw error;
    }
}

/**
 * Get all questions for a form
 * @param {string} formId - Form ID
 * @returns {array} Array of questions ordered by question_order
 */
export function getQuestions(formId) {
    try {
        const stmt = db.prepare('SELECT * FROM questions WHERE form_id = ? ORDER BY question_order ASC');
        return stmt.all(formId);
    } catch (error) {
        logError('getQuestions', error, { formId });
        return [];
    }
}

// ==================== Submission Operations ====================

/**
 * Create a new submission
 * @param {object} submissionData - Submission data
 * @returns {object} Created submission with ID
 */
export function createSubmission(submissionData) {
    try {
        const submissionId = randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO submissions (
                submission_id, form_id, user_id, guild_id, 
                status, admin_message_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            submissionId,
            submissionData.formId,
            submissionData.userId,
            submissionData.guildId,
            submissionData.status ?? 'pending',
            submissionData.adminMessageId ?? null
        );
        
        // Add answers if provided
        if (submissionData.answers && submissionData.answers.length > 0) {
            const answerStmt = db.prepare(`
                INSERT INTO answers (answer_id, submission_id, question_id, answer_text)
                VALUES (?, ?, ?, ?)
            `);
            
            const insertMany = db.transaction((answers) => {
                for (const answer of answers) {
                    answerStmt.run(
                        randomUUID(),
                        submissionId,
                        answer.questionId,
                        answer.answerText
                    );
                }
            });
            
            insertMany(submissionData.answers);
        }
        
        return getSubmission(submissionId);
    } catch (error) {
        logError('createSubmission', error, { submissionData });
        throw error;
    }
}

/**
 * Get submission by ID with answers
 * @param {string} submissionId - Submission ID
 * @returns {object|null} Submission with answers or null if not found
 */
export function getSubmission(submissionId) {
    try {
        const stmt = db.prepare('SELECT * FROM submissions WHERE submission_id = ?');
        const submission = stmt.get(submissionId);
        
        if (!submission) return null;
        
        // Get answers
        const answerStmt = db.prepare(`
            SELECT a.*, q.question_text 
            FROM answers a
            JOIN questions q ON a.question_id = q.question_id
            WHERE a.submission_id = ?
            ORDER BY q.question_order ASC
        `);
        submission.answers = answerStmt.all(submissionId);
        
        return submission;
    } catch (error) {
        logError('getSubmission', error, { submissionId });
        return null;
    }
}

/**
 * Update submission status
 * @param {string} submissionId - Submission ID
 * @param {object} data - Update data (status, reviewedBy, reviewMessage)
 * @returns {object} Updated submission
 */
export function updateSubmissionStatus(submissionId, data) {
    try {
        const stmt = db.prepare(`
            UPDATE submissions 
            SET status = COALESCE(?, status),
                reviewed_by = COALESCE(?, reviewed_by),
                review_message = COALESCE(?, review_message),
                reviewed_at = CASE WHEN ? IS NOT NULL THEN datetime('now') ELSE reviewed_at END
            WHERE submission_id = ?
        `);
        
        stmt.run(
            data.status ?? null,
            data.reviewedBy ?? null,
            data.reviewMessage ?? null,
            data.status ?? null, // Trigger reviewed_at update if status is provided
            submissionId
        );
        
        return getSubmission(submissionId);
    } catch (error) {
        logError('updateSubmissionStatus', error, { submissionId, data });
        throw error;
    }
}

/**
 * List submissions for a form
 * @param {string} formId - Form ID
 * @param {object} options - Query options (status filter, limit, offset)
 * @returns {array} Array of submissions
 */
export function listSubmissions(formId, options = {}) {
    try {
        let query = 'SELECT * FROM submissions WHERE form_id = ?';
        const params = [formId];
        
        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }
        
        query += ' ORDER BY submitted_at DESC';
        
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
            
            if (options.offset) {
                query += ' OFFSET ?';
                params.push(options.offset);
            }
        }
        
        const stmt = db.prepare(query);
        return stmt.all(...params);
    } catch (error) {
        logError('listSubmissions', error, { formId, options });
        return [];
    }
}

/**
 * Check if user has already submitted a form
 * @param {string} formId - Form ID
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if user has submitted
 */
export function hasUserSubmitted(formId, userId) {
    try {
        const stmt = db.prepare(`
            SELECT COUNT(*) as count 
            FROM submissions 
            WHERE form_id = ? AND user_id = ?
        `);
        const result = stmt.get(formId, userId);
        return result.count > 0;
    } catch (error) {
        logError('hasUserSubmitted', error, { formId, userId });
        return false;
    }
}
