import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getForm, getQuestions, removeQuestion, addQuestion, updateForm } from '../database/models.js';

// Temporary storage for form editing data (in-memory)
// Key: userId, Value: { formId, title, description, buttonLabel, buttonColor, submissionLimit, questions: [] }
const formEditCache = new Map();

/**
 * Build the form edit panel
 * @param {string} formId - Form ID
 * @returns {object} Message payload with embed and buttons
 */
export function buildFormEditPanel(formId) {
    const form = getForm(formId);
    
    if (!form) {
        return {
            content: '❌ Form not found.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    const questions = getQuestions(formId);

    const embed = new EmbedBuilder()
        .setTitle('✏️ Edit Form')
        .setDescription(`**Form:** ${form.title}\n\nEdit your form configuration and questions.`)
        .setColor(0x5865F2)
        .addFields(
            { name: '📝 Title', value: form.title, inline: true },
            { name: '🏷️ Button Label', value: form.button_label, inline: true },
            { name: '🎨 Button Color', value: form.button_color, inline: true },
            { name: '📄 Description', value: form.description || 'No description', inline: false },
            { name: '🔢 Submission Limit', value: form.submission_limit, inline: true },
            { name: '❓ Questions', value: `${questions.length} question(s)`, inline: true },
            { name: '🎯 Target Server', value: form.target_guild_id ? `ID: ${form.target_guild_id}` : 'Not set', inline: true },
            { name: '✅ Approve Message', value: form.approve_message ? '✓ Set' : '✗ Not set', inline: true },
            { name: '❌ Reject Message', value: form.reject_message ? '✓ Set' : '✗ Not set', inline: true }
        )
        .setTimestamp();

    // Build action buttons
    const actionRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`edit_basic_info_${formId}`)
                .setLabel('Edit Basic Info')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`edit_questions_${formId}`)
                .setLabel('Manage Questions')
                .setEmoji('❓')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`edit_target_server_${formId}`)
                .setLabel('Set Target Server')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Secondary)
        );

    const actionRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`edit_review_messages_${formId}`)
                .setLabel('Set Review Messages')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Secondary)
        );

    const navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`edit_cancel_${formId}`)
                .setLabel('Back to Form')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [actionRow1, actionRow2, navRow],
        ephemeral: true
    };
}

/**
 * Get form edit data from cache
 * @param {string} userId - Discord user ID
 * @returns {object|null} Form edit data or null if not found
 */
export function getFormEditData(userId) {
    return formEditCache.get(userId) || null;
}

/**
 * Set form edit data in cache
 * @param {string} userId - Discord user ID
 * @param {object} data - Form edit data
 */
export function setFormEditData(userId, data) {
    formEditCache.set(userId, data);
}

/**
 * Clear form edit data from cache
 * @param {string} userId - Discord user ID
 */
export function clearFormEditData(userId) {
    formEditCache.delete(userId);
}

/**
 * Update form edit data in cache
 * @param {string} userId - Discord user ID
 * @param {object} data - Form data to update
 */
export function updateFormEditData(userId, data) {
    const existing = formEditCache.get(userId) || {};
    formEditCache.set(userId, { ...existing, ...data });
}


/**
 * Show modal for editing basic form information
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
export async function showEditBasicInfoModal(interaction, formId) {
    const form = getForm(formId);
    
    if (!form) {
        await interaction.reply({
            content: '❌ Form not found.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_edit_form_basic_${formId}`)
        .setTitle('Edit Form Basic Info');

    // Title input
    const titleInput = new TextInputBuilder()
        .setCustomId('form_title')
        .setLabel('Form Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Moderator Application')
        .setRequired(true)
        .setMaxLength(100)
        .setValue(form.title);

    // Description input
    const descriptionInput = new TextInputBuilder()
        .setCustomId('form_description')
        .setLabel('Form Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe what this form is for...')
        .setRequired(false)
        .setMaxLength(500)
        .setValue(form.description || '');

    // Button label input
    const buttonLabelInput = new TextInputBuilder()
        .setCustomId('button_label')
        .setLabel('Button Label')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Apply Now')
        .setRequired(true)
        .setMaxLength(80)
        .setValue(form.button_label);

    // Button color input
    const buttonColorInput = new TextInputBuilder()
        .setCustomId('button_color')
        .setLabel('Button Color')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Primary, Secondary, Success, or Danger')
        .setRequired(true)
        .setValue(form.button_color);

    // Submission limit input
    const submissionLimitInput = new TextInputBuilder()
        .setCustomId('submission_limit')
        .setLabel('Submission Limit')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('once or unlimited')
        .setRequired(true)
        .setValue(form.submission_limit);

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
 * Process basic form info edit modal submission
 * @param {object} interaction - Discord modal submit interaction
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null, data: object|null }
 */
export function processEditBasicInfo(interaction, formId) {
    const { validateFormTitle, validateFormDescription, validateButtonLabel } = require('../utils/validators.js');
    
    const title = interaction.fields.getTextInputValue('form_title');
    const description = interaction.fields.getTextInputValue('form_description');
    const buttonLabel = interaction.fields.getTextInputValue('button_label');
    const buttonColor = interaction.fields.getTextInputValue('button_color');
    const submissionLimit = interaction.fields.getTextInputValue('submission_limit');

    // Validate title
    const titleValidation = validateFormTitle(title);
    if (!titleValidation.valid) {
        return { success: false, error: titleValidation.error, data: null };
    }

    // Validate description
    const descriptionValidation = validateFormDescription(description);
    if (!descriptionValidation.valid) {
        return { success: false, error: descriptionValidation.error, data: null };
    }

    // Validate button label
    const buttonLabelValidation = validateButtonLabel(buttonLabel);
    if (!buttonLabelValidation.valid) {
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

    // Update form in database
    const { updateForm } = require('../database/models.js');
    const updatedForm = updateForm(formId, {
        title: title.trim(),
        description: description.trim() || null,
        buttonLabel: buttonLabel.trim(),
        buttonColor: normalizedColor,
        submissionLimit: normalizedLimit
    });

    return { success: true, error: null, data: updatedForm };
}

/**
 * Build question management panel for editing
 * @param {string} formId - Form ID
 * @returns {object} Message payload with embed and buttons
 */
export function buildQuestionManagementPanel(formId) {
    const form = getForm(formId);
    
    if (!form) {
        return {
            content: '❌ Form not found.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    const questions = getQuestions(formId);

    const embed = new EmbedBuilder()
        .setTitle('❓ Manage Questions')
        .setDescription(`**Form:** ${form.title}\n\nManage questions for your form (1-5 questions required)`)
        .setColor(0x5865F2);

    // Display current questions
    if (questions.length > 0) {
        const questionsText = questions.map((q, index) => {
            const required = q.is_required === 1 ? '✅ Required' : '⬜ Optional';
            return `**${index + 1}.** ${q.question_text} (${required})`;
        }).join('\n');
        
        embed.addFields({
            name: `Current Questions (${questions.length}/5)`,
            value: questionsText
        });
    } else {
        embed.addFields({
            name: 'Current Questions (0/5)',
            value: 'No questions. You must have at least 1 question.'
        });
    }

    // Build buttons
    const buttons = [];
    
    // Add Question button (disabled if 5 questions already)
    const addButton = new ButtonBuilder()
        .setCustomId(`edit_question_add_${formId}`)
        .setLabel('Add Question')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success)
        .setDisabled(questions.length >= 5);
    
    buttons.push(addButton);

    // Remove Last Question button (disabled if 1 or fewer questions)
    const removeButton = new ButtonBuilder()
        .setCustomId(`edit_question_remove_${formId}`)
        .setLabel('Remove Last')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(questions.length <= 1);
    
    buttons.push(removeButton);

    const row1 = new ActionRowBuilder().addComponents(buttons);

    // Back button
    const backButton = new ButtonBuilder()
        .setCustomId(`edit_questions_back_${formId}`)
        .setLabel('Back to Edit Form')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary);

    const row2 = new ActionRowBuilder().addComponents(backButton);

    return {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    };
}

/**
 * Show modal for adding a question during edit
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
export async function showAddQuestionModalForEdit(interaction, formId) {
    const questions = getQuestions(formId);
    
    // Check if already at max questions
    if (questions.length >= 5) {
        await interaction.reply({
            content: '❌ You cannot add more than 5 questions to a form.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_edit_add_question_${formId}`)
        .setTitle(`Add Question ${questions.length + 1}`);

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
 * Process add question modal submission during edit
 * @param {object} interaction - Discord modal submit interaction
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null }
 */
export function processAddQuestionForEdit(interaction, formId) {
    const { validateQuestionText, validateQuestionCount } = require('../utils/validators.js');
    
    const questionText = interaction.fields.getTextInputValue('question_text');
    const requiredInput = interaction.fields.getTextInputValue('question_required');

    // Validate question text
    const validation = validateQuestionText(questionText);
    if (!validation.valid) {
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
    const questions = getQuestions(formId);
    const countValidation = validateQuestionCount(questions.length + 1);
    if (!countValidation.valid) {
        return { success: false, error: countValidation.error };
    }

    // Add question to database
    const { addQuestion } = require('../database/models.js');
    addQuestion({
        formId: formId,
        questionText: questionText.trim(),
        isRequired: isRequired,
        order: questions.length
    });

    return { success: true, error: null };
}

/**
 * Remove the last question from the form during edit
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null }
 */
export function removeLastQuestionForEdit(formId) {
    const questions = getQuestions(formId);
    
    // Validate at least 1 question remains
    if (questions.length <= 1) {
        return { success: false, error: 'Form must have at least 1 question' };
    }

    // Remove the last question
    const lastQuestion = questions[questions.length - 1];
    removeQuestion(lastQuestion.question_id);

    return { success: true, error: null };
}

/**
 * Update the deployed form button message with new configuration
 * @param {object} client - Discord client
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null }
 */
export async function updateDeployedFormButton(client, formId) {
    const form = getForm(formId);
    
    if (!form) {
        return { success: false, error: 'Form not found' };
    }

    // Check if form has a deployed button
    if (!form.button_message_id || !form.button_channel_id) {
        return { success: false, error: 'Form does not have a deployed button' };
    }

    try {
        // Fetch the channel
        const channel = await client.channels.fetch(form.button_channel_id);
        
        if (!channel) {
            return { success: false, error: 'Button channel not found' };
        }

        // Fetch the message
        const message = await channel.messages.fetch(form.button_message_id);
        
        if (!message) {
            return { success: false, error: 'Button message not found' };
        }

        // Build updated button with new configuration
        const buttonStyleMap = {
            'Primary': ButtonStyle.Primary,
            'Secondary': ButtonStyle.Secondary,
            'Success': ButtonStyle.Success,
            'Danger': ButtonStyle.Danger
        };

        const button = new ButtonBuilder()
            .setCustomId(`form_button_${formId}`)
            .setLabel(form.button_label)
            .setStyle(buttonStyleMap[form.button_color] || ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        // Build updated embed
        const embed = new EmbedBuilder()
            .setTitle(form.title)
            .setDescription(form.description || 'Click the button below to fill out this form.')
            .setColor(0x5865F2)
            .setTimestamp();

        // Update the message
        await message.edit({
            embeds: [embed],
            components: [row]
        });

        return { success: true, error: null };

    } catch (error) {
        console.error('Error updating deployed form button:', error);
        
        // Handle specific error cases
        if (error.code === 10008) {
            return { success: false, error: 'Button message was deleted' };
        } else if (error.code === 10003) {
            return { success: false, error: 'Button channel was deleted' };
        } else if (error.code === 50001) {
            return { success: false, error: 'Bot does not have access to the channel' };
        } else if (error.code === 50013) {
            return { success: false, error: 'Bot does not have permission to edit the message' };
        }
        
        return { success: false, error: `Failed to update button: ${error.message}` };
    }
}


/**
 * Show modal for setting target server
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
export async function showSetTargetServerModal(interaction, formId) {
    const form = getForm(formId);
    
    if (!form) {
        await interaction.reply({
            content: '❌ Form not found.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_set_target_server_${formId}`)
        .setTitle('Set Target Server');

    const guildIdInput = new TextInputBuilder()
        .setCustomId('target_guild_id')
        .setLabel('Target Server ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter server ID (or leave empty to disable)')
        .setRequired(false)
        .setMaxLength(20);
    
    if (form.target_guild_id) {
        guildIdInput.setValue(form.target_guild_id);
    }

    const row = new ActionRowBuilder().addComponents(guildIdInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

/**
 * Process set target server modal submission
 * @param {object} interaction - Discord modal submit interaction
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null }
 */
export function processSetTargetServer(interaction, formId) {
    const targetGuildId = interaction.fields.getTextInputValue('target_guild_id').trim();
    
    // If empty, remove target server
    if (!targetGuildId) {
        updateForm(formId, { targetGuildId: null });
        return { success: true, error: null, message: '✅ Target server removed.' };
    }
    
    // Validate guild ID format (should be numeric and 17-20 digits)
    if (!/^\d{17,20}$/.test(targetGuildId)) {
        return { 
            success: false, 
            error: 'Invalid server ID format. Server IDs are 17-20 digit numbers.',
            message: null
        };
    }
    
    // Check if bot is in the target guild
    const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
    if (!targetGuild) {
        return { 
            success: false, 
            error: `Bot is not in the server with ID ${targetGuildId}. Please add the bot to that server first.`,
            message: null
        };
    }
    
    // Check if bot has Create Instant Invite permission
    const botMember = targetGuild.members.cache.get(interaction.client.user.id);
    if (!botMember) {
        return { 
            success: false, 
            error: 'Could not verify bot permissions in target server.',
            message: null
        };
    }
    
    // Find a channel where bot can create invites
    const inviteChannel = targetGuild.channels.cache.find(
        ch => ch.type === 0 && ch.permissionsFor(botMember).has('CreateInstantInvite')
    );
    
    if (!inviteChannel) {
        return { 
            success: false, 
            error: `Bot does not have "Create Instant Invite" permission in any channel of **${targetGuild.name}**. Please grant this permission.`,
            message: null
        };
    }
    
    // Save to database
    updateForm(formId, { targetGuildId });
    
    return { 
        success: true, 
        error: null, 
        message: `✅ Target server set to **${targetGuild.name}** (${targetGuildId})`
    };
}


/**
 * Show modal for setting review messages
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
export async function showSetReviewMessagesModal(interaction, formId) {
    const form = getForm(formId);
    
    if (!form) {
        await interaction.reply({
            content: '❌ Form not found.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_set_review_messages_${formId}`)
        .setTitle('Set Review Messages');

    const approveInput = new TextInputBuilder()
        .setCustomId('approve_message')
        .setLabel('Approve Message')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Message sent to users when approved (leave empty to ask each time)')
        .setRequired(false)
        .setMaxLength(1000);
    
    if (form.approve_message) {
        approveInput.setValue(form.approve_message);
    }

    const rejectInput = new TextInputBuilder()
        .setCustomId('reject_message')
        .setLabel('Reject Message')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Message sent to users when rejected (leave empty to ask each time)')
        .setRequired(false)
        .setMaxLength(1000);
    
    if (form.reject_message) {
        rejectInput.setValue(form.reject_message);
    }

    const row1 = new ActionRowBuilder().addComponents(approveInput);
    const row2 = new ActionRowBuilder().addComponents(rejectInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
}

/**
 * Process set review messages modal submission
 * @param {object} interaction - Discord modal submit interaction
 * @param {string} formId - Form ID
 * @returns {object} { success: boolean, error: string|null, message: string }
 */
export function processSetReviewMessages(interaction, formId) {
    const approveMessage = interaction.fields.getTextInputValue('approve_message').trim();
    const rejectMessage = interaction.fields.getTextInputValue('reject_message').trim();
    
    // Update form with new messages (null if empty)
    updateForm(formId, { 
        approveMessage: approveMessage || null,
        rejectMessage: rejectMessage || null
    });
    
    let message = '✅ Review messages updated!\n\n';
    
    if (approveMessage) {
        message += '✅ Approve message: Set (will be used automatically)\n';
    } else {
        message += '✅ Approve message: Not set (will ask each time)\n';
    }
    
    if (rejectMessage) {
        message += '❌ Reject message: Set (will be used automatically)';
    } else {
        message += '❌ Reject message: Not set (will ask each time)';
    }
    
    return { 
        success: true, 
        error: null, 
        message
    };
}
