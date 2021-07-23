const Commando = require("discord.js-commando");
const Discord = require("discord.js");
const axios = require("axios");
const config = require("./../../config");

const isNumeric = (num) =>
  (typeof num === "number" || (typeof num === "string" && num.trim() !== "")) &&
  !isNaN(num);

const updatePoints = async function (userId, points) {
  const userRequest = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/${userId}`,
  });
  const user = await userRequest.data.data.data;

  await axios({
    method: "PATCH",
    url: `${process.env.BASE_URL}users/${userId}`,
    data: {
      totalPoints: user.totalPoints + points,
    },
  });

  return user.totalPoints;
};

const updateAnswer = async function (userId, questionId, body) {
  await axios({
    method: "PATCH",
    url: `${process.env.BASE_URL}htmlanswers/${userId}/${questionId}`,
    data: body,
  });
};

const ifChecked = async function (userId, questionId) {
  const ifCheckedReq = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}htmlanswers/ifchecked/${userId}/${questionId}`,
  });

  return ifCheckedReq.data.data;
};

module.exports = class AddCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: "addpoints",
      aliases: ["addpoint", "ap"],
      group: "points",
      memberName: "addpoints",
      description: "Add points to a user for a HTML Answer.",
      format: "addpoints <user id/user mention> <points> [message]",
      userPermissions: ["MANAGE_MESSAGES"],
      guildOnly: true,
    });
  }

  async run(message, args) {
    const send = (type, msg) => {
      const emoji = message.client.emojis.cache.get(
        type === "ERROR"
          ? process.env.WRONG_EMOJI_ID
          : process.env.CORRECT_EMOJI_ID
      );

      const embed = new Discord.MessageEmbed()
        .setTitle(`${emoji}  ${msg}`)
        .setColor(type === "ERROR" ? config.ERROR_COLOR : config.SUCCESS_COLOR);

      message.channel.send(embed);
    };

    const fetchedQuestion = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}htmlquestions/latest`,
    });
    const latestQuestion = fetchedQuestion.data.data.data[0];

    if (!latestQuestion) {
      return send(
        "ERROR",
        `There is no question added yet, plz add a question first.`
      );
    }

    const identity = args.split(" ")[0];

    if (identity === "@everyone") {
      return send("ERROR", `Points couldn't be added to everyone!`);
    }

    if (identity === "@here") {
      return send("ERROR", `Points couldn't be added to here!`);
    }

    if (identity.startsWith("<@&")) {
      return send("ERROR", `Points couldn't be added to roles or bots!`);
    }

    const id = identity.startsWith("<@!") ? identity.slice(3, -1) : identity;

    if (id.length !== 18 || !isNumeric(id)) {
      return send("ERROR", `Invalid user id ${id}`);
    }

    const member = await message.guild.members.fetch(id);

    const isAnswerChecked = await ifChecked(id, latestQuestion._id);

    if (!isAnswerChecked) {
      return send(
        "ERROR",
        `${member.user.username} (${member.user.id}) has not yet answered the current question.`
      );
    }

    if (isAnswerChecked.checkedBy) {
      const checkedBy = await message.guild.members.fetch(
        isAnswerChecked.checkedBy
      );
      return send(
        "ERROR",
        `${member.user.username} (${member.user.id}) has already been scored for the current question by ${checkedBy.user.username} (${checkedBy.user.id}).`
      );
    }

    const points = +args.split(" ")[1];

    if (!points || !isNumeric(points)) {
      return send("ERROR", `Points should be a number!`);
    }

    if (points < 0 || points > 100) {
      return send("ERROR", `Points should be above 0 and below 100!`);
    }

    const reasonStr = args.split(" ")?.slice(2)?.join(" ")?.trim();
    const reason = reasonStr.length === 0 ? null : reasonStr;

    const body = { points, checkedBy: message.author.id };
    if (reason) body.message = reason;

    const oldPoints = await updatePoints(id, points);

    await updateAnswer(id, latestQuestion._id, body);

    send(
      "SUCCESS",
      `${member.user.username}'s (${
        member.user.id
      }) points has been incresed from ${oldPoints} to ${oldPoints + points}`
    );
  }
};
