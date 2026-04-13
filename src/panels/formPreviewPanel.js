import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelType
} from 'discord.js';
import { getFormCreationData, clearFormCreationData } from './createFormPanel.js';
import { createForm, addQuestion } from '../database/models.js';

/**
 * Build form preview panel
 * @param {string} userId - Discord user ID
 * @returns {object} Message payload with embed and buttons
 */
export function buildFormPreviewPanel(userId) {
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
        .setTitle('👀 Form Preview')
        .setDescription('Review your form before deployment')
        .setColor(0x5865F2);

    // Form details
    embed.addFields(
        { name: '📋 Title', value: formData.title, inline: false },
        { name: '📝 Description', value: formData.description || 'No description', inline: false },
        { name: '🔘 Button Label', value: formData.buttonLabel, inline: true },
        { name: '🎨 Button Color', value: formData.buttonColor, inline: true },
        { name: '🔢 Submission Limit', value: formData.submissionLimit, inline: true }
    );

    // Questions
    const questionsText = formData.questions.map((q, index) => {
        const required = q.isRequired ? '✅ Required' : '⬜ Optional';
        return `**${index + 1}.** ${q.questionText} (${required})`;
    }).join('\n');
    
    embed.addFields({
        name: `❓ Questions (${formData.questions.length})`,
        value: questionsText
    });

    // Buttons
    const deployButton = new ButtonBuilder()
        .setCustomId('preview_deploy')
        .setLabel('Deploy Form')
        .setEmoji('🚀')
        .setStyle(ButtonStyle.Success);

    const backButton = new ButtonBuilder()
        .setCustomId('preview_back')
        .setLabel('Back to Questions')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary);

    const cancelButton = new ButtonBuilder()
        .setCustomId('preview_cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(deployButton, backButton, cancelButton);

    return {
        embeds: [embed],
        components: [row],
        ephemeral: true
    };
}

/**
 * Build channel selection panel
 * @param {object} interaction - Discord interaction
 * @returns {object} Message payload with channel select menu
 */
export function buildChannelSelectionPanel(interaction) {
    const formData = getFormCreationData(interaction.user.id);
    
    if (!formData) {
        return {
            content: '❌ Form creation session expired. Please start over.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    const embed = new EmbedBuilder()
        .setTitle('📍 Select Deployment Channel')
        .setDescription(`Select the channel where the **${formData.title}** button will be posted.`)
        .setColor(0x5865F2);

    // Get text channels from the guild
    const channels = interaction.guild.channels.cache
        .filter(channel => channel.type === ChannelType.GuildText)
        .sort((a, b) => a.position - b.position)
        .first(25); // Discord limit for select menu options

    if (channels.size === 0) {
        return {
            content: '❌ No text channels available in this server.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('channel_select')
        .setPlaceholder('Choose a channel...')
        .addOptions(
            channels.map(channel => ({
                label: `# ${channel.name}`,
                value: channel.id,
                description: `Deploy form button to ${channel.name}`
            }))
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const cancelButton = new ButtonBuilder()
        .setCustomId('channel_cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

    return {
        embeds: [embed],
        components: [selectRow, buttonRow],
        ephemeral: true
    };
}

/**
 * Deploy form to selected channel
 * @param {object} interaction - Discord interaction
 * @param {string} channelId - Target channel ID
 * @returns {Promise<object>} { success: boolean, error: string|null, formId: string|null }
 */
export async function deployForm(interaction, channelId) {
    const formData = getFormCreationData(interaction.user.id);
    
    if (!formData) {
        return { success: false, error: 'Form creation session expired', formId: null };
    }

    try {
        // Ensure server exists in database (for foreign key constraint)
        const { getServer, updateServer } = await import('../database/models.js');
        let server = getServer(interaction.guild.id);
        if (!server) {
            // Create server entry if it doesn't exist
            updateServer(interaction.guild.id, {});
        }

        // Get the target channel
        const channel = await interaction.guild.channels.fetch(channelId);
        
        if (!channel) {
            return { success: false, error: 'Channel not found', formId: null };
        }

        // Check bot permissions
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
            return { 
                success: false, 
                error: 'Bot does not have permission to send messages in that channel', 
                formId: null 
            };
        }

        // Create form button embed
        const buttonEmbed = new EmbedBuilder()
            .setTitle(formData.title)
            .setColor(0x5865F2);

        if (formData.description) {
            buttonEmbed.setDescription(formData.description);
        }

        // Map button color to ButtonStyle
        const buttonStyleMap = {
            'Primary': ButtonStyle.Primary,
            'Secondary': ButtonStyle.Secondary,
            'Success': ButtonStyle.Success,
            'Danger': ButtonStyle.Danger
        };

        // Create form button (will use formId as customId after creation)
        const formButton = new ButtonBuilder()
            .setCustomId('temp_form_button') // Temporary, will update after form creation
            .setLabel(formData.buttonLabel)
            .setStyle(buttonStyleMap[formData.buttonColor]);

        const buttonRow = new ActionRowBuilder().addComponents(formButton);

        // Post button message to channel
        const buttonMessage = await channel.send({
            embeds: [buttonEmbed],
            components: [buttonRow]
        });

        // Create form in database
        const form = createForm({
            guildId: interaction.guild.id,
            creatorId: interaction.user.id,
            title: formData.title,
            description: formData.description,
            buttonLabel: formData.buttonLabel,
            buttonColor: formData.buttonColor,
            buttonMessageId: buttonMessage.id,
            buttonChannelId: channelId,
            submissionLimit: formData.submissionLimit
        });

        // Add questions to database
        formData.questions.forEach((question, index) => {
            addQuestion({
                formId: form.form_id,
                questionText: question.questionText,
                isRequired: question.isRequired,
                order: index
            });
        });

        // Update button message with correct customId
        const updatedButton = new ButtonBuilder()
            .setCustomId(`form_${form.form_id}`)
            .setLabel(formData.buttonLabel)
            .setStyle(buttonStyleMap[formData.buttonColor]);

        const updatedRow = new ActionRowBuilder().addComponents(updatedButton);

        await buttonMessage.edit({
            embeds: [buttonEmbed],
            components: [updatedRow]
        });

        // Clear form creation data
        clearFormCreationData(interaction.user.id);

        return { success: true, error: null, formId: form.form_id };

    } catch (error) {
        console.error('Error deploying form:', error);
        return { 
            success: false, 
            error: `Failed to deploy form: ${error.message}`, 
            formId: null 
        };
    }
}
