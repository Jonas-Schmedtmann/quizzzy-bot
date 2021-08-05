const Commando = require("discord.js-commando");
const Discord = require("discord.js");
const axios = require("axios");
const ordinal = require("ordinal");
const config = require("./../../config");

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "message",
      aliases: ["msg", "reason"],
      group: "answers",
      memberName: "message",
      description: "Message/Reason for the HTML Question",
      format: "message [user id|question no] [question no]",
      argsType: "multiple",
      throttling: { usages: 1, duration: 14400 },
    });
  }

  async run(message, args) {
    const { id } = message.author;

    let userId = id;
    let questionNo = null;

    if (args.length === 1) {
      if (args[0].length === 18) userId = args[0];
      else questionNo = args[0];
    }

    if (args.length === 2) {
      if (args[0].length === 18) userId = args[0];
      questionNo = args[1];
    }

    const fetchedQuestion = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}htmlquestions/${
        questionNo === null ? "latest" : `?questionNo=${questionNo}`
      }`,
    });
    const latestQuestion = fetchedQuestion.data.data.data[0];

    if (!latestQuestion) {
      return await message.reply(
        `${ordinal(+questionNo)} Question does not exist!`
      );
    }

    const answerRequest = await axios({
      method: "PATCH",
      url: `${process.env.BASE_URL}htmlanswers/${userId}/${latestQuestion._id}`,
    });

    if (!answerRequest.data.data) {
      return await message.channel.send(
        `<@${userId}> has not answered ${
          questionNo === null ? "the latest" : ordinal(+questionNo)
        } question.`
      );
    }

    const answer = answerRequest.data.data;

    const embed = new Discord.MessageEmbed()
      .setTitle(`HTML Quiz's ${ordinal(+questionNo)} Question`)
      .setDescription(
        `**User:** <@${userId}>\n**Points:** ${answer.points}\n**Message:** *${answer.message}*`
      )
      .setColor(config.SUCCESS_COLOR);

    await message.channel.send(embed);
  }
};
