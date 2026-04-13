import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getForm, listSubmissions, getSubmission } from '../database/models.js';

const SUBMISSIONS_PER_PAGE = 5;

/**
 * Build the submissions viewer panel with pagination
 * @param {string} formId - Form ID
 * @param {number} page - Current page (0-indexed)
 * @returns {object} Message payload with embed and buttons
 */
export function buildSubmissionsPanel(formId, page = 0) {
    const form = getForm(formId);

    if (!form) {
        return {
            content: '❌ Form not found.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    // Get all submissions for this form
    const allSubmissions = listSubmissions(formId);
    const totalSubmissions = allSubmissions.length;
    const totalPages = Math.ceil(totalSubmissions / SUBMISSIONS_PER_PAGE);

    // Ensure page is within bounds
    page = Math.max(0, Math.min(page, totalPages - 1));

    const embed = new EmbedBuilder()
        .setTitle(`📊 Submissions for "${form.title}"`)
        .setColor(0x5865F2)
        .setTimestamp();

    // If no submissions
    if (totalSubmissions === 0) {
        embed.setDescription('No submissions yet for this form.');

        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`form_back_list_${formId}`)
                    .setLabel('Back to Form')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );

        return {
            embeds: [embed],
            components: [backRow],
            ephemeral: true
        };
    }

    // Get submissions for current page
    const offset = page * SUBMISSIONS_PER_PAGE;
    const pageSubmissions = allSubmissions.slice(offset, offset + SUBMISSIONS_PER_PAGE);

    // Build description with submission list
    let description = `**Total Submissions:** ${totalSubmissions}\n`;
    description += `**Page ${page + 1} of ${totalPages}**\n\n`;

    // Add each submission as a field
    for (const submission of pageSubmissions) {
        const fullSubmission = getSubmission(submission.submission_id);
        
        // Status emoji
        const statusEmoji = {
            'pending': '⏳',
            'approved': '✅',
            'rejected': '❌'
        }[submission.status] || '❓';

        // Format timestamp
        const timestamp = new Date(submission.submitted_at).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Build field value with answers
        let fieldValue = `**User:** <@${submission.user_id}>\n`;
        fieldValue += `**Status:** ${statusEmoji} ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}\n`;
        fieldValue += `**Submitted:** ${timestamp}\n`;

        if (submission.reviewed_by) {
            fieldValue += `**Reviewed by:** <@${submission.reviewed_by}>\n`;
        }

        // Add answers
        if (fullSubmission && fullSubmission.answers && fullSubmission.answers.length > 0) {
            fieldValue += '\n**Answers:**\n';
            for (const answer of fullSubmission.answers) {
                const answerText = answer.answer_text.length > 100 
                    ? answer.answer_text.substring(0, 97) + '...' 
                    : answer.answer_text;
                fieldValue += `• ${answer.question_text}: ${answerText}\n`;
            }
        }

        embed.addFields({
            name: `Submission #${allSubmissions.indexOf(submission) + 1}`,
            value: fieldValue,
            inline: false
        });
    }

    // Build navigation buttons
    const components = [];

    // Pagination row (if needed)
    if (totalPages > 1) {
        const paginationRow = new ActionRowBuilder();

        if (page > 0) {
            paginationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`submissions_page_${formId}_${page - 1}`)
                    .setLabel('Previous')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (page < totalPages - 1) {
            paginationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`submissions_page_${formId}_${page + 1}`)
                    .setLabel('Next')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (paginationRow.components.length > 0) {
            components.push(paginationRow);
        }
    }

    // Back button row
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`form_back_list_${formId}`)
                .setLabel('Back to Form')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );

    components.push(backRow);

    return {
        embeds: [embed],
        components: components,
        ephemeral: true
    };
}
