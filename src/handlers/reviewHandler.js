import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getSubmission, updateSubmissionStatus, getForm } from '../database/models.js';
import { handleInteractionError, deferIfNeeded, logError, logWarning, logInfo, retryWithBackoff } from '../utils/errorHandler.js';

/**
 * Handle review button interactions (Approve/Reject)
 * @param {object} interaction - Discord button interaction
 */
export async function handleReviewButton(interaction) {
    try {
        const customId = interaction.customId;
        
        console.log('=== handleReviewButton ===');
        console.log('Custom ID:', customId);
        
        // Extract action and submission ID (format: review_approve_<submissionId> or review_reject_<submissionId>)
        const parts = customId.split('_');
        const action = parts[1]; // 'approve' or 'reject'
        const submissionId = parts.slice(2).join('_'); // Handle UUIDs with underscores
        
        console.log('Action:', action);
        console.log('Submission ID:', submissionId);
        
        // Validate action
        if (action !== 'approve' && action !== 'reject') {
            return await interaction.reply({
                content: '❌ Invalid review action.',
                ephemeral: true
            });
        }
        
        // Fetch submission
        const submission = getSubmission(submissionId);
        
        console.log('Submission found:', !!submission);
        
        if (!submission) {
            logWarning('Submission Not Found', 'Admin tried to review non-existent submission', {
                submissionId,
                userId: interaction.user.id
            });
            return await interaction.reply({
                content: '❌ Submission not found.',
                ephemeral: true
            });
        }
        
        // Check if already reviewed
        if (submission.status !== 'pending') {
            return await interaction.reply({
                content: `❌ This submission has already been ${submission.status}.`,
                ephemeral: true
            });
        }
        
        // Fetch form to check for predefined messages
        const form = getForm(submission.form_id);
        const predefinedMessage = action === 'approve' ? form?.approve_message : form?.reject_message;
        
        // If predefined message exists, use it directly
        if (predefinedMessage && predefinedMessage.trim()) {
            await deferIfNeeded(interaction, true);
            await processReview(interaction, submissionId, action, predefinedMessage);
            return;
        }
        
        // Otherwise, open modal for admin to enter custom message
        const modal = new ModalBuilder()
            .setCustomId(`review_modal_${action}_${submissionId}`)
            .setTitle(action === 'approve' ? 'Approve Submission' : 'Reject Submission');
        
        const messageInput = new TextInputBuilder()
            .setCustomId('review_message')
            .setLabel(action === 'approve' ? 'Approval Message' : 'Rejection Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(`Enter your ${action === 'approve' ? 'approval' : 'rejection'} message to the user...`)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1000);
        
        const actionRow = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(actionRow);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        await handleInteractionError(interaction, error, 'handleReviewButton');
    }
}

/**
 * Process review (approve/reject) with message
 * @param {object} interaction - Discord interaction
 * @param {string} submissionId - Submission ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} reviewMessage - Review message
 */
async function processReview(interaction, submissionId, action, reviewMessage) {
    // Fetch submission
    const submission = getSubmission(submissionId);
    
    if (!submission) {
        return await interaction.editReply({
            content: '❌ Submission not found.',
            ephemeral: true
        });
    }
    
    // Check if already reviewed
    if (submission.status !== 'pending') {
        return await interaction.editReply({
            content: `❌ This submission has already been ${submission.status}.`,
            ephemeral: true
        });
    }
    
    // Fetch form for context
    const form = getForm(submission.form_id);
    
    if (!form) {
        return await interaction.editReply({
            content: '❌ Form not found.',
            ephemeral: true
        });
    }
    
    // Update submission status in database
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    updateSubmissionStatus(submissionId, {
        status: newStatus,
        reviewedBy: interaction.user.id,
        reviewMessage: reviewMessage
    });
    
    // Send DM to user with custom message and form context
    let dmSent = true;
    try {
        const user = await retryWithBackoff(async () => {
            return await interaction.client.users.fetch(submission.user_id);
        });
        
        const dmEmbed = new EmbedBuilder()
            .setColor(action === 'approve' ? 0x00FF00 : 0xFF0000)
            .setTitle(action === 'approve' ? '✅ Submission Approved' : '❌ Submission Rejected')
            .setDescription(`Your submission for **${form.title}** has been ${action === 'approve' ? 'approved' : 'rejected'}.`)
            .addFields({
                name: action === 'approve' ? 'Approval Message' : 'Rejection Message',
                value: reviewMessage,
                inline: false
            })
            .setTimestamp();
        
        // If approved and form has target guild, create unique invite link
        let inviteLink = null;
        if (action === 'approve' && form.target_guild_id) {
            try {
                // Fetch target guild
                const targetGuild = await interaction.client.guilds.fetch(form.target_guild_id);
                
                if (targetGuild) {
                    // Get the first available text channel or system channel
                    let inviteChannel = targetGuild.systemChannel;
                    
                    if (!inviteChannel) {
                        // Find first text channel bot can create invite in
                        const channels = targetGuild.channels.cache.filter(
                            ch => ch.type === 0 && ch.permissionsFor(targetGuild.members.me).has('CreateInstantInvite')
                        );
                        inviteChannel = channels.first();
                    }
                    
                    if (inviteChannel) {
                        // Create unique, single-use invite
                        const invite = await inviteChannel.createInvite({
                            maxAge: 86400, // 24 hours
                            maxUses: 1, // Single use only
                            unique: true, // Create new unique invite
                            reason: `Approved application for ${form.title} - User: ${submission.user_id}`
                        });
                        
                        inviteLink = invite.url;
                        
                        dmEmbed.addFields({
                            name: '🎉 Join the Server',
                            value: `Click here to join: ${inviteLink}\n\n` + 
                                   `⚠️ **This invite is unique to you and can only be used once!**\n` +
                                   `⏰ Expires in 24 hours.`,
                            inline: false
                        });
                        
                        logInfo('Unique Invite Created', 'Created single-use invite for approved user', {
                            userId: submission.user_id,
                            inviteCode: invite.code,
                            formId: form.form_id,
                            targetGuildId: form.target_guild_id
                        });
                    } else {
                        logWarning('No Invite Channel Found', 'Could not find channel to create invite', {
                            targetGuildId: form.target_guild_id,
                            formId: form.form_id
                        });
                    }
                }
            } catch (inviteError) {
                logError('Failed to Create Invite', inviteError, {
                    targetGuildId: form.target_guild_id,
                    formId: form.form_id,
                    userId: submission.user_id
                });
            }
        }
        
        await retryWithBackoff(async () => {
            await user.send({ embeds: [dmEmbed] });
        });
    } catch (dmError) {
        logWarning('Failed to Send Review DM', 'User may have DMs disabled', {
            userId: submission.user_id,
            submissionId,
            action
        });
        dmSent = false;
    }
    
    // Update submission embed in admin channel
    try {
        const adminChannel = await retryWithBackoff(async () => {
            return await interaction.client.channels.fetch(interaction.channelId);
        });
        const adminMessage = await retryWithBackoff(async () => {
            return await adminChannel.messages.fetch(submission.admin_message_id);
        });
        
        // Get the original embed and update it
        const originalEmbed = adminMessage.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .setColor(action === 'approve' ? 0x00FF00 : 0xFF0000)
            .addFields(
                { name: '📝 Status', value: action === 'approve' ? '✅ Approved' : '❌ Rejected', inline: true },
                { name: '👤 Reviewed By', value: `<@${interaction.user.id}>`, inline: true },
                { name: '⏰ Reviewed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: action === 'approve' ? 'Approval Message' : 'Rejection Message', value: reviewMessage, inline: false }
            );
        
        // Disable the Approve/Reject buttons
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`review_approve_${submissionId}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`review_reject_${submissionId}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
                    .setDisabled(true)
            );
        
        await retryWithBackoff(async () => {
            await adminMessage.edit({
                embeds: [updatedEmbed],
                components: [disabledRow]
            });
        });
        
    } catch (updateError) {
        logError('Failed to Update Admin Message', updateError, {
            submissionId,
            adminMessageId: submission.admin_message_id
        });
    }
    
    // Send confirmation to admin
    let confirmationMessage = `✅ Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully.`;
    
    if (!dmSent) {
        confirmationMessage += '\n⚠️ Could not send DM to user (they may have DMs disabled).';
    }
    
    await interaction.editReply({
        content: confirmationMessage,
        ephemeral: true
    });
}

/**
 * Handle review modal submission
 * @param {object} interaction - Discord modal submit interaction
 */
export async function handleReviewModal(interaction) {
    try {
        const customId = interaction.customId;
        
        // Extract action and submission ID (format: review_modal_approve_<submissionId> or review_modal_reject_<submissionId>)
        const parts = customId.split('_');
        const action = parts[2]; // 'approve' or 'reject'
        const submissionId = parts.slice(3).join('_'); // Handle UUIDs with underscores
        
        // Get the custom message from modal
        const reviewMessage = interaction.fields.getTextInputValue('review_message');
        
        // Defer reply as we'll be doing multiple operations
        await deferIfNeeded(interaction, true);
        
        // Process the review
        await processReview(interaction, submissionId, action, reviewMessage);
        
    } catch (error) {
        await handleInteractionError(interaction, error, 'handleReviewModal');
    }
}
