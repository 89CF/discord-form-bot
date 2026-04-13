import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { listForms, getForm, getQuestions, listSubmissions } from '../database/models.js';

/**
 * Build the form list panel with dropdown
 * @param {string} guildId - Discord guild ID
 * @param {string} selectedFormId - Currently selected form ID (optional)
 * @returns {object} Message payload with embed, dropdown, and buttons
 */
export function buildFormListPanel(guildId, selectedFormId = null) {
    const forms = listForms(guildId);

    const embed = new EmbedBuilder()
        .setTitle('📝 Manage Forms')
        .setColor(0x5865F2)
        .setTimestamp();

    // If no forms exist
    if (forms.length === 0) {
        embed.setDescription('No forms found. Create your first form to get started!');
        
        const row = new ActionRowBuilder()
            .addComponents(
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

    // Build dropdown with form list
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('form_select')
        .setPlaceholder('Select a form to manage')
        .addOptions(
            forms.map(form => ({
                label: form.title.substring(0, 100), // Discord limit
                value: form.form_id,
                description: `Created: ${new Date(form.created_at).toLocaleDateString()}`,
                default: form.form_id === selectedFormId
            }))
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // If a form is selected, show its details
    if (selectedFormId) {
        const form = getForm(selectedFormId);
        const questions = getQuestions(selectedFormId);
        const submissions = listSubmissions(selectedFormId);

        if (form) {
            embed.setDescription(`**Selected Form:** ${form.title}\n\n` +
                `**Description:** ${form.description || 'No description'}\n` +
                `**Button Label:** ${form.button_label}\n` +
                `**Submission Limit:** ${form.submission_limit}\n` +
                `**Questions:** ${questions.length}\n` +
                `**Total Submissions:** ${submissions.length}`
            );

            // Add action buttons for the selected form
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`form_edit_${selectedFormId}`)
                        .setLabel('Edit Form')
                        .setEmoji('✏️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`form_submissions_${selectedFormId}`)
                        .setLabel(`View Submissions (${submissions.length})`)
                        .setEmoji('📊')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`form_delete_${selectedFormId}`)
                        .setLabel('Delete Form')
                        .setEmoji('🗑️')
                        .setStyle(ButtonStyle.Danger)
                );

            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_back_main')
                        .setLabel('Back')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                );

            return {
                embeds: [embed],
                components: [selectRow, actionRow, backRow],
                ephemeral: true
            };
        }
    }

    // No form selected yet
    embed.setDescription(`You have ${forms.length} form(s). Select one from the dropdown below to manage it.`);

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('panel_back_main')
                .setLabel('Back')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [selectRow, backRow],
        ephemeral: true
    };
}
