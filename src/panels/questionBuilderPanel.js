import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { getFormCreationData, addQuestionToForm, removeQuestionFromForm } from './createFormPanel.js';
import { validateQuestionText, validateQuestionCount } from '../utils/validators.js';

/**
 * Build question builder panel
 * @param {string} userId - Discord user ID
 * @returns {object} Message payload with embed and buttons
 */
export function buildQuestionBuilderPanel(userId) {
    const formData = getFormCreationData(userId);
    
    if (!formData) {
        return {
            content: '❌ Form creation session expired. Please start over.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    const embed = new EmbedBuilder()
        .setTitle('📝 Build Your Form Questions')
        .setDescription(`**Form:** ${formData.title}\n\nAdd questions to your form (1-5 questions required)`)
        .setColor(0x5865F2);

    // Display current questions
    if (formData.questions.length > 0) {
        const questionsText = formData.questions.map((q, index) => {
            const required = q.isRequired ? '✅ Required' : '⬜ Optional';
            return `**${index + 1}.** ${q.questionText} (${required})`;
        }).join('\n');
        
        embed.addFields({
            name: `Current Questions (${formData.questions.length}/5)`,
            value: questionsText
        });
    } else {
        embed.addFields({
            name: 'Current Questions (0/5)',
            value: 'No questions added yet. Click "Add Question" to start.'
        });
    }

    // Build buttons
    const buttons = [];
    
    // Add Question button (disabled if 5 questions already)
    const addButton = new ButtonBuilder()
        .setCustomId('question_add')
        .setLabel('Add Question')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success)
        .setDisabled(formData.questions.length >= 5);
    
    buttons.push(addButton);

    // Remove Last Question button (disabled if no questions)
    const removeButton = new ButtonBuilder()
        .setCustomId('question_remove_last')
        .setLabel('Remove Last')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(formData.questions.length === 0);
    
    buttons.push(removeButton);

    // Continue button (disabled if no questions)
    const continueButton = new ButtonBuilder()
        .setCustomId('question_continue')
        .setLabel('Continue to Preview')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(formData.questions.length === 0);
    
    buttons.push(continueButton);

    // Cancel button
    const cancelButton = new ButtonBuilder()
        .setCustomId('question_cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary);
    
    buttons.push(cancelButton);

    const row = new ActionRowBuilder().addComponents(buttons);

    return {
        embeds: [embed],
        components: [row],
        ephemeral: true
    };
}

/**
 * Show modal for adding a question
 * @param {object} interaction - Discord interaction
 */
export async function showAddQuestionModal(interaction) {
    const formData = getFormCreationData(interaction.user.id);
    
    if (!formData) {
        await interaction.reply({
            content: '❌ Form creation session expired. Please start over.',
            ephemeral: true
        });
        return;
    }

    // Check if already at max questions
    if (formData.questions.length >= 5) {
        await interaction.reply({
            content: '❌ You cannot add more than 5 questions to a form.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('modal_add_question')
        .setTitle(`Add Question ${formData.questions.length + 1}`);

    // Question text input
    const questionTextInput = new TextInputBuilder()
        .setCustomId('question_text')
        .setLabel('Question Text')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., What is your Discord username?')
        .setRequired(true)
        .setMaxLength(45); // Discord modal label limit

    // Required flag input
    const requiredInput = new TextInputBuilder()
        .setCustomId('question_required')
        .setLabel('Is this question required?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('yes or no')
        .setRequired(true)
        .setValue('yes');

    const row1 = new ActionRowBuilder().addComponents(questionTextInput);
    const row2 = new ActionRowBuilder().addComponents(requiredInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
}

/**
 * Process add question modal submission
 * @param {object} interaction - Discord modal submit interaction
 * @returns {object} { success: boolean, error: string|null }
 */
export function processAddQuestion(interaction) {
    const questionText = interaction.fields.getTextInputValue('question_text');
    const requiredInput = interaction.fields.getTextInputValue('question_required');

    // Validate question text
    const validation = validateQuestionText(questionText);
    if (!validation.success) {
        return { success: false, error: validation.error };
    }

    // Parse required flag
    const normalizedRequired = requiredInput.toLowerCase().trim();
    let isRequired = true;
    
    if (normalizedRequired === 'no' || normalizedRequired === 'n' || normalizedRequired === 'false') {
        isRequired = false;
    } else if (normalizedRequired !== 'yes' && normalizedRequired !== 'y' && normalizedRequired !== 'true') {
        return { success: false, error: 'Required field must be "yes" or "no"' };
    }

    // Check question count
    const formData = getFormCreationData(interaction.user.id);
    if (!formData) {
        return { success: false, error: 'Form creation session expired' };
    }

    const countValidation = validateQuestionCount(formData.questions.length + 1);
    if (!countValidation.success) {
        return { success: false, error: countValidation.error };
    }

    // Add question to form data
    addQuestionToForm(interaction.user.id, {
        questionText: questionText.trim(),
        isRequired: isRequired
    });

    return { success: true, error: null };
}

/**
 * Remove the last question from the form
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if removed successfully
 */
export function removeLastQuestion(userId) {
    const formData = getFormCreationData(userId);
    if (!formData || formData.questions.length === 0) {
        return false;
    }

    removeQuestionFromForm(userId, formData.questions.length - 1);
    return true;
}
