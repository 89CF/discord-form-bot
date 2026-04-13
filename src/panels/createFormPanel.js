import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { validateFormTitle, validateFormDescription, validateButtonLabel } from '../utils/validators.js';

// Temporary storage for form creation data (in-memory)
// Key: userId, Value: { title, description, buttonLabel, buttonColor, submissionLimit, questions: [] }
const formCreationCache = new Map();

/**
 * Show modal for basic form information
 * @param {object} interaction - Discord interaction
 */
export async function showFormBasicInfoModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_create_form_basic')
        .setTitle('Create New Form');

    // Title input
    const titleInput = new TextInputBuilder()
        .setCustomId('form_title')
        .setLabel('Form Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Moderator Application')
        .setRequired(true)
        .setMaxLength(100);

    // Description input
    const descriptionInput = new TextInputBuilder()
        .setCustomId('form_description')
        .setLabel('Form Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe what this form is for...')
        .setRequired(false)
        .setMaxLength(500);

    // Button label input
    const buttonLabelInput = new TextInputBuilder()
        .setCustomId('button_label')
        .setLabel('Button Label')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Apply Now')
        .setRequired(true)
        .setMaxLength(80);

    // Button color input
    const buttonColorInput = new TextInputBuilder()
        .setCustomId('button_color')
        .setLabel('Button Color')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Primary, Secondary, Success, or Danger')
        .setRequired(true)
        .setValue('Primary');

    // Submission limit input
    const submissionLimitInput = new TextInputBuilder()
        .setCustomId('submission_limit')
        .setLabel('Submission Limit')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('once or unlimited')
        .setRequired(true)
        .setValue('once');

    // Add inputs to action rows
    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(descriptionInput);
    const row3 = new ActionRowBuilder().addComponents(buttonLabelInput);
    const row4 = new ActionRowBuilder().addComponents(buttonColorInput);
    const row5 = new ActionRowBuilder().addComponents(submissionLimitInput);

    modal.addComponents(row1, row2, row3, row4, row5);

    await interaction.showModal(modal);
}

/**
 * Process basic form info modal submission
 * @param {object} interaction - Discord modal submit interaction
 * @returns {object} { success: boolean, error: string|null, data: object|null }
 */
export function processFormBasicInfo(interaction) {
    const title = interaction.fields.getTextInputValue('form_title');
    const description = interaction.fields.getTextInputValue('form_description');
    const buttonLabel = interaction.fields.getTextInputValue('button_label');
    const buttonColor = interaction.fields.getTextInputValue('button_color');
    const submissionLimit = interaction.fields.getTextInputValue('submission_limit');

    // Validate title
    const titleValidation = validateFormTitle(title);
    if (!titleValidation.success) {
        return { success: false, error: titleValidation.error, data: null };
    }

    // Validate description
    const descriptionValidation = validateFormDescription(description);
    if (!descriptionValidation.success) {
        return { success: false, error: descriptionValidation.error, data: null };
    }

    // Validate button label
    const buttonLabelValidation = validateButtonLabel(buttonLabel);
    if (!buttonLabelValidation.success) {
        return { success: false, error: buttonLabelValidation.error, data: null };
    }

    // Validate button color
    const validColors = ['Primary', 'Secondary', 'Success', 'Danger'];
    const normalizedColor = buttonColor.charAt(0).toUpperCase() + buttonColor.slice(1).toLowerCase();
    
    if (!validColors.includes(normalizedColor)) {
        return { 
            success: false, 
            error: 'Button color must be Primary, Secondary, Success, or Danger', 
            data: null 
        };
    }

    // Validate submission limit
    const normalizedLimit = submissionLimit.toLowerCase();
    if (normalizedLimit !== 'once' && normalizedLimit !== 'unlimited') {
        return { 
            success: false, 
            error: 'Submission limit must be "once" or "unlimited"', 
            data: null 
        };
    }

    // Store form data temporarily
    const formData = {
        title: title.trim(),
        description: description.trim() || null,
        buttonLabel: buttonLabel.trim(),
        buttonColor: normalizedColor,
        submissionLimit: normalizedLimit,
        questions: []
    };

    formCreationCache.set(interaction.user.id, formData);

    return { success: true, error: null, data: formData };
}

/**
 * Get form creation data from cache
 * @param {string} userId - Discord user ID
 * @returns {object|null} Form data or null if not found
 */
export function getFormCreationData(userId) {
    return formCreationCache.get(userId) || null;
}

/**
 * Update form creation data in cache
 * @param {string} userId - Discord user ID
 * @param {object} data - Form data to update
 */
export function updateFormCreationData(userId, data) {
    const existing = formCreationCache.get(userId) || {};
    formCreationCache.set(userId, { ...existing, ...data });
}

/**
 * Clear form creation data from cache
 * @param {string} userId - Discord user ID
 */
export function clearFormCreationData(userId) {
    formCreationCache.delete(userId);
}

/**
 * Add question to form creation data
 * @param {string} userId - Discord user ID
 * @param {object} question - Question data { questionText, isRequired }
 */
export function addQuestionToForm(userId, question) {
    const formData = formCreationCache.get(userId);
    if (formData) {
        formData.questions.push(question);
        formCreationCache.set(userId, formData);
    }
}

/**
 * Remove question from form creation data
 * @param {string} userId - Discord user ID
 * @param {number} index - Question index
 */
export function removeQuestionFromForm(userId, index) {
    const formData = formCreationCache.get(userId);
    if (formData && formData.questions[index]) {
        formData.questions.splice(index, 1);
        formCreationCache.set(userId, formData);
    }
}
