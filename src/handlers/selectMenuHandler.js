import { deployForm } from '../panels/formPreviewPanel.js';
import { buildMainPanel } from '../panels/mainPanel.js';
import { buildFormListPanel } from '../panels/formListPanel.js';
import { handleInteractionError, logWarning } from '../utils/errorHandler.js';

/**
 * Handle select menu interactions
 * @param {object} interaction - Discord select menu interaction
 */
export async function handleSelectMenu(interaction) {
    try {
        const customId = interaction.customId;

        switch (customId) {
            case 'channel_select':
                await handleChannelSelect(interaction);
                break;

            case 'form_select':
                await handleFormSelect(interaction);
                break;

            case 'settings_select_admin_channel':
                await handleAdminChannelSelect(interaction);
                break;

            case 'settings_select_notification_target':
                await handleNotificationTargetSelect(interaction);
                break;

            default:
                logWarning('Unknown Select Menu', `Menu: ${customId}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
                await interaction.reply({
                    content: '❌ Unknown selection. Please try again.',
                    ephemeral: true
                });
        }

    } catch (error) {
        await handleInteractionError(interaction, error, 'handleSelectMenu');
    }
}

/**
 * Handle channel selection for form deployment
 * @param {object} interaction - Discord select menu interaction
 */
async function handleChannelSelect(interaction) {
    await interaction.deferUpdate();

    const channelId = interaction.values[0];
    
    // Deploy the form
    const result = await deployForm(interaction, channelId);

    if (!result.success) {
        await interaction.editReply({
            content: `❌ ${result.error}`,
            embeds: [],
            components: [],
            ephemeral: true
        });
        return;
    }

    // Show success message and return to main panel
    const channel = await interaction.guild.channels.fetch(channelId);
    
    await interaction.editReply({
        content: `✅ Form deployed successfully to ${channel}!\n\n**Form ID:** \`${result.formId}\``,
        embeds: [],
        components: [],
        ephemeral: true
    });

    // After a brief moment, show the main panel again
    setTimeout(async () => {
        try {
            const panelPayload = buildMainPanel();
            await interaction.editReply(panelPayload);
        } catch (error) {
            console.error('Error showing main panel after deployment:', error);
        }
    }, 3000);
}

/**
 * Handle form selection from dropdown
 * @param {object} interaction - Discord select menu interaction
 */
async function handleFormSelect(interaction) {
    await interaction.deferUpdate();

    const formId = interaction.values[0];
    const guildId = interaction.guild.id;

    // Show the form list panel with the selected form
    const panelPayload = buildFormListPanel(guildId, formId);
    await interaction.editReply(panelPayload);
}


/**
 * Handle admin channel selection
 * @param {object} interaction - Discord select menu interaction
 */
async function handleAdminChannelSelect(interaction) {
    await interaction.deferUpdate();

    const channelId = interaction.values[0];
    const guildId = interaction.guild.id;
    
    // Save admin channel
    const { saveAdminChannel } = await import('../panels/settingsPanel.js');
    const result = await saveAdminChannel(guildId, channelId, interaction.guild);

    if (!result.success) {
        await interaction.editReply({
            content: result.message,
            embeds: [],
            components: [],
            ephemeral: true
        });
        return;
    }

    // Show success message
    await interaction.editReply({
        content: result.message,
        embeds: [],
        components: [],
        ephemeral: true
    });

    // After a brief moment, show the settings panel again
    setTimeout(async () => {
        try {
            const { buildSettingsPanel } = await import('../panels/settingsPanel.js');
            const panelPayload = buildSettingsPanel(guildId, interaction.guild);
            await interaction.editReply(panelPayload);
        } catch (error) {
            console.error('Error showing settings panel after channel selection:', error);
        }
    }, 2000);
}

/**
 * Handle notification target selection
 * @param {object} interaction - Discord select menu interaction
 */
async function handleNotificationTargetSelect(interaction) {
    await interaction.deferUpdate();

    const targetValue = interaction.values[0];
    const guildId = interaction.guild.id;
    
    // Save notification target
    const { saveNotificationTarget } = await import('../panels/settingsPanel.js');
    const result = await saveNotificationTarget(guildId, targetValue);

    if (!result.success) {
        await interaction.editReply({
            content: result.message,
            embeds: [],
            components: [],
            ephemeral: true
        });
        return;
    }

    // Show success message
    await interaction.editReply({
        content: result.message,
        embeds: [],
        components: [],
        ephemeral: true
    });

    // After a brief moment, show the notification config panel again
    setTimeout(async () => {
        try {
            const { buildNotificationConfigPanel } = await import('../panels/settingsPanel.js');
            const panelPayload = buildNotificationConfigPanel(guildId, interaction.guild);
            await interaction.editReply(panelPayload);
        } catch (error) {
            console.error('Error showing notification config panel after target selection:', error);
        }
    }, 2000);
}
