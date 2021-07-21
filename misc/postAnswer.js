const Discord = require("discord.js");
const axios = require("axios");
const toonAvatar = require("cartoon-avatar");
const config = require("../config");

let latestQuestion;

const messagesList = {};

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

const saveAnswerToDB = async function (message, type, questionId) {
  return await axios({
    method: "POST",
    url: `${process.env.BASE_URL}answers`,
    data: {
      answer: message.content,
      userId: message.author.id,
      type,
      questionId,
    },
  });
};

const createAnswerLogsEmbed = async (question, message, type) => {
  let color;

  switch (type) {
    case "CORRECT":
    case "APPROVED":
      color = config.SUCCESS_COLOR;
      break;
    case "WRONG":
    case "DENIED":
      color = config.ERROR_COLOR;
      break;
    case "INVALID":
      color = config.WARNING_COLOR;
      break;
  }

  // prettier-ignore
  const alphabets = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
  const indexOfAnswer = alphabets.indexOf(question.correctOption);
  const correctOption = question.options[indexOfAnswer];

  const embed = new Discord.MessageEmbed()
    .setTitle(question.question)
    .setDescription(`-------\n\n**Result:** ${type}\n\n-------`)
    .addFields(
      {
        name: "Correct Answer",
        value: `${question.correctOption.toUpperCase()}) ${correctOption}`,
        inline: true,
      },
      {
        name: "User's Answer",
        value: message.content,
        inline: true,
      }
    )
    .setAuthor(`Question Number #${question.questionNo}`)
    .setFooter(
      `${message.author.username} (${message.author.id})`,
      message.author.avatarURL()
        ? message.author.avatarURL()
        : toonAvatar.generate_avatar()
    )
    .setColor(color);

  const answerEmbed = await message.client.channels.cache
    .get(process.env.REACTION_CHANNEL_ID)
    .send(embed);

  if (type === "INVALID") {
    [process.env.CORRECT_EMOJI_ID, process.env.WRONG_EMOJI_ID].forEach(
      (emoji) => {
        answerEmbed.react(answerEmbed.guild.emojis.cache.get(emoji));
      }
    );

    messagesList[answerEmbed.id] = [message.author.id, question._id];
  }
};

const updatePoints = async function (userId, points) {
  const userRequest = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/${userId}`,
  });
  const user = await userRequest.data.data.data;

  if (user.totalPoints >= Math.abs(points) || points > 0) {
    await axios({
      method: "PATCH",
      url: `${process.env.BASE_URL}users/${userId}`,
      data: {
        totalPoints: user.totalPoints + points,
      },
    });
  }
};

const onCorrectAnswer = function (message, latestQuestion) {
  const type = "CORRECT";
  saveAnswerToDB(message, type, latestQuestion._id);
  createAnswerLogsEmbed(latestQuestion, message, type);
  updatePoints(message.author.id, 5);
};
const onWrongAnswer = function (message, latestQuestion) {
  const type = "WRONG";
  saveAnswerToDB(message, type, latestQuestion._id);
  createAnswerLogsEmbed(latestQuestion, message, type);
  updatePoints(message.author.id, -1);
};
const onInvalidAnswer = function (message, latestQuestion) {
  const type = "INVALID";
  saveAnswerToDB(message, type, latestQuestion._id);
  createAnswerLogsEmbed(latestQuestion, message, type);
  updatePoints(message.author.id, -2);
};

const answerInfo = async function (message, latestQuestion) {
  // prettier-ignore
  const alphabets = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

  const optionNumbers = [];
  for (let i = 0; i < latestQuestion.options.length; i++)
    optionNumbers.push(`${i + 1}`);

  const indexOfAnswer = alphabets.indexOf(latestQuestion.correctOption);

  const correctAnswer = [
    latestQuestion.correctOption,
    latestQuestion.options[indexOfAnswer].toString().trim().toLowerCase(),
    `${indexOfAnswer + 1}`,
  ];

  const text = message.content.toString().trim().toLowerCase();

  const wrongOptions = [
    ...latestQuestion.options
      .map((option) => option.toString().trim().toLowerCase())
      .filter((opt, _, arr) => opt !== arr[indexOfAnswer]),
    ...alphabets.filter((letter) => letter !== latestQuestion.correctOption),
    ...optionNumbers.filter((opt) => opt !== `${indexOfAnswer + 1}`),
  ];

  return {
    answer: correctAnswer.includes(text),
    wrongOptions: wrongOptions.includes(text),
  };
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
    url: `${process.env.BASE_URL}answers/ifanswered/${message.author.id}/${latestQuestion._id}`,
  });

  const ifAnswered = ifAnsweredReq.data.data;
  const conditions = [restrictedUser(message), message.author.bot, ifAnswered];
  // console.log(conditions);
  return conditions.some((check) => check === true);
};

const checkAnswer = async function (message, latestQuestion) {
  const check = await answerInfo(message, latestQuestion);

  // Correct answer
  if (check.answer && !check.wrongOptions)
    onCorrectAnswer(message, latestQuestion);

  // wrong answer
  if (!check.answer && check.wrongOptions)
    onWrongAnswer(message, latestQuestion);

  // Invalid Answer
  if (!check.answer && !check.wrongOptions)
    onInvalidAnswer(message, latestQuestion);
};

exports.postAnswer = async function postAnswer(message) {
  if (
    message.channel.id === process.env.ANSWER_CHANNEL_ID &&
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
      url: `${process.env.BASE_URL}questions/latest`,
    });
    latestQuestion = fetchedQuestion.data.data.data[0];

    if (!latestQuestion) return message.delete();
    if (await checks(message, latestQuestion)) return message.delete();

    const result = await checkUser(message);
    if (!result.data.data) await createNewUser(message);

    checkAnswer(message, latestQuestion);
    message.delete();
  }
};

exports.checkReaction = async (reaction, user) => {
  if (user.bot) return;
  const member = await reaction.message.guild.members.fetch(user.id);

  if (
    member.hasPermission("BAN_MEMBERS") &&
    reaction.message.channel.id === process.env.REACTION_CHANNEL_ID
  ) {
    const messageData = messagesList[reaction.message.id];
    if (!messageData) return;

    const confirmAnswerType = async function (type) {
      await axios({
        method: "PATCH",
        url: `${process.env.BASE_URL}answers/${messageData[0]}/${messageData[1]}`,
        data: {
          type,
          checkedBy: user.id,
        },
      });

      // prettier-ignore
      delete messagesList[reaction.message.id];
    };
    const embed = reaction.message.embeds[0];

    const editMessage = (type) => {
      embed.description = `-------\n\n**Result:** ${type} \n**Checked By:** ${member.displayName} *(${member.id})*\n\n-------`;
      reaction.message.edit(embed);
      reaction.message.reactions.removeAll();
    };

    if (reaction._emoji.id === process.env.CORRECT_EMOJI_ID) {
      const type = "APPROVED";
      editMessage(type);
      updatePoints(messageData[0], 1);
      confirmAnswerType(type);
    }

    if (reaction._emoji.id === process.env.WRONG_EMOJI_ID) {
      const type = "DENIED";
      editMessage(type);
      confirmAnswerType(type);
    }
  }
};
