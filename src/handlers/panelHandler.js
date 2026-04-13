import { buildMainPanel } from '../panels/mainPanel.js';
import { showFormBasicInfoModal } from '../panels/createFormPanel.js';
import { 
    buildQuestionBuilderPanel, 
    showAddQuestionModal, 
    removeLastQuestion 
} from '../panels/questionBuilderPanel.js';
import { 
    buildFormPreviewPanel, 
    buildChannelSelectionPanel 
} from '../panels/formPreviewPanel.js';
import { buildFormListPanel } from '../panels/formListPanel.js';
import { handleInteractionError, logWarning } from '../utils/errorHandler.js';
import { allowedGuildId } from '../index.js';

/**
 * Handle panel button interactions
 * @param {object} interaction - Discord button interaction
 */
export async function handlePanelInteraction(interaction) {
    try {
        // Check if bot is locked to a specific guild
        if (allowedGuildId && interaction.guildId !== allowedGuildId) {
            return await interaction.reply({
                content: '❌ This bot is not authorized to run in this server.',
                ephemeral: true
            });
        }

        const customId = interaction.customId;

        // Handle buttons that need modals (don't defer these)
        if (customId === 'panel_create_form') {
            await handleCreateForm(interaction);
            return;
        }

        if (customId === 'question_add') {
            await handleAddQuestion(interaction);
            return;
        }

        // Handle edit form modals
        if (customId.startsWith('edit_basic_info_')) {
            await handleEditBasicInfo(interaction, customId.replace('edit_basic_info_', ''));
            return;
        }

        if (customId.startsWith('edit_question_add_')) {
            await handleEditQuestionAdd(interaction, customId.replace('edit_question_add_', ''));
            return;
        }

        if (customId.startsWith('edit_target_server_')) {
            await handleEditTargetServer(interaction, customId.replace('edit_target_server_', ''));
            return;
        }

        if (customId.startsWith('edit_review_messages_')) {
            await handleEditReviewMessages(interaction, customId.replace('edit_review_messages_', ''));
            return;
        }

        // Defer the reply for all other buttons
        await interaction.deferUpdate();

        // Route to appropriate panel based on button clicked
        switch (customId) {
            case 'panel_manage_forms':
                await handleManageForms(interaction);
                break;
            
            case 'panel_settings':
                await handleSettings(interaction);
                break;
            
            case 'panel_statistics':
                await handleStatistics(interaction);
                break;
            
            case 'panel_back_main':
                await handleBackToMain(interaction);
                break;

            case 'settings_change_channel':
                await handleSettingsChangeChannel(interaction);
                break;

            case 'settings_configure_notifications':
                await handleSettingsConfigureNotifications(interaction);
                break;

            case 'settings_back':
                await handleSettingsBack(interaction);
                break;

            // Question builder buttons
            case 'question_remove_last':
                await handleRemoveLastQuestion(interaction);
                break;

            case 'question_continue':
                await handleQuestionContinue(interaction);
                break;

            case 'question_cancel':
                await handleQuestionCancel(interaction);
                break;

            // Preview buttons
            case 'preview_deploy':
                await handlePreviewDeploy(interaction);
                break;

            case 'preview_back':
                await handlePreviewBack(interaction);
                break;

            case 'preview_cancel':
            case 'channel_cancel':
                await handleBackToMain(interaction);
                break;
            
            // Form management buttons (dynamic IDs)
            default:
                // Handle dynamic button IDs (check more specific patterns first!)
                if (customId.startsWith('form_delete_confirm_')) {
                    await handleFormDeleteConfirm(interaction, customId.replace('form_delete_confirm_', ''));
                } else if (customId.startsWith('form_delete_cancel_')) {
                    await handleFormDeleteCancel(interaction, customId.replace('form_delete_cancel_', ''));
                } else if (customId.startsWith('form_delete_')) {
                    await handleFormDelete(interaction, customId.replace('form_delete_', ''));
                } else if (customId.startsWith('form_edit_')) {
                    await handleFormEdit(interaction, customId.replace('form_edit_', ''));
                } else if (customId.startsWith('form_submissions_')) {
                    await handleFormSubmissions(interaction, customId.replace('form_submissions_', ''));
                } else if (customId.startsWith('submissions_page_')) {
                    await handleSubmissionsPage(interaction, customId);
                } else if (customId.startsWith('form_back_list_')) {
                    await handleFormBackList(interaction, customId.replace('form_back_list_', ''));
                } else if (customId.startsWith('edit_questions_')) {
                    await handleEditQuestions(interaction, customId.replace('edit_questions_', ''));
                } else if (customId.startsWith('edit_question_remove_')) {
                    await handleEditQuestionRemove(interaction, customId.replace('edit_question_remove_', ''));
                } else if (customId.startsWith('edit_questions_back_')) {
                    await handleEditQuestionsBack(interaction, customId.replace('edit_questions_back_', ''));
                } else if (customId.startsWith('edit_cancel_')) {
                    await handleEditCancel(interaction, customId.replace('edit_cancel_', ''));
                } else {
                    logWarning('Unknown Panel Button', `Button: ${customId}`, {
                        userId: interaction.user.id,
                        guildId: interaction.guildId
                    });
                    await interaction.editReply({
                        content: '❌ Unknown action. Please try again.',
                        embeds: [],
                        components: []
                    });
                }
        }

    } catch (error) {
        await handleInteractionError(interaction, error, 'handlePanelInteraction');
    }
}

/**
 * Handle "Create New Form" button
 * @param {object} interaction - Discord interaction
 */
async function handleCreateForm(interaction) {
    await showFormBasicInfoModal(interaction);
}

/**
 * Handle "Manage Forms" button
 * @param {object} interaction - Discord interaction
 */
async function handleManageForms(interaction) {
    const guildId = interaction.guild.id;
    const panelPayload = buildFormListPanel(guildId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Settings" button
 * @param {object} interaction - Discord interaction
 */
async function handleSettings(interaction) {
    const { buildSettingsPanel } = await import('../panels/settingsPanel.js');
    const panelPayload = buildSettingsPanel(interaction.guild.id, interaction.guild);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Statistics" button
 * @param {object} interaction - Discord interaction
 */
async function handleStatistics(interaction) {
    // Placeholder for future implementation
    await interaction.editReply({
        content: '🚧 Statistics panel will be implemented in a future task.',
        embeds: [],
        components: []
    });
}

/**
 * Handle "Back" button to return to main panel
 * @param {object} interaction - Discord interaction
 */
async function handleBackToMain(interaction) {
    const panelPayload = buildMainPanel();
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Add Question" button
 * @param {object} interaction - Discord interaction
 */
async function handleAddQuestion(interaction) {
    await showAddQuestionModal(interaction);
}

/**
 * Handle "Remove Last Question" button
 * @param {object} interaction - Discord interaction
 */
async function handleRemoveLastQuestion(interaction) {
    const success = removeLastQuestion(interaction.user.id);
    
    if (success) {
        const panelPayload = buildQuestionBuilderPanel(interaction.user.id);
        await interaction.editReply(panelPayload);
    } else {
        await interaction.editReply({
            content: '❌ No questions to remove.',
            embeds: [],
            components: [],
            ephemeral: true
        });
    }
}

/**
 * Handle "Continue to Preview" button
 * @param {object} interaction - Discord interaction
 */
async function handleQuestionContinue(interaction) {
    const panelPayload = buildFormPreviewPanel(interaction.user.id);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Cancel" button in question builder
 * @param {object} interaction - Discord interaction
 */
async function handleQuestionCancel(interaction) {
    await interaction.editReply({
        content: '❌ Form creation cancelled.',
        embeds: [],
        components: [],
        ephemeral: true
    });
}

/**
 * Handle "Deploy Form" button
 * @param {object} interaction - Discord interaction
 */
async function handlePreviewDeploy(interaction) {
    const panelPayload = buildChannelSelectionPanel(interaction);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Back to Questions" button
 * @param {object} interaction - Discord interaction
 */
async function handlePreviewBack(interaction) {
    const panelPayload = buildQuestionBuilderPanel(interaction.user.id);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Edit Form" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormEdit(interaction, formId) {
    const { buildFormEditPanel } = await import('../panels/editFormPanel.js');
    const panelPayload = buildFormEditPanel(formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "View Submissions" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormSubmissions(interaction, formId) {
    const { buildSubmissionsPanel } = await import('../panels/submissionsPanel.js');
    const panelPayload = buildSubmissionsPanel(formId, 0);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Delete Form" button - show confirmation
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormDelete(interaction, formId) {
    console.log('=== handleFormDelete ===');
    console.log('Form ID:', formId);
    
    const { getForm } = await import('../database/models.js');
    const form = getForm(formId);
    
    console.log('Form found:', !!form);
    if (form) {
        console.log('Form title:', form.title);
    }

    if (!form) {
        await interaction.editReply({
            content: '❌ Form not found.',
            embeds: [],
            components: []
        });
        return;
    }

    // Check permissions: user must be form creator or server administrator
    const isCreator = form.creator_id === interaction.user.id;
    const isAdmin = interaction.member.permissions.has('Administrator');

    if (!isCreator && !isAdmin) {
        await interaction.editReply({
            content: '❌ You do not have permission to delete this form. Only the form creator or server administrators can delete forms.',
            embeds: [],
            components: []
        });
        return;
    }

    // Show confirmation dialog
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Form Deletion')
        .setDescription(
            `Are you sure you want to delete the form **"${form.title}"**?\n\n` +
            `This will permanently delete:\n` +
            `• The form and all its questions\n` +
            `• All submissions and answers\n` +
            `• The form button message\n\n` +
            `**This action cannot be undone!**`
        )
        .setColor(0xFF0000)
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`form_delete_confirm_${formId}`)
                .setLabel('Yes, Delete Form')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`form_delete_cancel_${formId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

/**
 * Handle form deletion confirmation
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormDeleteConfirm(interaction, formId) {
    const { getForm, deleteForm } = await import('../database/models.js');
    const form = getForm(formId);

    if (!form) {
        await interaction.editReply({
            content: '❌ Form not found.',
            embeds: [],
            components: []
        });
        return;
    }

    // Try to disable the button message
    if (form.button_message_id && form.button_channel_id) {
        try {
            const channel = await interaction.guild.channels.fetch(form.button_channel_id);
            if (channel) {
                const message = await channel.messages.fetch(form.button_message_id);
                if (message) {
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
                    const disabledButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('form_disabled')
                                .setLabel('Form Deleted')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    
                    await message.edit({ components: [disabledButton] });
                }
            }
        } catch (error) {
            console.error('Error disabling form button:', error);
        }
    }

    // Delete the form
    const deleted = deleteForm(formId);

    if (deleted) {
        const panelPayload = buildFormListPanel(interaction.guild.id);
        await interaction.editReply({
            content: `✅ Form **"${form.title}"** has been successfully deleted.`,
            ...panelPayload
        });
    } else {
        await interaction.editReply({
            content: '❌ Failed to delete form. Please try again.',
            embeds: [],
            components: []
        });
    }
}

/**
 * Handle form deletion cancellation
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormDeleteCancel(interaction, formId) {
    const panelPayload = buildFormListPanel(interaction.guild.id, formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle submissions pagination
 * @param {object} interaction - Discord interaction
 * @param {string} customId - Button custom ID containing page info
 */
async function handleSubmissionsPage(interaction, customId) {
    const parts = customId.split('_');
    const page = parseInt(parts[parts.length - 1]);
    const formId = parts.slice(2, -1).join('_');

    const { buildSubmissionsPanel } = await import('../panels/submissionsPanel.js');
    const panelPayload = buildSubmissionsPanel(formId, page);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Back to Form" button from submissions viewer
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleFormBackList(interaction, formId) {
    const panelPayload = buildFormListPanel(interaction.guild.id, formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Edit Basic Info" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditBasicInfo(interaction, formId) {
    const { showEditBasicInfoModal } = await import('../panels/editFormPanel.js');
    await showEditBasicInfoModal(interaction, formId);
}

/**
 * Handle "Manage Questions" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditQuestions(interaction, formId) {
    const { buildQuestionManagementPanel } = await import('../panels/editFormPanel.js');
    const panelPayload = buildQuestionManagementPanel(formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Add Question" button during edit
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditQuestionAdd(interaction, formId) {
    const { showAddQuestionModalForEdit } = await import('../panels/editFormPanel.js');
    await showAddQuestionModalForEdit(interaction, formId);
}

/**
 * Handle "Remove Last Question" button during edit
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditQuestionRemove(interaction, formId) {
    const { removeLastQuestionForEdit, buildQuestionManagementPanel } = await import('../panels/editFormPanel.js');
    const result = removeLastQuestionForEdit(formId);
    
    if (result.success) {
        const panelPayload = buildQuestionManagementPanel(formId);
        await interaction.editReply(panelPayload);
    } else {
        await interaction.editReply({
            content: `❌ ${result.error}`,
            embeds: [],
            components: []
        });
    }
}

/**
 * Handle "Back to Edit Form" button from question management
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditQuestionsBack(interaction, formId) {
    const { buildFormEditPanel } = await import('../panels/editFormPanel.js');
    const panelPayload = buildFormEditPanel(formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Back to Form" button from edit panel
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditCancel(interaction, formId) {
    const panelPayload = buildFormListPanel(interaction.guild.id, formId);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Change Admin Channel" button
 * @param {object} interaction - Discord interaction
 */
async function handleSettingsChangeChannel(interaction) {
    const { buildAdminChannelSelectionPanel } = await import('../panels/settingsPanel.js');
    const panelPayload = buildAdminChannelSelectionPanel(interaction.guild);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Configure Notifications" button
 * @param {object} interaction - Discord interaction
 */
async function handleSettingsConfigureNotifications(interaction) {
    const { buildNotificationConfigPanel } = await import('../panels/settingsPanel.js');
    const panelPayload = buildNotificationConfigPanel(interaction.guild.id, interaction.guild);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Back" button from settings sub-panels
 * @param {object} interaction - Discord interaction
 */
async function handleSettingsBack(interaction) {
    const { buildSettingsPanel } = await import('../panels/settingsPanel.js');
    const panelPayload = buildSettingsPanel(interaction.guild.id, interaction.guild);
    await interaction.editReply(panelPayload);
}

/**
 * Handle "Set Target Server" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditTargetServer(interaction, formId) {
    const { showSetTargetServerModal } = await import('../panels/editFormPanel.js');
    await showSetTargetServerModal(interaction, formId);
}

/**
 * Handle "Set Review Messages" button
 * @param {object} interaction - Discord interaction
 * @param {string} formId - Form ID
 */
async function handleEditReviewMessages(interaction, formId) {
    const { showSetReviewMessagesModal } = await import('../panels/editFormPanel.js');
    await showSetReviewMessagesModal(interaction, formId);
}
