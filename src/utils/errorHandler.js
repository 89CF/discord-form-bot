/**
 * Error handling and logging utilities
 */

// Error types for categorization
export const ErrorType = {
    DATABASE: 'DATABASE',
    DISCORD_API: 'DISCORD_API',
    PERMISSION: 'PERMISSION',
    VALIDATION: 'VALIDATION',
    NOT_FOUND: 'NOT_FOUND',
    UNKNOWN: 'UNKNOWN'
};

// Discord API error codes
const DiscordAPIErrors = {
    UNKNOWN_MESSAGE: 10008,
    UNKNOWN_CHANNEL: 10003,
    UNKNOWN_GUILD: 10004,
    UNKNOWN_USER: 10013,
    MISSING_PERMISSIONS: 50013,
    CANNOT_SEND_DM: 50007,
    RATE_LIMITED: 429
};

/**
 * Log error with context
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {object} additionalInfo - Additional context information
 */
export function logError(context, error, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const errorType = categorizeError(error);
    
    console.error(`[${timestamp}] [${errorType}] Error in ${context}:`);
    console.error(`Message: ${error.message}`);
    
    if (error.stack) {
        console.error(`Stack: ${error.stack}`);
    }
    
    if (Object.keys(additionalInfo).length > 0) {
        console.error('Additional Info:', JSON.stringify(additionalInfo, null, 2));
    }
    
    // Log Discord API specific errors
    if (error.code) {
        console.error(`Discord API Error Code: ${error.code}`);
    }
    
    if (error.httpStatus) {
        console.error(`HTTP Status: ${error.httpStatus}`);
    }
}

/**
 * Categorize error type
 * @param {Error} error - The error object
 * @returns {string} Error type
 */
function categorizeError(error) {
    // Discord API errors
    if (error.code && Object.values(DiscordAPIErrors).includes(error.code)) {
        return ErrorType.DISCORD_API;
    }
    
    // Database errors (SQLite specific)
    if (error.message && (
        error.message.includes('SQLITE') ||
        error.message.includes('database') ||
        error.message.includes('SQL')
    )) {
        return ErrorType.DATABASE;
    }
    
    // Permission errors
    if (error.message && (
        error.message.includes('permission') ||
        error.message.includes('Missing Access')
    )) {
        return ErrorType.PERMISSION;
    }
    
    return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error) {
    const errorType = categorizeError(error);
    
    // Handle specific Discord API errors
    if (error.code) {
        switch (error.code) {
            case DiscordAPIErrors.UNKNOWN_MESSAGE:
                return 'The message could not be found. It may have been deleted.';
            case DiscordAPIErrors.UNKNOWN_CHANNEL:
                return 'The channel could not be found. It may have been deleted.';
            case DiscordAPIErrors.UNKNOWN_GUILD:
                return 'The server could not be found.';
            case DiscordAPIErrors.UNKNOWN_USER:
                return 'The user could not be found.';
            case DiscordAPIErrors.MISSING_PERMISSIONS:
                return 'The bot does not have the required permissions to perform this action.';
            case DiscordAPIErrors.CANNOT_SEND_DM:
                return 'Could not send a direct message. The user may have DMs disabled.';
            case DiscordAPIErrors.RATE_LIMITED:
                return 'The bot is being rate limited. Please try again in a moment.';
        }
    }
    
    // Handle by error type
    switch (errorType) {
        case ErrorType.DATABASE:
            return 'A database error occurred. Please try again later.';
        case ErrorType.DISCORD_API:
            return 'A Discord API error occurred. Please try again later.';
        case ErrorType.PERMISSION:
            return 'You do not have permission to perform this action.';
        case ErrorType.NOT_FOUND:
            return 'The requested resource could not be found.';
        case ErrorType.VALIDATION:
            return 'Invalid input provided. Please check your input and try again.';
        default:
            return 'An unexpected error occurred. Please try again later.';
    }
}

/**
 * Wrap database operation with error handling
 * @param {Function} operation - Database operation to execute
 * @param {string} context - Context description
 * @returns {object} Result object with success flag and data/error
 */
export async function wrapDatabaseOperation(operation, context) {
    try {
        const result = await operation();
        return { success: true, data: result };
    } catch (error) {
        logError(context, error);
        return {
            success: false,
            error: error.message,
            userMessage: 'A database error occurred. Please try again.'
        };
    }
}

/**
 * Wrap Discord API operation with error handling
 * @param {Function} operation - Discord API operation to execute
 * @param {string} context - Context description
 * @returns {object} Result object with success flag and data/error
 */
export async function wrapDiscordOperation(operation, context) {
    try {
        const result = await operation();
        return { success: true, data: result };
    } catch (error) {
        logError(context, error);
        return {
            success: false,
            error: error.message,
            userMessage: getUserFriendlyMessage(error)
        };
    }
}

/**
 * Handle interaction error and send appropriate response
 * @param {object} interaction - Discord interaction
 * @param {Error} error - The error object
 * @param {string} context - Context description
 */
export async function handleInteractionError(interaction, error, context) {
    logError(context, error, {
        userId: interaction.user?.id,
        guildId: interaction.guildId,
        commandName: interaction.commandName,
        customId: interaction.customId
    });
    
    const userMessage = getUserFriendlyMessage(error);
    
    try {
        if (interaction.deferred) {
            await interaction.editReply({
                content: `❌ ${userMessage}`,
                embeds: [],
                components: []
            });
        } else if (interaction.replied) {
            await interaction.followUp({
                content: `❌ ${userMessage}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ ${userMessage}`,
                ephemeral: true
            });
        }
    } catch (replyError) {
        logError('handleInteractionError - Failed to send error message', replyError);
    }
}

/**
 * Check if operation is taking too long and defer reply
 * @param {object} interaction - Discord interaction
 * @param {boolean} ephemeral - Whether reply should be ephemeral
 * @returns {Promise<boolean>} True if deferred successfully
 */
export async function deferIfNeeded(interaction, ephemeral = false) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral });
            return true;
        }
        return false;
    } catch (error) {
        logError('deferIfNeeded', error);
        return false;
    }
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} Result of operation
 */
export async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors
            if (error.code === DiscordAPIErrors.MISSING_PERMISSIONS ||
                error.code === DiscordAPIErrors.UNKNOWN_CHANNEL ||
                error.code === DiscordAPIErrors.UNKNOWN_GUILD) {
                throw error;
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

/**
 * Log info message
 * @param {string} context - Context description
 * @param {string} message - Info message
 * @param {object} additionalInfo - Additional information
 */
export function logInfo(context, message, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${context}: ${message}`);
    
    if (Object.keys(additionalInfo).length > 0) {
        console.log('Details:', JSON.stringify(additionalInfo, null, 2));
    }
}

/**
 * Log warning message
 * @param {string} context - Context description
 * @param {string} message - Warning message
 * @param {object} additionalInfo - Additional information
 */
export function logWarning(context, message, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARNING] ${context}: ${message}`);
    
    if (Object.keys(additionalInfo).length > 0) {
        console.warn('Details:', JSON.stringify(additionalInfo, null, 2));
    }
}
