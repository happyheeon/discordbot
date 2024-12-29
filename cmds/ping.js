
module.exports = {
  name: "ping",
  description: "봇의 응답 속도를 측정합니다.",
  async execute(message, args, isSlash) {
    if (isSlash) {
      // 슬래시 커맨드
      const sent = await message.reply({ content: "Pong!", fetchReply: true });
      message.editReply(
        `Pong! (지연 시간: ${
          sent.createdTimestamp - message.createdTimestamp
        }ms)`
      );
    } else {
      // 프리픽스 커맨드
      const sent = await message.channel.send("Pong!");
      sent.edit(
        `Pong! (지연 시간: ${
          sent.createdTimestamp - message.createdTimestamp
        }ms)`
      );
    }
  },
};
