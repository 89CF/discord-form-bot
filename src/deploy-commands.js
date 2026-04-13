import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error('❌ Missing required environment variables: DISCORD_TOKEN and CLIENT_ID');
    process.exit(1);
}

// Define commands
const commands = [
    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Open the Form Bot control panel (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
];

// Convert commands to JSON
const commandsData = commands.map(command => command.toJSON());

// Create REST instance
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands
async function deployCommands() {
    try {
        console.log('🚀 Started refreshing application (/) commands...');
        console.log(`📝 Registering ${commandsData.length} command(s)...`);

        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData }
        );

        console.log(`✅ Successfully registered ${data.length} application command(s)!`);
        
        // Display registered commands
        data.forEach(cmd => {
            console.log(`   - /${cmd.name}: ${cmd.description}`);
        });
        
        console.log('\n💡 Commands may take up to 1 hour to appear globally.');
        console.log('💡 For instant testing, consider using guild-specific commands during development.');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.error('\n⚠️  Missing Access: Make sure the bot is invited to your server with applications.commands scope');
        } else if (error.code === 10002) {
            console.error('\n⚠️  Unknown Application: Check that CLIENT_ID is correct');
        } else if (error.status === 401) {
            console.error('\n⚠️  Invalid Token: Check that DISCORD_TOKEN is correct');
        }
        
        process.exit(1);
    }
}

deployCommands();
