import { EmbedBuilder } from 'discord.js';

/**
 * Standard colors for embeds
 */
const COLORS = {
    PRIMARY: 0x5865F2,    // Discord blurple
    SUCCESS: 0x00FF00,    // Green
    ERROR: 0xFF0000,      // Red
    WARNING: 0xFFAA00,    // Orange
    INFO: 0x3498DB        // Blue
};

/**
 * Create a control panel embed
 * @param {string} title - Panel title
 * @param {string} description - Panel description
 * @returns {EmbedBuilder} Embed for control panel
 */
export function createPanelEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(COLORS.PRIMARY)
        .setTimestamp();
}

/**
 * Create a form button embed (displayed in channel with form button)
 * @param {object} form - Form object with title and description
 * @returns {EmbedBuilder} Embed for form button message
 */
export function createFormButtonEmbed(form) {
    const embed = new EmbedBuilder()
        .setTitle(form.title)
        .setColor(COLORS.INFO)
        .setTimestamp();
    
    if (form.description) {
        embed.setDescription(form.description);
    }
    
    return embed;
}

/**
 * Create a submission embed for admin channel
 * @param {object} submission - Submission data
 * @param {object} form - Form data
 * @param {object} user - Discord user object
 * @param {Array} questions - Array of question objects
 * @param {Array} answers - Array of answer objects
 * @returns {EmbedBuilder} Embed for submission in admin channel
 */
export function createSubmissionEmbed(submission, form, user, questions, answers) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle(`📋 New Form Submission: ${form.title}`)
        .setDescription(form.description || 'No description provided')
        .addFields(
            { name: '👤 User', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: '🆔 User ID', value: user.id, inline: true },
            { name: '📅 Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
    
    // Add answers as fields
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers[i];
        embed.addFields({
            name: `${i + 1}. ${question.question_text}${question.is_required ? ' *' : ''}`,
            value: answer.answerText || '_No answer provided_',
            inline: false
        });
    }
    
    embed.setFooter({ text: `Submission ID: ${submission.submission_id}` });
    
    return embed;
}

/**
 * Create a confirmation embed
 * @param {string} message - Confirmation message
 * @param {string} [title='Success'] - Embed title
 * @returns {EmbedBuilder} Success confirmation embed
 */
export function createConfirmationEmbed(message, title = '✅ Success') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(COLORS.SUCCESS)
        .setTimestamp();
}

/**
 * Create an error embed
 * @param {string} message - Error message
 * @param {string} [title='Error'] - Embed title
 * @returns {EmbedBuilder} Error embed
 */
export function createErrorEmbed(message, title = '❌ Error') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(COLORS.ERROR)
        .setTimestamp();
}

/**
 * Create a warning embed
 * @param {string} message - Warning message
 * @param {string} [title='Warning'] - Embed title
 * @returns {EmbedBuilder} Warning embed
 */
export function createWarningEmbed(message, title = '⚠️ Warning') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(COLORS.WARNING)
        .setTimestamp();
}

/**
 * Create an info embed
 * @param {string} message - Info message
 * @param {string} [title='Information'] - Embed title
 * @returns {EmbedBuilder} Info embed
 */
export function createInfoEmbed(message, title = 'ℹ️ Information') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(COLORS.INFO)
        .setTimestamp();
}

/**
 * Create a form submission confirmation embed (sent to user via DM)
 * @param {string} formTitle - Title of the form submitted
 * @returns {EmbedBuilder} Confirmation embed for user
 */
export function createUserSubmissionConfirmationEmbed(formTitle) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('✅ Form Submitted Successfully')
        .setDescription(`Your submission for **${formTitle}** has been received and is pending review.`)
        .setTimestamp();
}

/**
 * Create a review notification embed (sent to user via DM)
 * @param {string} formTitle - Title of the form
 * @param {string} action - 'approve' or 'reject'
 * @param {string} message - Custom message from admin
 * @returns {EmbedBuilder} Review notification embed
 */
export function createReviewNotificationEmbed(formTitle, action, message) {
    const isApproved = action === 'approve';
    
    return new EmbedBuilder()
        .setColor(isApproved ? COLORS.SUCCESS : COLORS.ERROR)
        .setTitle(isApproved ? '✅ Submission Approved' : '❌ Submission Rejected')
        .setDescription(`Your submission for **${formTitle}** has been ${isApproved ? 'approved' : 'rejected'}.`)
        .addFields({
            name: isApproved ? 'Approval Message' : 'Rejection Message',
            value: message,
            inline: false
        })
        .setTimestamp();
}

/**
 * Export colors for use in other modules
 */
export { COLORS };
