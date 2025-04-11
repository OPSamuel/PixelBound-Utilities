const cron = require('node-cron');
const quotes = require('../../data/questions');
const { EmbedBuilder } = require('discord.js');

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {

    const CHANNEL_ID = '1224492394595225800';

    cron.schedule('0 11 * * *', () => {

      const channel = client.channels.cache.get(CHANNEL_ID);
      if (channel) {

        const quote = getRandomQuote();

        const date = new Date();
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        const embed = new EmbedBuilder()
          .setTitle(`Question of the Day - ${formattedDate}`)
          .setDescription(`${quote}\n\nDiscuss in <#1224494255087554610>`)
          .setColor("#e91e63");

        channel.send({ content: "<@&1224494161055584378>", embeds: [embed] })
          .then()
          .catch((err) => {
            console.error('Error sending question:', err);
            console.error('Error details:', err.message, err.stack);
          });
      } else {
        console.error('Channel not found!');
      }
    }, {
      timezone: 'Europe/London',
    });

  },
};