import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { getServer } from '../database/models.js';

/**
 * Build the settings panel
 * @param {string} guildId - Discord guild ID
 * @param {object} guild - Discord guild object
 * @returns {object} Message payload with embed and buttons
 */
export function buildSettingsPanel(guildId, guild) {
    const serverConfig = getServer(guildId);
    
    // Get admin channel name
    let adminChannelText = 'Not configured';
    if (serverConfig?.admin_channel_id) {
        const channel = guild.channels.cache.get(serverConfig.admin_channel_id);
        adminChannelText = channel ? `<#${serverConfig.admin_channel_id}>` : 'Channel not found';
    }
    
    // Get notification settings
    let notificationText = '❌ Disabled';
    let notificationTargetText = '';
    if (serverConfig?.notification_enabled) {
        notificationText = '✅ Enabled';
        if (serverConfig.notification_target) {
            // Check if it's a role or user (roles start with 'role:', users with 'user:')
            if (serverConfig.notification_target.startsWith('role:')) {
                const roleId = serverConfig.notification_target.replace('role:', '');
                const role = guild.roles.cache.get(roleId);
                notificationTargetText = role ? `\nNotify: ${role.name}` : '\nNotify: Role not found';
            } else if (serverConfig.notification_target.startsWith('user:')) {
                const userId = serverConfig.notification_target.replace('user:', '');
                notificationTargetText = `\nNotify: <@${userId}>`;
            }
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Settings')
        .setDescription('Configure bot settings for your server')
        .addFields(
            {
                name: '📬 Admin Channel',
                value: adminChannelText,
                inline: false
            },
            {
                name: '🔔 Notifications',
                value: notificationText + notificationTargetText,
                inline: false
            }
        )
        .setColor(0x5865F2)
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_change_channel')
                .setLabel('Change Admin Channel')
                .setEmoji('📬')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('settings_configure_notifications')
                .setLabel('Configure Notifications')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('panel_back_main')
                .setLabel('Back')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return {
        embeds: [embed],
        components: [row],
        ephemeral: true
    };
}


/**
 * Build the admin channel selection panel
 * @param {object} guild - Discord guild object
 * @returns {object} Message payload with embed and channel select menu
 */
export function buildAdminChannelSelectionPanel(guild) {
    const embed = new EmbedBuilder()
        .setTitle('📬 Select Admin Channel')
        .setDescription('Choose the channel where form submissions will be sent for review.')
        .setColor(0x5865F2)
        .setTimestamp();
    
    // Get all text channels
    const textChannels = guild.channels.cache.filter(
        channel => channel.type === 0 // 0 = GUILD_TEXT
    );
    
    if (textChannels.size === 0) {
        return {
            content: '❌ No text channels found in this server.',
            embeds: [],
            components: [],
            ephemeral: true
        };
    }
    
    // Build select menu options (max 25)
    const options = [];
    let count = 0;
    for (const [id, channel] of textChannels) {
        if (count >= 25) break;
        
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`#${channel.name}`)
                .setValue(id)
                .setDescription(channel.topic ? channel.topic.substring(0, 100) : 'No description')
        );
        count++;
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('settings_select_admin_channel')
        .setPlaceholder('Select a channel')
        .addOptions(options);
    
    const selectRow = new ActionRowBuilder()
        .addComponents(selectMenu);
    
    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_back')
                .setLabel('Back')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return {
        embeds: [embed],
        components: [selectRow, buttonRow],
        ephemeral: true
    };
}

/**
 * Handle admin channel selection and save to database
 * @param {string} guildId - Discord guild ID
 * @param {string} channelId - Selected channel ID
 * @param {object} guild - Discord guild object
 * @returns {object} Result with success status and message
 */
export async function saveAdminChannel(guildId, channelId, guild) {
    const { updateServer } = await import('../database/models.js');
    const { PermissionFlagsBits } = await import('discord.js');
    
    // Verify channel exists
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        return {
            success: false,
            message: '❌ Channel not found.'
        };
    }
    
    // Verify bot has permission to post in the channel
    const botMember = guild.members.cache.get(guild.client.user.id);
    const permissions = channel.permissionsFor(botMember);
    
    if (!permissions.has(PermissionFlagsBits.SendMessages) || 
        !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        return {
            success: false,
            message: `❌ I don't have permission to send messages and embeds in <#${channelId}>. Please grant me the required permissions and try again.`
        };
    }
    
    // Save to database
    try {
        updateServer(guildId, { adminChannelId: channelId });
        return {
            success: true,
            message: `✅ Admin channel set to <#${channelId}>`
        };
    } catch (error) {
        console.error('Error saving admin channel:', error);
        return {
            success: false,
            message: '❌ Failed to save admin channel. Please try again.'
        };
    }
}


/**
 * Build the notification configuration panel
 * @param {string} guildId - Discord guild ID
 * @param {object} guild - Discord guild object
 * @returns {object} Message payload with embed and buttons
 */
export function buildNotificationConfigPanel(guildId, guild) {
    const serverConfig = getServer(guildId);
    
    const notificationEnabled = serverConfig?.notification_enabled || false;
    const notificationTarget = serverConfig?.notification_target || null;
    
    // Get current target display
    let currentTargetText = 'None';
    if (notificationTarget) {
        if (notificationTarget.startsWith('role:')) {
            const roleId = notificationTarget.replace('role:', '');
            const role = guild.roles.cache.get(roleId);
            currentTargetText = role ? role.name : 'Role not found';
        } else if (notificationTarget.startsWith('user:')) {
            const userId = notificationTarget.replace('user:', '');
            currentTargetText = `<@${userId}>`;
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔔 Notification Configuration')
        .setDescription(
            'Configure who gets mentioned when new form submissions arrive.\n\n' +
            `**Current Status:** ${notificationEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
            `**Current Target:** ${currentTargetText}`
        )
        .setColor(0x5865F2)
        .setTimestamp();
    
    // Build select menu with roles and option to disable
    const options = [
        new StringSelectMenuOptionBuilder()
            .setLabel('Disable Notifications')
            .setValue('disable')
            .setDescription('Turn off mention notifications')
            .setEmoji('❌')
    ];
    
    // Add roles (max 24 to leave room for disable option)
    const roles = guild.roles.cache
        .filter(role => !role.managed && role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .first(24);
    
    for (const role of roles.values()) {
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`@${role.name}`)
                .setValue(`role:${role.id}`)
                .setDescription(`Mention this role on new submissions`)
        );
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('settings_select_notification_target')
        .setPlaceholder('Select who to notify')
        .addOptions(options);
    
    const selectRow = new ActionRowBuilder()
        .addComponents(selectMenu);
    
    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_back')
                .setLabel('Back')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return {
        embeds: [embed],
        components: [selectRow, buttonRow],
        ephemeral: true
    };
}

/**
 * Save notification target to database
 * @param {string} guildId - Discord guild ID
 * @param {string} targetValue - Target value ('disable', 'role:ID', or 'user:ID')
 * @returns {object} Result with success status and message
 */
export async function saveNotificationTarget(guildId, targetValue) {
    const { updateServer } = await import('../database/models.js');
    
    try {
        if (targetValue === 'disable') {
            // Disable notifications
            updateServer(guildId, { 
                notificationEnabled: 0,
                notificationTarget: null
            });
            return {
                success: true,
                message: '✅ Notifications disabled'
            };
        } else {
            // Enable notifications with target
            updateServer(guildId, { 
                notificationEnabled: 1,
                notificationTarget: targetValue
            });
            
            let targetDisplay = '';
            if (targetValue.startsWith('role:')) {
                targetDisplay = 'role';
            } else if (targetValue.startsWith('user:')) {
                targetDisplay = 'user';
            }
            
            return {
                success: true,
                message: `✅ Notifications enabled for ${targetDisplay}`
            };
        }
    } catch (error) {
        console.error('Error saving notification settings:', error);
        return {
            success: false,
            message: '❌ Failed to save notification settings. Please try again.'
        };
    }
}
