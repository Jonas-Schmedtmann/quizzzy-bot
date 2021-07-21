const Discord = require("discord.js");
const toonAvatar = require("cartoon-avatar");
const config = require("../config");

module.exports = async function (
  title,
  description,
  questionNo,
  image = null,
  message
) {
  const questionEmbed = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription(
      `${description} \n\n Make sure to answer in <#${process.env.HTML_ANSWER_CHANNEL_ID}>. For the answer just share a codepen link (https://codepen.io/pen) with the code. You can get at max **50 points**`
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

  return questionEmbed;
};
