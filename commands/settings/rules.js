const Discord = require("discord.js");
const Commando = require("discord.js-commando");
const config = require("../../config");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "rules",
      aliases: ["rule"],
      group: "settings",
      memberName: "rules",
      description: "Display the rules for the HTML Challange.",
      argsType: "multiple",
      format: "rules",
    });
  }

  async run(message) {
    const rules = [
      "You have **7 days** to answer the challenge question.",
      `Submit the answer in <#${process.env.HTML_ANSWER_CHANNEL_ID}>.`,
      "For the answer just add a **CodePen Link** *(https://codepen.io/pen)* with your code.",
      "You have to use HTML & CSS only. You are allowed to use CSS Preprocessors like SASS/SCSS or LESS etc. *But You are not allowed to use any CSS framework like Bootstrap or Tailwind.*",
      "If you are stuck on something during the challenge, you can ask on the server. *But, you are not allowed to share your code with someone else, if you found sharing of code then 20 points will be deducted from your total points.*",
      "At the end of Day 7, we will release top 5 entries given by you all. We will also post the next challenge question along with the solutions.",
      "You can get up to 50 points for a challenge. The higher you are on the leaderboard, then you are more likely to get better rewards.",
      "To know your points you can use the `!points` command, for more info you can use the `!help` command.",
      `We are open to suggestions, if you have some ideas or things that should be implemented/improved, use the <#${process.env.SUPPORT_CHANNEL_ID}> channel to send us your feedback.`,
    ];

    const ruleStr = rules
      .map((rule, i) => `**${i + 1})** ${rule}`)
      .join("\n\n");

    const embed = new Discord.MessageEmbed()
      .setTitle("Rules")
      .setDescription(ruleStr)
      .setColor(config.SUCCESS_COLOR);

    try {
      await message.author.send(embed);

      if (message.channel.type === "text") {
        message.reply("Sent you a DM containing the rules.");
      }
    } catch (err) {
      message.reply(
        "Something went wrong, make sure you don't have the bot blocked or DM's are not closed!"
      );
    }
  }
};
