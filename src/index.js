import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logError, logInfo, handleInteractionError } from './utils/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf-8'));

// Import database to ensure initialization
import db from './database/db.js';

// Import handlers
import { handlePanelInteraction } from './handlers/panelHandler.js';
import { handleModalSubmit } from './handlers/modalHandler.js';
import { handleSelectMenu } from './handlers/selectMenuHandler.js';
import { handleFormButton } from './handlers/formButtonHandler.js';
import { handleReviewButton } from './handlers/reviewHandler.js';

// Import commands
import * as panelCommand from './commands/panel.js';

// Initialize Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
});

// Ready event handler
client.once(Events.ClientReady, (readyClient) => {
    logInfo('Bot Ready', `Logged in as ${readyClient.user.tag}`, {
        guilds: readyClient.guilds.cache.size
    });
    console.log(`✅ Bot is ready! Logged in as ${readyClient.user.tag}`);
    console.log(`📊 Serving ${readyClient.guilds.cache.size} guild(s)`);
});

// Interaction create event handler
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'panel') {
                await panelCommand.execute(interaction);
            } else {
                logInfo('Unknown Command', `Command: ${interaction.commandName}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
            }
        }
        
        // Handle button interactions
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            // Handle temporary form button (before it's updated)
            if (customId === 'temp_form_button') {
                await interaction.reply({
                    content: '⏳ This form is being set up. Please wait a moment and try again.',
                    ephemeral: true
                });
                return;
            }
            
            // Route panel buttons to panel handler (check form management buttons first)
            if (customId.startsWith('panel_') || 
                customId.startsWith('question_') || 
                customId.startsWith('preview_') || 
                customId.startsWith('channel_') || 
                customId.startsWith('settings_') || 
                customId.startsWith('edit_') || 
                customId.startsWith('submissions_') ||
                customId.startsWith('form_edit_') ||
                customId.startsWith('form_delete_') ||
                customId.startsWith('form_submissions_') ||
                customId.startsWith('form_back_list_')) {
                await handlePanelInteraction(interaction);
            }
            // Route form buttons to form button handler (user-facing form buttons)
            else if (customId.startsWith('form_')) {
                await handleFormButton(interaction);
            }
            // Route review buttons (approve/reject)
            else if (customId.startsWith('review_')) {
                await handleReviewButton(interaction);
            } else {
                logInfo('Unknown Button', `Button: ${customId}`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
            }
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
        
        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
    } catch (error) {
        await handleInteractionError(interaction, error, 'InteractionCreate');
    }
});

// Error event handlers
client.on(Events.Error, (error) => {
    logError('Discord Client Error', error);
});

process.on('unhandledRejection', (error) => {
    logError('Unhandled Promise Rejection', error);
});

process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error);
    console.error('❌ Fatal error occurred. Exiting...');
    process.exit(1);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN;
const allowedGuildId = process.env.ALLOWED_GUILD_ID;

if (!token) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
}

console.log('🚀 Starting Discord Form Bot...');

if (allowedGuildId) {
    console.log(`🔒 Bot locked to server ID: ${allowedGuildId}`);
}

client.login(token).catch((error) => {
    logError('Bot Login Failed', error);
    console.error('❌ Failed to login. Exiting...');
    process.exit(1);
});

// Export client, config, and allowedGuildId for use in other modules
export { client, config, allowedGuildId };
