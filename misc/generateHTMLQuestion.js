const Discord = require("discord.js");
const axios = require("axios");
const toonAvatar = require("cartoon-avatar");
const config = require("../config");

module.exports = async function (
  title,
  description,
  questionNo,
  image = null,
  message
) {
  const fetchedQuestion = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}htmlquestions/latest`,
  });
  const latestQuestion = fetchedQuestion.data.data.data[0];

  const questionEmbed = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription(
      `${description} \n\n Make sure to answer in <#${process.env.HTML_ANSWER_CHANNEL_ID}>. For the answer just share a codepen link (https://codepen.io/pen) with the code. You can get up to **50 points**. For more you can use the \`!rules\` command.`
    )
    .setAuthor(`Question Number #${questionNo}`)
    .setFooter(
      message.author.username,
      message.author.avatarURL()
        ? message.author.avatarURL()
        : toonAvatar.generate_avatar()
    )
    .setColor(config.SUCCESS_COLOR);

  if (image) {
    questionEmbed.setImage(image);
  }

  const answerEmbed = new Discord.MessageEmbed()
    .setTitle(`Solution for HTML Challange #${questionNo - 1}`)
    .setDescription(latestQuestion.explanation)
    .setColor(config.SUCCESS_COLOR);

  return [questionEmbed, answerEmbed];
};
