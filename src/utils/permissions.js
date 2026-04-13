import { PermissionFlagsBits } from 'discord.js';
import { getForm } from '../database/models.js';

/**
 * Check if user has admin permissions in the guild
 * @param {object} member - Discord GuildMember object
 * @returns {boolean} True if user has admin permissions
 */
export function hasAdminPermissions(member) {
    if (!member || !member.permissions) {
        return false;
    }
    
    // Check if user has Administrator permission
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Check if user is the form creator or has admin permissions
 * @param {object} member - Discord GuildMember object
 * @param {string} formId - Form ID to check ownership
 * @returns {boolean} True if user is form creator or admin
 */
export function canManageForm(member, formId) {
    if (!member) {
        return false;
    }
    
    // Check if user has admin permissions
    if (hasAdminPermissions(member)) {
        return true;
    }
    
    // Check if user is the form creator
    const form = getForm(formId);
    if (!form) {
        return false;
    }
    
    return form.creator_id === member.id;
}

/**
 * Check if bot has required permissions in a channel
 * @param {object} channel - Discord channel object
 * @param {Array<bigint>} requiredPermissions - Array of permission flags to check
 * @returns {object} Result with success flag and missing permissions
 */
export function botHasChannelPermissions(channel, requiredPermissions) {
    if (!channel || !channel.guild) {
        return {
            success: false,
            error: 'Invalid channel or channel is not in a guild.',
            missingPermissions: []
        };
    }
    
    const botMember = channel.guild.members.me;
    if (!botMember) {
        return {
            success: false,
            error: 'Bot member not found in guild.',
            missingPermissions: []
        };
    }
    
    const channelPermissions = channel.permissionsFor(botMember);
    if (!channelPermissions) {
        return {
            success: false,
            error: 'Could not retrieve bot permissions for channel.',
            missingPermissions: []
        };
    }
    
    const missingPermissions = [];
    
    for (const permission of requiredPermissions) {
        if (!channelPermissions.has(permission)) {
            missingPermissions.push(permission);
        }
    }
    
    if (missingPermissions.length > 0) {
        return {
            success: false,
            error: 'Bot is missing required permissions in this channel.',
            missingPermissions: missingPermissions
        };
    }
    
    return {
        success: true,
        missingPermissions: []
    };
}

/**
 * Check if bot can post messages in a channel
 * @param {object} channel - Discord channel object
 * @returns {object} Result with success flag and error message
 */
export function canBotPostInChannel(channel) {
    const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
    ];
    
    return botHasChannelPermissions(channel, requiredPermissions);
}

/**
 * Check if bot can manage messages in a channel (for editing form buttons)
 * @param {object} channel - Discord channel object
 * @returns {object} Result with success flag and error message
 */
export function canBotManageMessagesInChannel(channel) {
    const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages
    ];
    
    return botHasChannelPermissions(channel, requiredPermissions);
}

/**
 * Get permission name from permission flag
 * @param {bigint} permission - Permission flag
 * @returns {string} Human-readable permission name
 */
export function getPermissionName(permission) {
    const permissionNames = {
        [PermissionFlagsBits.ViewChannel]: 'View Channel',
        [PermissionFlagsBits.SendMessages]: 'Send Messages',
        [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
        [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
        [PermissionFlagsBits.Administrator]: 'Administrator'
    };
    
    return permissionNames[permission] || 'Unknown Permission';
}

/**
 * Format missing permissions into a readable string
 * @param {Array<bigint>} missingPermissions - Array of missing permission flags
 * @returns {string} Formatted string of missing permissions
 */
export function formatMissingPermissions(missingPermissions) {
    if (!missingPermissions || missingPermissions.length === 0) {
        return 'None';
    }
    
    return missingPermissions.map(p => getPermissionName(p)).join(', ');
}
