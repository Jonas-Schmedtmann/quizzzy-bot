const Discord = require("discord.js");
const axios = require("axios");
const toonAvatar = require("cartoon-avatar");

let latestQuestion;

const messagesList = {};

const restrictedUser = function (message) {
  if (message.author.bot) return true;

  return [
    "ADMINISTRATOR",
    "BAN_MEMBERS",
    "MANAGE_CHANNELS",
    "MENTION_EVERYONE",
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

const confirmInvalidAnswer = async function (message, latestQuestion) {
  // prettier-ignore
  const alphabets = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
  const indexOfAnswer = alphabets.indexOf(latestQuestion.correctOption);
  const correctOption = latestQuestion.options[indexOfAnswer];

  const embed = new Discord.MessageEmbed()
    .setTitle(latestQuestion.question)
    .addFields(
      {
        name: "Correct Answer",
        value: `${latestQuestion.correctOption.toUpperCase()}) ${correctOption}`,
        inline: true,
      },
      {
        name: "User's Answer",
        value: message.content,
        inline: true,
      }
    )
    .setAuthor(`Question Number #${latestQuestion.questionNo}`)
    .setFooter(
      `${message.author.username} (${message.author.id})`,
      message.author.avatarURL()
        ? message.author.avatarURL()
        : toonAvatar.generate_avatar()
    )
    .setColor("#f84343");

  const invalidMessageEmbed = await message.client.channels.cache
    .get(process.env.REACTION_CHANNEL_ID)
    .send(embed);

  [process.env.CORRECT_EMOJI_ID, process.env.WRONG_EMOJI_ID].forEach(
    (emoji) => {
      invalidMessageEmbed.react(
        invalidMessageEmbed.guild.emojis.cache.get(emoji)
      );
    }
  );

  messagesList[invalidMessageEmbed.id] = [
    message.author.id,
    latestQuestion._id,
  ];
};

const updatePoints = async function (messageUserId, points) {
  const userRequest = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}users/${messageUserId}`,
  });
  const user = await userRequest.data.data.data;

  if (user.totalPoints >= Math.abs(points) || points > 0) {
    await axios({
      method: "PATCH",
      url: `${process.env.BASE_URL}users/${messageUserId}`,
      data: {
        totalPoints: user.totalPoints + points,
      },
    });
  }
};

const onCorrectAnswer = function (message, latestQuestion) {
  saveAnswerToDB(message, "CORRECT", latestQuestion._id);
  updatePoints(message.author.id, 5);
};
const onWrongAnswer = function (message, latestQuestion) {
  saveAnswerToDB(message, "WRONG", latestQuestion._id);
  updatePoints(message.author.id, -1);
};
const onInvalidAnswer = function (message, latestQuestion) {
  saveAnswerToDB(message, "INVALID", latestQuestion._id);
  confirmInvalidAnswer(message, latestQuestion);
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
      .setColor("#faa61a");

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
    const confirmAnswerType = async function (type) {
      const messageData = messagesList[reaction.message.id];

      await axios({
        method: "PATCH",
        url: `${process.env.BASE_URL}answers/${messageData[0]}/${messageData[1]}`,
        data: {
          type,
          checkedBy: user.id,
        },
      });
      // prettier-ignore
      reaction.message.delete();
    };

    if (reaction._emoji.id === process.env.CORRECT_EMOJI_ID) {
      confirmAnswerType("APPROVED");
      updatePoints(messagesList[reaction.message.id][0], 1);
    }

    if (reaction._emoji.id === process.env.WRONG_EMOJI_ID) {
      confirmAnswerType("DENIED");
    }
    delete messagesList[reaction.message.id];
  }
};
