<div align="center">
  <img src="https://raw.githubusercontent.com/89CF/discord-form-bot/main/assets/banner.png" alt="Discord Form Bot Banner" width="100%" onerror="this.onerror=null; this.src='https://via.placeholder.com/800x200/5865F2/FFFFFF?text=Discord+Form+Bot';" />
  
  <br />
  <br />

  <h1>🚀 Discord Form Bot</h1>

  <p>
    <strong>A highly customizable and interactive form submission system for Discord communities.</strong>
  </p>

  <p>
    <a href="https://github.com/89CF/discord-form-bot/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/89CF/discord-form-bot?style=for-the-badge&color=5865F2" alt="License" />
    </a>
    <a href="https://nodejs.org">
      <img src="https://img.shields.io/badge/Node.js-18.x-success?style=for-the-badge&logo=node.js&color=339933" alt="Node Version" />
    </a>
    <a href="https://discord.js.org/">
      <img src="https://img.shields.io/badge/Discord.js-v14-blue?style=for-the-badge&logo=discord&color=5865F2" alt="Discord.js" />
    </a>
    <a href="https://github.com/89CF/discord-form-bot/issues">
      <img src="https://img.shields.io/github/issues/89CF/discord-form-bot?style=for-the-badge&color=FEE75C" alt="Issues" />
    </a>
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#getting-started">Installation</a> •
    <a href="#usage">Usage Guide</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

<hr />

## 🌟 About The Project

**Discord Form Bot** transforms how you manage applications, support requests, and feedback in your server. Say goodbye to messy DMs and hello to a streamlined, fully in-Discord experience! 

With an intuitive **Control Panel**, admins can create unlimited forms, review submissions with pre-configured templates, and even automatically invite approved applicants to private target servers.

---

## ✨ Features

- **🎯 Multi-Form Support** — Create an unlimited number of forms customized for different purposes.
- **🔘 Persistent Buttons** — Provide users with interactive, always-on buttons to trigger forms.
- **🕹️ Admin Control Panel** — Manage everything directly in Discord (`/panel`) using intuitive modals and dropdowns.
- **✉️ Review System** — Approve or reject with customized (or pre-configured) messages delivered directly to the user's DMs.
- **🔗 Auto-Invite Architecture** — Automatically send unique, single-use invite links to target servers upon approval.
- **🛡️ Spam Protection** — Set submission limits to prevent spam (Once vs. Unlimited).
- **🔔 Smart Notifications** — Tag specific roles or users when a new submission arrives.
- **💾 SQLite Database** — Robust storage utilizing SQLite with automatic migrations.

---

## 🛠️ Tech Stack

- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment.
- **[Discord.js (v14)](https://discord.js.org/)** - Powerful module to interact with the Discord API.
- **[Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)** - The fastest and simplest SQLite3 library for Node.js.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the bot up and running on your local machine or server.

### Prerequisites

- Node.js (v18.0.0 or higher)
- NPM or Yarn
- A [Discord Bot Account](https://discord.com/developers/applications) with a token.

> **Note:** The bot requires the `Guilds`, `Guild Messages`, and `Direct Messages` intents, along with `Send Messages`, `Embed Links`, `Manage Messages`, and `Create Instant Invite` permissions.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/89CF/discord-form-bot.git
   cd discord-form-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in your details:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   DATABASE_PATH=./data/bot.db
   ALLOWED_GUILD_ID=your_server_id_here  # Optional: Restrict bot to a specific server
   ```

4. **Deploy Application (Slash) Commands:**
   ```bash
   npm run deploy
   ```

5. **Start the Bot:**
   ```bash
   npm start
   ```

---

## 📖 Usage

### The Admin Panel
To access the core of the bot, type:
```
/panel
```
*(Only users with Admin permissions can use this command.)*

From the interactive dashboard, you can:
- **➕ Create a New Form:** Setup title, description, and up to 5 custom questions.
- **📝 Manage Forms:** Edit questions, set target Auto-Invite servers, configure default review messages.
- **⚙️ Settings:** Define the Admin Channel where submissions land, and configure ping notifications.

### The Auto-Invite Workflow
1. Go to **Manage Forms** -> **Edit** -> **Set Target Server**.
2. Input the Discord Server ID of the destination server *(the bot must be in that server too)*.
3. Every time you click **Approve** on a submission, the bot creates a temporary, single-use invite to that target server and DMs it to the user!

---

## 📂 Project Structure

```text
discord-form-bot/
├── src/
│   ├── commands/          # Slash command definitions
│   ├── handlers/          # Event & Interaction routing
│   ├── panels/            # UI builders for Discord Modals/Embeds
│   ├── database/          # SQLite Queries & Migrations
│   ├── utils/             # Helpers, Embed definitions, Validators
│   └── index.js           # Main Entry Point
├── data/
│   └── bot.db             # Auto-generated SQLite Database
├── config.json            # Base configuration limits
└── package.json
```

---

## 🤝 Contributing

Contributions make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <b>Built with ❤️ by <a href="https://github.com/89CF">89CF</a></b>
</div>
