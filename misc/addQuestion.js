const generateQuestion = require("./generateQuestion");
// const fs = require("fs");
const axios = require("axios");
const { MessageButton, MessageActionRow } = require("discord-buttons");

const getQuestionCount = async () => {
  const res = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}settings/questioncount`,
  });

  return res.data.data.questionCount;
};

module.exports = async function (message, client) {
  // Delete the command
  await message.delete();

  // Get the message
  const fetched = await message.channel.messages.fetch({ limit: 1 });
  const question = fetched.first();

  // Parse the Message
  const [content, optionsStr, answerOption, explanation] = question.content
    .split("%%%")
    .map((part) => part.trim());

  if (!content || !optionsStr || !answerOption) {
    return message.reply(`The question is not in the correct format. Kindly follow the correct format:
\`\`\`
question
%%%
option 1

option 2

option 3
%%%
correct option letter like: a
%%%
explanation
\`\`\``);
  }

  const options = optionsStr.split("\n").filter((option) => option !== "");

  // Genrating the message body
  const post = {
    question: content,
    options,
    correctOption: answerOption,
    userId: message.author.id,
    questionNo: (await getQuestionCount()) + 1,
    explanation,
  };

  if (question.attachments.size) {
    post.image = Array.from(question.attachments.values())[0].url;
  }

  // Genrating the question
  const [questionEmbed, answerEmbed] = await generateQuestion(
    content,
    options,
    post.questionNo,
    post.image,
    message
  );

  const button = new MessageButton()
    .setStyle("green")
    .setLabel("Add Question")
    .setEmoji(process.env.CORRECT_EMOJI_ID)
    .setID("add_question");

  const button2 = new MessageButton()
    .setStyle("red")
    .setLabel("Cancel")
    .setEmoji(process.env.WRONG_EMOJI_ID)
    .setID("remove_question");

  const row = new MessageActionRow().addComponents(button, button2);
  // Confirm Message
  const confirmAnswerMessage = await message.channel.send(
    "👇 This is how the answer of the last question will look like, are u happy with it?",
    answerEmbed
  );
  const confirmMessage = await message.channel.send(
    "👇 This is how the question will look, are u happy with it?",
    questionEmbed
  );
  const buttons = await message.channel.send("﹏", row);

  // Check Confirmation
  client.on("clickButton", async ({ id, message, clicker, reply }) => {
    const { user, member } = clicker;
    if (!user.bot && member.hasPermission("MANAGE_ROLES")) {
      const deleteMessages = async (msg, sec = 3) => {
        const infoMessage = await reply.send(msg);
        confirmAnswerMessage.delete();
        confirmMessage.delete();
        buttons.delete();

        setTimeout(() => {
          infoMessage.delete();
        }, sec * 1000);
      };
      // Add the question
      if (id === "add_question") {
        // Post the Message
        await axios({
          method: "POST",
          url: `${process.env.BASE_URL}questions`,
          data: post,
        });

        // Show final message
        message.client.channels.cache
          .get(process.env.QUESTION_CHANNEL_ID)
          .send(`<@&${process.env.TRIVIA_ROLE_ID}>`, answerEmbed);
        message.client.channels.cache
          .get(process.env.QUESTION_CHANNEL_ID)
          .send(questionEmbed);

        deleteMessages("https://i.stack.imgur.com/KZiub.gif");
      }

      // Delete the messages
      if (id === "remove_question") {
        deleteMessages("https://i.stack.imgur.com/dB8Ny.gif");
      }
    }
  });
};
