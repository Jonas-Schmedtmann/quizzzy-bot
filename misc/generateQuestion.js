const Discord = require("discord.js");
const axios = require("axios");
const toonAvatar = require("cartoon-avatar");
// prettier-ignore
const alphabets = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k","l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

module.exports = async function (
  title,
  description,
  options,
  questionNo,
  image = null,
  message
) {
  const fetchedQuestion = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}questions/latest`,
  });
  const latestQuestion = fetchedQuestion.data.data.data[0];

  const optionsObj = options.map((option, i) => {
    return {
      name: `${alphabets[i].toUpperCase()}.`,
      value: option,
      inline: false,
    };
  });

  const questionEmbed = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription(
      `${description} \n\n Make sure to answer in <#${process.env.ANSWER_CHANNEL_ID}>, by just typing in the letter of the correct option.`
    )
    .addFields(...optionsObj)
    .setAuthor(`Question Number #${questionNo}`)
    .setFooter(
      message.author.username,
      message.author.avatarURL()
        ? message.author.avatarURL()
        : toonAvatar.generate_avatar()
    )
    .setColor("#31b985");

  if (image) {
    questionEmbed.setImage(image);
  }

  const answerEmbed = new Discord.MessageEmbed()
    .setTitle(`Answer of question #${questionNo - 1}`)
    .setDescription(latestQuestion.explanation)
    .setColor("#31b985");

  return [questionEmbed, answerEmbed];
};
