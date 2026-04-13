import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { buildMainPanel } from '../panels/mainPanel.js';
import { allowedGuildId } from '../index.js';

export const data = new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open the Form Bot control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

export async function execute(interaction) {
    try {
        // Check if bot is locked to a specific guild
        if (allowedGuildId && interaction.guildId !== allowedGuildId) {
            return await interaction.reply({
                content: '❌ This bot is not authorized to run in this server.',
                ephemeral: true
            });
        }

        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }

        // Build and display the main control panel
        const panelPayload = buildMainPanel();
        await interaction.reply(panelPayload);

    } catch (error) {
        console.error('Error executing /panel command:', error);
        
        const errorMessage = 'An error occurred while opening the control panel. Please try again later.';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}
