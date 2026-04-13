import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Build the main control panel
 * @returns {object} Message payload with embed and buttons
 */
export function buildMainPanel() {
    const embed = new EmbedBuilder()
        .setTitle('📋 Form Bot Control Panel')
        .setDescription('Manage your server\'s forms and settings')
        .setColor(0x5865F2) // Discord blurple color
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('panel_create_form')
                .setLabel('Create New Form')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('panel_manage_forms')
                .setLabel('Manage Forms')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('panel_settings')
                .setLabel('Settings')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_statistics')
                .setLabel('Statistics')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [row],
        ephemeral: true
    };
}
