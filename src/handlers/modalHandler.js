import { processFormBasicInfo } from '../panels/createFormPanel.js';
import { buildQuestionBuilderPanel, processAddQuestion } from '../panels/questionBuilderPanel.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getForm, getQuestions, createSubmission, getServer } from '../database/models.js';
import { handleReviewModal } from './reviewHandler.js';
import { handleInteractionError, deferIfNeeded, logError, logWarning, retryWithBackoff } from '../utils/errorHandler.js';

/**
 * Handle modal submissions
 * @param {object} interaction - Discord modal submit interaction
 */
export async function handleModalSubmit(interaction) {
    try {
        const customId = interaction.customId;

        // Handle form submission modals (format: form_submit_<formId>)
        if (customId.startsWith('form_submit_')) {
            await handleFormSubmissionModal(interaction);
            return;
        }

        // Handle review modals (format: review_modal_approve_<submissionId> or review_modal_reject_<submissionId>)
        if (customId.startsWith('review_modal_')) {
            await handleReviewModal(interaction);
            return;
        }

        // Handle edit form basic info modal
        if (customId.startsWith('modal_edit_form_basic_')) {
            await handleEditFormBasicInfoModal(interaction);
            return;
        }

        // Handle edit form add question modal
        if (customId.startsWith('modal_edit_add_question_')) {
            await handleEditAddQuestionModal(interaction);
            return;
        }

        // Handle set target server modal
        if (customId.startsWith('modal_set_target_server_')) {
            await handleSetTargetServerModal(interaction);
            return;
        }

        // Handle set review messages modal
        if (customId.startsWith('modal_set_review_messages_')) {
            await handleSetReviewMessagesModal(interaction);
            return;
        }

        switch (customId) {
            case 'modal_create_form_basic':
                await handleFormBasicInfoModal(interaction);
                break;

            case 'modal_add_question':
                await handleAddQuestionModal(interaction);
                break;

            default:
                logWarning('Unknown Modal', `Modal: ${customId}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
                await interaction.reply({
                    content: '❌ Unknown form submission. Please try again.',
                    ephemeral: true
                });
        }

    } catch (error) {
        await handleInteractionError(interaction, error, 'handleModalSubmit');
    }
}

/**
 * Handle form basic info modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleFormBasicInfoModal(interaction) {
    try {
        console.log('=== handleFormBasicInfoModal START ===');
        console.log('Interaction exists:', !!interaction);
        console.log('User exists:', !!interaction?.user);
        console.log('User ID:', interaction?.user?.id);
        
        if (!interaction || !interaction.user) {
            console.error('Invalid interaction object in handleFormBasicInfoModal');
            await interaction.reply({
                content: '❌ An error occurred. Please try again.',
                ephemeral: true
            });
            return;
        }

        console.log('Processing form basic info...');
        const result = processFormBasicInfo(interaction);
        console.log('Process result:', result);

        if (!result.success) {
            console.log('Validation failed:', result.error);
            await interaction.reply({
                content: `❌ ${result.error}`,
                ephemeral: true
            });
            return;
        }

        console.log('Building question builder panel...');
        // Show question builder panel
        const panelPayload = buildQuestionBuilderPanel(interaction.user.id);
        console.log('Panel payload:', panelPayload);
        
        if (!panelPayload) {
            console.error('buildQuestionBuilderPanel returned undefined');
            await interaction.reply({
                content: '❌ Failed to build question panel. Please try again.',
                ephemeral: true
            });
            return;
        }

        console.log('Sending reply...');
        await interaction.reply(panelPayload);
        console.log('=== handleFormBasicInfoModal SUCCESS ===');
    } catch (error) {
        console.error('=== handleFormBasicInfoModal ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        try {
            await interaction.reply({
                content: `❌ An unexpected error occurred: ${error.message}`,
                ephemeral: true
            });
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
}

/**
 * Handle add question modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleAddQuestionModal(interaction) {
    const result = processAddQuestion(interaction);

    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Update question builder panel
    const panelPayload = buildQuestionBuilderPanel(interaction.user.id);
    await interaction.reply(panelPayload);
}

/**
 * Handle user form submission modal
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleFormSubmissionModal(interaction) {
    try {
        // Extract form ID from custom_id (format: form_submit_<formId>)
        const formId = interaction.customId.replace('form_submit_', '');
        
        // Defer reply immediately as this will take time
        await deferIfNeeded(interaction, true);
        
        // Fetch form and questions
        const form = getForm(formId);
        if (!form) {
            return await interaction.editReply({
                content: '❌ This form no longer exists.',
                ephemeral: true
            });
        }
        
        const questions = getQuestions(formId);
        
        // Extract answers from modal fields
        const answers = [];
        for (const question of questions) {
            const fieldValue = interaction.fields.getTextInputValue(`question_${question.question_id}`);
            
            // Validate required fields
            if (question.is_required === 1 && (!fieldValue || fieldValue.trim() === '')) {
                return await interaction.editReply({
                    content: `❌ Please fill in all required fields: "${question.question_text}"`,
                    ephemeral: true
                });
            }
            
            answers.push({
                questionId: question.question_id,
                answerText: fieldValue || ''
            });
        }
        
        // Save submission to database
        const submission = createSubmission({
            formId: formId,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            status: 'pending',
            answers: answers
        });
        
        // Send confirmation DM to user
        try {
            const confirmEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Form Submitted Successfully')
                .setDescription(`Your submission for **${form.title}** has been received and is pending review.`)
                .setTimestamp();
            
            await retryWithBackoff(async () => {
                await interaction.user.send({ embeds: [confirmEmbed] });
            });
        } catch (dmError) {
            logWarning('Failed to Send Confirmation DM', 'User may have DMs disabled', {
                userId: interaction.user.id,
                formId
            });
            // Continue even if DM fails
        }
        
        // Get server configuration for admin channel
        const serverConfig = getServer(interaction.guildId);
        
        if (!serverConfig || !serverConfig.admin_channel_id) {
            logWarning('Admin Channel Not Configured', 'Form submitted but no admin channel set', {
                guildId: interaction.guildId,
                formId
            });
            await interaction.editReply({
                content: '✅ Your form has been submitted, but the admin channel is not configured. Please contact a server administrator.',
                ephemeral: true
            });
            return;
        }
        
        // Build submission embed for admin channel
        const submissionEmbed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle(`📋 New Form Submission: ${form.title}`)
            .setDescription(form.description || 'No description provided')
            .addFields(
                { name: '👤 User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: '🆔 User ID', value: interaction.user.id, inline: true },
                { name: '📅 Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
        
        // Add answers as fields
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const answer = answers[i];
            submissionEmbed.addFields({
                name: `${i + 1}. ${question.question_text}${question.is_required ? ' *' : ''}`,
                value: answer.answerText || '_No answer provided_',
                inline: false
            });
        }
        
        submissionEmbed.setFooter({ text: `Submission ID: ${submission.submission_id}` });
        
        // Create Approve/Reject buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`review_approve_${submission.submission_id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`review_reject_${submission.submission_id}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
        
        // Post to admin channel
        try {
            const adminChannel = await retryWithBackoff(async () => {
                return await interaction.client.channels.fetch(serverConfig.admin_channel_id);
            });
            
            if (!adminChannel) {
                logError('Admin Channel Not Found', new Error('Channel fetch returned null'), {
                    channelId: serverConfig.admin_channel_id,
                    guildId: interaction.guildId
                });
                await interaction.editReply({
                    content: '✅ Your form has been submitted, but the admin channel could not be found.',
                    ephemeral: true
                });
                return;
            }
            
            // Check if notifications are enabled
            let mentionText = '';
            if (serverConfig.notification_enabled === 1 && serverConfig.notification_target) {
                const target = serverConfig.notification_target;
                // Check if it's a role (starts with role:) or user (starts with user:)
                if (target.startsWith('role:')) {
                    const roleId = target.replace('role:', '');
                    mentionText = `<@&${roleId}> `;
                } else if (target.startsWith('user:')) {
                    const userId = target.replace('user:', '');
                    mentionText = `<@${userId}> `;
                }
            }
            
            const adminMessage = await retryWithBackoff(async () => {
                return await adminChannel.send({
                    content: mentionText || undefined,
                    embeds: [submissionEmbed],
                    components: [actionRow]
                });
            });
            
            // Update submission with admin message ID
            const db = await import('../database/db.js').then(m => m.default);
            db.prepare('UPDATE submissions SET admin_message_id = ? WHERE submission_id = ?')
                .run(adminMessage.id, submission.submission_id);
            
        } catch (channelError) {
            logError('Failed to Post to Admin Channel', channelError, {
                channelId: serverConfig.admin_channel_id,
                guildId: interaction.guildId,
                formId
            });
            await interaction.editReply({
                content: '✅ Your form has been submitted, but there was an error notifying the admins.',
                ephemeral: true
            });
            return;
        }
        
        // Send success message to user
        await interaction.editReply({
            content: '✅ Your form has been submitted successfully! You will receive a notification when it is reviewed.',
            ephemeral: true
        });
        
    } catch (error) {
        await handleInteractionError(interaction, error, 'handleFormSubmissionModal');
    }
}

/**
 * Handle edit form basic info modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleEditFormBasicInfoModal(interaction) {
    const { processEditBasicInfo, buildFormEditPanel, updateDeployedFormButton } = await import('../panels/editFormPanel.js');
    
    // Extract form ID from custom_id (format: modal_edit_form_basic_<formId>)
    const formId = interaction.customId.replace('modal_edit_form_basic_', '');
    
    const result = processEditBasicInfo(interaction, formId);

    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Defer reply as we'll be updating the button
    await interaction.deferReply({ ephemeral: true });

    // Try to update the deployed button
    const updateResult = await updateDeployedFormButton(interaction.client, formId);
    
    let message = '✅ Form basic info updated successfully!';
    if (!updateResult.success) {
        message += `\n\n⚠️ Warning: Could not update deployed button: ${updateResult.error}`;
    }

    // Show updated edit panel
    const panelPayload = buildFormEditPanel(formId);
    await interaction.editReply({
        content: message,
        ...panelPayload
    });
}

/**
 * Handle edit form add question modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleEditAddQuestionModal(interaction) {
    const { processAddQuestionForEdit, buildQuestionManagementPanel } = await import('../panels/editFormPanel.js');
    
    // Extract form ID from custom_id (format: modal_edit_add_question_<formId>)
    const formId = interaction.customId.replace('modal_edit_add_question_', '');
    
    const result = processAddQuestionForEdit(interaction, formId);

    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Show updated question management panel
    const panelPayload = buildQuestionManagementPanel(formId);
    await interaction.reply(panelPayload);
}


/**
 * Handle set target server modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleSetTargetServerModal(interaction) {
    const { processSetTargetServer, buildFormEditPanel } = await import('../panels/editFormPanel.js');
    
    // Extract form ID from custom_id (format: modal_set_target_server_<formId>)
    const formId = interaction.customId.replace('modal_set_target_server_', '');
    
    const result = processSetTargetServer(interaction, formId);

    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Show updated edit panel
    const panelPayload = buildFormEditPanel(formId);
    await interaction.reply({
        content: result.message,
        ...panelPayload
    });
}


/**
 * Handle set review messages modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
async function handleSetReviewMessagesModal(interaction) {
    const { processSetReviewMessages, buildFormEditPanel } = await import('../panels/editFormPanel.js');
    
    // Extract form ID from custom_id (format: modal_set_review_messages_<formId>)
    const formId = interaction.customId.replace('modal_set_review_messages_', '');
    
    const result = processSetReviewMessages(interaction, formId);

    if (!result.success) {
        await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Show updated edit panel
    const panelPayload = buildFormEditPanel(formId);
    await interaction.reply({
        content: result.message,
        ...panelPayload
    });
}
