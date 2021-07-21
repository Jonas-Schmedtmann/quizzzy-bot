const Discord = require("discord.js");
const axios = require("axios");
const toonAvatar = require("cartoon-avatar");
const config = require("../config");

let latestQuestion;

const restrictedUser = function (message) {
  if (message.author.bot) return true;

  return [
    "ADMINISTRATOR",
    "BAN_MEMBERS",
    "MANAGE_CHANNELS",
    "MENTION_EVERYONE",
    "MANAGE_MESSAGES",
  ].some((flag) => message.member.hasPermission(flag));
};

const createNewUser = async function (message) {
  const pfa = message.author.avatarURL()
    ? message.author.avatarURL()
    : toonAvatar.generate_avatar();

  return await axios({
    method: "POST",
    url: `${process.env.BASE_URL}users`,
    data: {
      userId: message.author.id, // userId
      tag: message.author.tag,
      photo: pfa,
    },
  });
};

const saveAnswerToDB = async function (message, questionId) {
  return await axios({
    method: "POST",
    url: `${process.env.BASE_URL}htmlanswers`,
    data: {
      answer: message.content,
      userId: message.author.id,
      questionId,
    },
  });
};

const confirmAnswer = async function (message, latestQuestion) {
  const embed = new Discord.MessageEmbed()
    .setTitle(`HTML Question Number #${latestQuestion.questionNo}`)
    .setDescription(`**User's Answer:** \n${message.content}`)
    .setFooter(
      `${message.author.username} (${message.author.id})`,
      message.author.avatarURL()
        ? message.author.avatarURL()
        : toonAvatar.generate_avatar()
    )
    .setColor(config.WARNING_COLOR);

  await message.client.channels.cache
    .get(process.env.REACTION_CHANNEL_ID)
    .send(embed);
};

const checkUser = async function (message) {
  return await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/check/${message.author.id}`,
  });
};

const checks = async function (message, latestQuestion) {
  const ifAnsweredReq = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}htmlanswers/ifanswered/${message.author.id}/${latestQuestion._id}`,
  });

  const ifAnswered = ifAnsweredReq.data.data;
  const conditions = [restrictedUser(message), message.author.bot, ifAnswered];
  return conditions.some((check) => check === true);
};

exports.postHTMLAnswer = async function postHTMLAnswer(message) {
  if (
    message.channel.id === process.env.HTML_ANSWER_CHANNEL_ID &&
    !message.author.bot
  ) {
    const triviaRole = message.member.guild.roles.cache.find(
      (role) => role.id === process.env.TRIVIA_ROLE_ID
    );
    await message.member.roles.add(triviaRole);

    const embed = new Discord.MessageEmbed()
      .setTitle(`Your answer has been recorded! 😃`)
      .setColor(config.SUCCESS_COLOR);

    const answerRecivedMessage = await message.reply("\\🎉", embed);

    setTimeout(() => {
      answerRecivedMessage.delete();
    }, 7000);

    const fetchedQuestion = await axios({
      method: "GET",
      url: `${process.env.BASE_URL}htmlquestions/latest`,
    });
    latestQuestion = fetchedQuestion.data.data.data[0];

    if (!latestQuestion) return message.delete();
    if (await checks(message, latestQuestion)) return message.delete();

    const result = await checkUser(message);
    if (!result.data.data) await createNewUser(message);

    saveAnswerToDB(message, latestQuestion._id);
    confirmAnswer(message, latestQuestion);
    message.delete();
  }
};
