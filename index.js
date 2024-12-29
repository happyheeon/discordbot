// discord.js 불러오기
const { Client, Events, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Railway 환경변수 사용
const token = process.env.TOKEN;
const prefix = process.env.PREFIX;

// client 라는 객체 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 명령어 컬렉션 생성
client.commands = new Collection();

// 명령어 파일들 로드
const commandsPath = path.join(__dirname, "cmds");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.name, command);
}

// 서버 시작할때 한 번 실행
client.once(Events.ClientReady, (readyClient) => {
  console.log(`${readyClient.user.tag}로 로그인했습니다.`);
});

// 슬래시 커맨드 처리
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, [], true);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "명령어 실행 중 오류가 발생했습니다!",
      ephemeral: true,
    });
  }
});

// 프리픽스 커맨드 처리
client.on(Events.MessageCreate, async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, false);
  } catch (error) {
    console.error(error);
    message.reply("명령어 실행 중 오류가 발생했습니다!");
  }
});

// token으로 로그인
client.login(token);
