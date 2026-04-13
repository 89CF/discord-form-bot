# Discord Form Bot

A powerful multi-form submission system for Discord servers with an interactive control panel. Admins can create unlimited forms with persistent buttons, review submissions, and automatically invite approved users to target servers.

## Features

✅ **Multi-Form Support** - Create unlimited forms per server
✅ **Persistent Buttons** - Users click buttons to open and submit forms
✅ **Interactive Control Panel** - Manage everything through Discord with buttons and modals
✅ **Admin Review System** - Approve or reject submissions with custom messages
✅ **Auto-Invite System** - Approved users receive unique, single-use invite links to target servers
✅ **Pre-configured Review Messages** - Set default approve/reject messages per form
✅ **Submission Limits** - Prevent spam with one-time or unlimited submission options
✅ **Notification System** - Get mentioned when new submissions arrive
✅ **Form Editing** - Update forms after creation without losing data
✅ **Full English Support** - All interactions in English

## Requirements

- Node.js v18 or higher
- Discord Bot Token
- Discord Application Client ID

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd discord-form-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your bot credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
DATABASE_PATH=./data/bot.db
ALLOWED_GUILD_ID=your_server_id_here  # Optional: Lock bot to your server only
```

**To lock the bot to your server only:**
1. Right-click your server name in Discord
2. Click "Copy Server ID" (enable Developer Mode in Discord settings if you don't see this)
3. Paste the ID as `ALLOWED_GUILD_ID` in `.env`
4. If you leave this empty or remove it, the bot will work in any server it's invited to

4. **Deploy slash commands**
```bash
npm run deploy
```

5. **Start the bot**
```bash
npm start
```

## Bot Setup

### Creating a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Copy the bot token and add it to your `.env` file as `DISCORD_TOKEN`
5. Copy the Application ID from "General Information" and add it to `.env` as `CLIENT_ID`

### Bot Permissions

The bot requires the following permissions:
- Send Messages
- Embed Links
- Use Slash Commands
- Manage Messages (for editing button messages)
- Read Message History
- Create Instant Invite (for auto-invite feature)

### Bot Intents

Enable these intents in the Discord Developer Portal (Bot section):
- Guilds
- Guild Messages
- Direct Messages

### Invite Link

Use this URL format to invite your bot (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

## Usage

### Admin Commands

**`/panel`** - Opens the main control panel (Admin only)

From the control panel, you can:
- ➕ Create new forms
- 📝 Manage existing forms
- ⚙️ Configure settings
- 📊 View statistics

### Creating a Form

1. Run `/panel` and click "Create New Form"
2. Fill in the form details (title, description, button label, color, submission limit)
3. Add questions (1-5 questions, mark as required/optional)
4. Preview your form
5. Select a channel to deploy the button
6. Done! Users can now click the button to submit

### Managing Forms

1. Run `/panel` and click "Manage Forms"
2. Select a form from the dropdown
3. Choose an action:
   - ✏️ **Edit Form** - Modify form details or questions
   - 🎯 **Set Target Server** - Configure auto-invite for approved users
   - 💬 **Set Review Messages** - Pre-configure approve/reject messages
   - 📊 **View Submissions** - See all submissions with pagination
   - 🗑️ **Delete Form** - Remove form and all submissions

### Auto-Invite Feature

When you approve a user, they can automatically receive an invite to a target server:

1. Edit your form and click "Set Target Server"
2. Enter the target server ID (the bot must be in that server)
3. Bot will verify it has "Create Instant Invite" permission
4. When you approve a submission, the user receives a unique, single-use invite link
5. The invite expires in 24 hours and can only be used once

**Important:** The bot must be added to both:
- The server where forms are created (form server)
- The server where approved users will be invited (target server)

### Pre-configured Review Messages

Save time by setting default messages:

1. Edit your form and click "Set Review Messages"
2. Enter default approve and/or reject messages
3. Leave blank if you want to write custom messages each time
4. When reviewing submissions:
   - If message is set: Used automatically (no modal)
   - If not set: Modal opens to ask for message

### Configuring Settings

1. Run `/panel` and click "Settings"
2. Set up:
   - **Admin Channel** - Where submissions are sent for review
   - **Notifications** - Get mentioned when submissions arrive (role or user)

### Reviewing Submissions

When a user submits a form:
1. Submission appears in your admin channel
2. Click "Approve" or "Reject"
3. If pre-configured message exists, it's used automatically
4. Otherwise, enter a custom message
5. User receives your message via DM
6. If approved and target server is set, user also receives unique invite link

## Project Structure

```
discord-form-bot/
├── src/
│   ├── commands/          # Slash commands
│   │   └── panel.js       # Main /panel command
│   ├── handlers/          # Interaction handlers
│   │   ├── panelHandler.js
│   │   ├── formButtonHandler.js
│   │   ├── modalHandler.js
│   │   ├── reviewHandler.js
│   │   └── selectMenuHandler.js
│   ├── panels/            # Panel builders
│   │   ├── mainPanel.js
│   │   ├── createFormPanel.js
│   │   ├── editFormPanel.js
│   │   ├── formListPanel.js
│   │   ├── formPreviewPanel.js
│   │   ├── questionBuilderPanel.js
│   │   ├── settingsPanel.js
│   │   └── submissionsPanel.js
│   ├── database/          # Database layer
│   │   ├── db.js          # SQLite connection & migrations
│   │   └── models.js      # Data access functions
│   ├── utils/             # Utility functions
│   │   ├── embeds.js
│   │   ├── validators.js
│   │   ├── permissions.js
│   │   └── errorHandler.js
│   ├── index.js           # Bot entry point
│   └── deploy-commands.js # Command registration
├── data/
│   └── bot.db             # SQLite database (auto-created)
├── .env                   # Environment variables
├── config.json            # Bot configuration
└── package.json
```

## Database Schema

The bot uses SQLite with the following tables:

- **servers** - Server configurations (admin channel, notifications)
- **forms** - Form definitions (includes approve/reject messages, target server)
- **questions** - Form questions
- **submissions** - User submissions
- **answers** - Submission answers

All tables use foreign key constraints with cascade deletes for data integrity.

Database migrations run automatically on bot startup.

## Configuration

Edit `config.json` to customize limits:

```json
{
  "maxQuestionsPerForm": 5,
  "maxTitleLength": 100,
  "maxDescriptionLength": 500,
  "maxQuestionLength": 45,
  "maxButtonLabelLength": 80,
  "submissionsPerPage": 5
}
```

## Advanced Features

### Multi-Server Setup

The bot can manage forms in one server and invite approved users to another:

1. Add bot to Server A (form server)
2. Add bot to Server B (target server)
3. In Server A, create a form
4. Edit form → Set Target Server → Enter Server B's ID
5. Approved users receive invite to Server B

### Security Features

- **Single-use invites**: Each approved user gets a unique invite that expires after 1 use
- **Time-limited invites**: Invites expire after 24 hours
- **Permission checks**: Bot verifies it has required permissions before creating invites
- **Submission limits**: Prevent spam with "once" or "unlimited" options

## Troubleshooting

### Commands not appearing

- Wait up to 1 hour for global commands to register
- Or use guild-specific commands for instant testing (modify `deploy-commands.js`)

### Bot not responding

- Check that the bot is online in your server
- Verify the bot has required permissions
- Check console for error messages

### Database errors

- Ensure the `data/` directory exists and is writable
- Check that SQLite is properly installed
- Migrations run automatically on startup

### DM failures

- If a user has DMs disabled, the admin will be notified in the admin channel
- This is expected behavior and not an error

### Auto-invite not working

- Verify bot is in the target server
- Check bot has "Create Instant Invite" permission in target server
- Ensure target server ID is correct (use Developer Mode to copy ID)

### Form not found errors

- This usually means the form was deleted
- Check the form still exists in "Manage Forms"

## Support

For issues or questions, please open an issue on GitHub.

## License

ISC
