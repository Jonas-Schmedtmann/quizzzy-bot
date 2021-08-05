const Commando = require("discord.js-commando");
const Discord = require("discord.js");
const axios = require("axios");
const config = require("./../../config");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "message",
      aliases: ["msg", "reason"],
      group: "answers",
      memberName: "message",
      description: "Message/Reason for the latest HTML Question",
      format: "message",
      throttling: { usages: 1, duration: 14400 },
    });
  }

  async run(message) {
    const { id: userId } = message.author;

    const fetchedQuestion = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}htmlquestions/latest`,
    });
    const latestQuestion = fetchedQuestion.data.data.data[0];

    const answerRequest = await axios({
      method: "PATCH",
      url: `${process.env.BASE_URL}htmlanswers/${userId}/${latestQuestion._id}`,
    });

    if (!answerRequest.data.data) {
      return await message.channel.send(
        `<@${userId}> has not answered the latest question yet.`
      );
    }

    const answer = answerRequest.data.data;

    const embed = new Discord.MessageEmbed()
      .setTitle(`Points: ${answer.points}`)
      .setDescription(`**Message:** *${answer.message}*`)
      .setColor(config.SUCCESS_COLOR);

    await message.channel.send(embed);
  }
};
