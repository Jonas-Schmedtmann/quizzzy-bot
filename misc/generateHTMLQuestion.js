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

  const fetchedQuestion = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}htmlquestions/latest`,
  });
  const latestQuestionId = fetchedQuestion.data.data.data[0]._id;

  const fetchedtopAnswers = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}htmlanswers?sort=-points&limit=5&questionId=${latestQuestionId}&fields=userId,answer,points,-_id`,
  });
  const topAnswers = fetchedtopAnswers.data.data.data;

  const regex =
    /https?:\/\/co?de?pe?n\.io\/[a-zA-Z0-9-_]{2,50}\/pen\/[a-zA-Z0-9-_]{0,10}/g;

  const formattedAnswers = topAnswers.map((ans, i) => {
    const penLink = ans.answer.match(regex) ? ans.answer.match(regex)[0] : "";

    return `${i + 1}) <@${ans.userId}>: ${penLink} - **Points:** ${ans.points}`;
  });

  const answerEmbed = new Discord.MessageEmbed()
    .setTitle(`Top Entries for HTML Coding Challange #${questionNo - 1}`)
    .setDescription(
      `Here are some of the top entries:\n${formattedAnswers.join("\n")}`
    )
    .setColor(config.SUCCESS_COLOR);

  return [questionEmbed, answerEmbed];
};
