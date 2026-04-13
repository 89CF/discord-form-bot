import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getForm, hasUserSubmitted, getQuestions } from '../database/models.js';
import { handleInteractionError, deferIfNeeded, logWarning } from '../utils/errorHandler.js';

/**
 * Handle form button clicks from users
 * @param {Interaction} interaction - Discord button interaction
 */
export async function handleFormButton(interaction) {
    try {
        // Extract form ID from button custom_id (format: form_<formId>)
        const formId = interaction.customId.replace('form_', '');
        
        // Fetch form from database
        const form = getForm(formId);
        
        if (!form) {
            logWarning('Form Not Found', 'User tried to access non-existent form', {
                formId,
                userId: interaction.user.id
            });
            return await interaction.reply({
                content: '❌ This form no longer exists.',
                ephemeral: true
            });
        }
        
        // Check submission limit
        if (form.submission_limit === 'once') {
            const alreadySubmitted = hasUserSubmitted(formId, interaction.user.id);
            
            if (alreadySubmitted) {
                return await interaction.reply({
                    content: '❌ You have already submitted this form. Only one submission is allowed.',
                    ephemeral: true
                });
            }
        }
        
        // Fetch questions for the form
        const questions = getQuestions(formId);
        
        if (!questions || questions.length === 0) {
            logWarning('Form Has No Questions', 'User tried to submit form with no questions', {
                formId,
                userId: interaction.user.id
            });
            return await interaction.reply({
                content: '❌ This form has no questions configured.',
                ephemeral: true
            });
        }
        
        // Build modal with form questions
        const modal = new ModalBuilder()
            .setCustomId(`form_submit_${formId}`)
            .setTitle(form.title.substring(0, 45)); // Discord modal title limit
        
        // Add each question as a text input (max 5 components in modal)
        for (const question of questions.slice(0, 5)) {
            const textInput = new TextInputBuilder()
                .setCustomId(`question_${question.question_id}`)
                .setLabel(question.question_text.substring(0, 45)) // Discord label limit
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(question.is_required === 1)
                .setMaxLength(1000);
            
            const actionRow = new ActionRowBuilder().addComponents(textInput);
            modal.addComponents(actionRow);
        }
        
        // Show modal to user
        await interaction.showModal(modal);
        
    } catch (error) {
        await handleInteractionError(interaction, error, 'handleFormButton');
    }
}
