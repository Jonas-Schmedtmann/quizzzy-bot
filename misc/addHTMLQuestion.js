const Discord = require("discord.js");
const generateHTMLQuestion = require("./generateHTMLQuestion");
const axios = require("axios");
const { MessageButton, MessageActionRow } = require("discord-buttons");

const getQuestionCount = async () => {
  const res = await axios({
    method: "GET",
    url: `${process.env.BASE_URL}settings/htmlquestioncount`,
  });

  return res.data.data.htmlquestioncount;
};

module.exports = async function (message, client) {
  const userId = message.author.id;
  const channelId = message.channel.id;

  let post;

  const send = (msg) => message.channel.send(msg);

  class Question {
    constructor() {
      this.questions = [];
      this.replies = [];
      this.currentQuestion = 0;
    }

    setQuestions(questions) {
      this.questions.push(...questions);
    }

    async askQuestion(prevMessage = null) {
      let reply = prevMessage !== null ? prevMessage.content.trim() : null;
      const command = this.checkCommand(reply);
      if (command === "CANCEL") return;

      const validate = this.validateReply(prevMessage);

      if (!validate) {
        this.currentQuestion--;
        return this.askQuestion();
      }

      if (this.currentQuestion < this.questions.length) {
        const curQuestion = this.questions[this.currentQuestion];

        if (this.questions[this.currentQuestion - 1]?.type === "IMAGE") {
          const attachments = prevMessage?.attachments?.values();
          if (!attachments) {
            reply = "skip";
          } else {
            reply = Array.from(attachments)[0]?.url || "skip";
          }
        }

        send(`**${curQuestion.question}**`);
        if (reply) this.replies.push(reply);

        if (validate) this.currentQuestion++;
      } else {
        this.replies.push(reply);
        await this.save();
      }
    }

    checkCommand(commandMsg) {
      if (commandMsg === null) return true;

      if (commandMsg.trim().toLowerCase() === "cancel") {
        this.message("ERROR", "Question creating has been cancelled!");
        this.reset();
        return "CANCEL";
      }

      return true;
    }

    validateReply(replyMessage) {
      const reply = replyMessage !== null ? replyMessage.content.trim() : null;

      if (reply === null) return true;
      const curQuestion = this.questions[this.currentQuestion - 1];

      if (!curQuestion.validate.call(this, reply, replyMessage)) {
        this.message("ERROR", curQuestion.validationError);
        return false;
      }
      return true;
    }

    onReplies(msg) {
      if (
        msg.channel.id === channelId &&
        msg.author.id === userId &&
        !msg.author.bot
      ) {
        question.askQuestion(msg);
      }
    }

    async confirmQuestion(description, questionNo, imageURL, message) {
      const questionEmbed = await generateHTMLQuestion(
        "Can you convert this design to code with only HTML & CSS?",
        description,
        questionNo,
        imageURL,
        message
      );

      this.questionEmbed = questionEmbed;

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
      this.confirmMessage = await message.channel.send(
        "👇 This is how the question will look, are u happy with it?",
        questionEmbed
      );
      this.buttonsMessage = await message.channel.send("﹏", row);
    }

    async save() {
      let [description, imageURL, explanation] = [...this.replies];

      if (description === "skip") description = null;
      if (imageURL === "skip") imageURL = null;

      post = {
        userId: userId,
        questionNo: (await getQuestionCount()) + 1,
        explanation: explanation,
      };

      if (imageURL) post.image = imageURL;
      if (description) post.description = description;

      const confirmDescription = post?.description || "";
      const image = post?.image || null;

      await this.confirmQuestion(
        confirmDescription,
        post.questionNo,
        image,
        message
      );

      message.client.on(
        "clickButton",
        this.confirmQuestionButtonHandler.bind(this)
      );
    }

    async confirmQuestionButtonHandler({ id, message, clicker, reply }) {
      const { user, member } = clicker;
      if (
        !user.bot &&
        user.id === userId &&
        member.hasPermission("MANAGE_ROLES")
      ) {
        const deleteMessages = async (msg, sec = 3) => {
          const infoMessage = await reply.send(msg);
          await this.confirmMessage.delete();
          await this.buttonsMessage.delete();

          setTimeout(() => {
            infoMessage.delete();
          }, sec * 1000);
        };

        // Add the question
        if (id === "add_question") {
          await axios({
            method: "POST",
            url: `${process.env.BASE_URL}htmlquestions`,
            data: post,
          });

          // Show final message
          await message.client.channels.cache
            .get(process.env.HTML_QUESTION_CHANNEL_ID)
            .send(`<@&${process.env.TRIVIA_ROLE_ID}>`, this.questionEmbed);

          await deleteMessages("https://i.stack.imgur.com/KZiub.gif");

          send(
            new Discord.MessageEmbed()
              .setTitle(
                `Question has been successfully posted in #${
                  message.client.channels.cache.get(
                    process.env.HTML_QUESTION_CHANNEL_ID
                  ).name
                }`
              )
              .setColor("#43b581")
          );
        }

        // Delete the messages
        if (id === "remove_question") {
          await deleteMessages("https://i.stack.imgur.com/dB8Ny.gif");
          this.message("ERROR", "Question was removed.");
        }
        this.reset();
      }
    }

    message(type, msg) {
      const emoji = message.client.emojis.cache.get(
        type === "ERROR"
          ? process.env.WRONG_EMOJI_ID
          : process.env.CORRECT_EMOJI_ID
      );

      const embed = new Discord.MessageEmbed()
        .setTitle(`${emoji}  ${msg}`)
        .setColor(type === "ERROR" ? "#f04947" : "#43b581");
      send(embed);
    }

    reset() {
      this.questions = [];
      this.replies = [];
      this.currentQuestion = 0;

      client.removeListener("message", question.onReplies);
    }
  }

  const question = new Question();

  question.setQuestions([
    {
      question: "Please enter a description for the question.",
      validate(reply) {
        return reply.length < 4096 - 150;
      },
      validationError:
        "Description is limited to 4096 characters, please reduce the text.",
    },
    {
      question: "Please add a image of the design to code.",
      type: "IMAGE",
      optional: true,
      validate(reply, replyMessage) {
        const image = Array.from(replyMessage.attachments.values())[0];
        if (image?.url || replyMessage.content === "skip" || reply === null)
          return true;
        return false;
      },
      validationError: "No image was posted, please add an image.",
    },
    {
      question: "Please enter the solution link for this question.",
      validate(reply) {
        return reply.length < 4096;
      },
      validationError:
        "Solutions is limited to 4096 characters, please reduce the text.",
    },
  ]);

  const emoji = await message.client.emojis.cache.get(
    process.env.CORRECT_EMOJI_ID
  );
  const embed = new Discord.MessageEmbed()
    .setTitle(
      `${emoji}  Answer the below questions to set the question for HTML Coding challange. You can type \`cancel\` at any time to cancel question creation.`
    )
    .setColor("#43b581");

  await send(embed);

  question.askQuestion(null);
  client.on("message", question.onReplies);
};