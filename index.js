const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 경고 데이터 로드
let warnings = {};
try {
  warnings = JSON.parse(fs.readFileSync("./warn.json", "utf8"));
} catch (error) {
  console.log("경고 파일이 없습니다. 새로 생성합니다.");
  fs.writeFileSync("./warn.json", "{}");
}

// 경고 저장 함수
function saveWarnings() {
  fs.writeFileSync("./warn.json", JSON.stringify(warnings, null, 2));
}

// 격리 역할 ID (실제 사용할 역할 ID로 변경 필요)
const ISOLATION_ROLE_ID = "1234567890123456789";

// 슬래시 커맨드 정의
const commands = [];
// 1꼬리 커맨드는 그대로 유지
commands.push(
  new SlashCommandBuilder()
    .setName("1꼬리")
    .setDescription("유저를 차단하는 꼬리입니다.")
    .addUserOption((option) =>
      option
        .setName("유저")
        .setDescription("차단할 유저를 선택하세요")
        .setRequired(true)
    )
    .toJSON()
);

// 2꼬리 타임아웃 커맨드 추가
commands.push(
  new SlashCommandBuilder()
    .setName("2꼬리")
    .setDescription("유저를 타임아웃하는 꼬리입니다.")
    .addUserOption((option) =>
      option
        .setName("유저")
        .setDescription("타임아웃할 유저를 선택하세요")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("시간")
        .setDescription("타임아웃 시간 (예: 30초, 5분, 2시간, 1일, 1주, 1년)")
        .setRequired(true)
    )
    .toJSON()
);

// 3꼬리 경고 커맨드 수정
commands.push(
  new SlashCommandBuilder()
    .setName("3꼬리")
    .setDescription("유저에게 경고를 부여하거나 경고 수를 확인하는 꼬리입니다.")
    .addUserOption((option) =>
      option
        .setName("유저")
        .setDescription("경고할 유저를 선택하세요")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("경고")
        .setDescription("부여할 경고 횟수를 입력하세요")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5)
    )
    .addStringOption((option) =>
      option
        .setName("사유")
        .setDescription("경고 사유를 입력하세요")
        .setRequired(false)
    )
    .toJSON()
);

// 4꼬리 격리 커맨드 추가
commands.push(
  new SlashCommandBuilder()
    .setName("4꼬리")
    .setDescription("유저를 격리하는 꼬리입니다.")
    .addUserOption((option) =>
      option
        .setName("유저")
        .setDescription("격리할 유저를 선택하세요")
        .setRequired(true)
    )
    .toJSON()
);

// 5~9꼬리 커맨드는 그대로 유지
for (let i = 5; i <= 9; i++) {
  commands.push(
    new SlashCommandBuilder()
      .setName(`${i}꼬리`)
      .setDescription(`${i}꼬리 커맨드입니다.`)
      .toJSON()
  );
}

// 시간 문자열을 밀리초로 변환하는 함수
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)(초|분|시간?|일|주|년)$/);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    초: 1000,
    분: 60 * 1000,
    시: 60 * 60 * 1000,
    시간: 60 * 60 * 1000,
    일: 24 * 60 * 60 * 1000,
    주: 7 * 24 * 60 * 60 * 1000,
    년: 365 * 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

// REST 인스턴스 생성
const rest = new REST({ version: "10" }).setToken(token);

// 봇이 준비되었을 때 실행
client.once("ready", () => {
  console.log(`${client.user.tag} 봇이 준비되었습니다!`);

  // 상태 메시지 설정
  client.user.setPresence({
    activities: [
      {
        name: "꼬리 아홉개로 서버 관리",
        type: 0, // 0은 'Playing' 상태
      },
    ],
    status: "online",
  });
});

// 슬래시 커맨드 등록
(async () => {
  try {
    console.log("슬래시 커맨드 등록 시작...");

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log("슬래시 커맨드 등록 완료!");
  } catch (error) {
    console.error(error);
  }
})();

// 슬래시 커맨드 처리
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "4꼬리") {
    // 권한 체크
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      return await interaction.reply({
        content: "이 명령어를 사용할 권한이 없습니다!",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("유저");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    try {
      // 격리 역할 추가
      await targetMember.roles.add(ISOLATION_ROLE_ID);
      await interaction.reply({
        content: `${targetUser.tag}님을 격리했습니다! 🦊`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "유저를 격리하는 도중 오류가 발생했습니���.",
        ephemeral: true,
      });
    }
  } else if (commandName === "1꼬리") {
    // 1꼬리 로직은 그대로 유지
    const targetUser = interaction.options.getUser("유저");
    await interaction.reply(`${targetUser.tag}님을 차단했습니다! 🦊`);
  } else if (commandName === "2꼬리") {
    // 권한 체크
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      return await interaction.reply({
        content: "이 명령어를 사용할 권한이 없습니다!",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("유저");
    const timeStr = interaction.options.getString("시간");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    const duration = parseTime(timeStr);
    if (!duration) {
      return await interaction.reply({
        content:
          "올바른 시간 형식이 아닙니다. (예: 30초, 5분, 2시간, 1일, 1주, 1년)",
        ephemeral: true,
      });
    }

    try {
      await targetMember.timeout(
        duration,
        `${interaction.user.tag}님이 2꼬리 명령어로 타임아웃함`
      );
      await interaction.reply({
        content: `${targetUser.tag}님을 ${timeStr}동안 타임아웃했습니다! 🦊`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "유저를 타임아웃하는 도중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  } else if (commandName === "3꼬리") {
    // 권한 체크
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      return await interaction.reply({
        content: "이 명령어를 사용할 권한이 없습니다!",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("유저");
    const warningCount = interaction.options.getInteger("경고") || 1;
    const reason = interaction.options.getString("사유");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    // 경고 수 조회
    const currentWarnings = warnings[targetUser.id]?.count || 0;

    // 사유가 없으면 경고 수만 조회
    if (!reason) {
      return await interaction.reply({
        content: `${targetUser.tag}님의 현재 경고 수: ${currentWarnings}회 🦊`,
        ephemeral: true,
      });
    }

    // 경고 추가
    if (!warnings[targetUser.id]) {
      warnings[targetUser.id] = {
        count: 0,
        history: [],
      };
    }

    warnings[targetUser.id].count += warningCount;
    warnings[targetUser.id].history.push({
      count: warningCount,
      reason: reason,
      warnedBy: interaction.user.tag,
      timestamp: new Date().toISOString(),
    });

    // 경고 저장
    saveWarnings();

    const newWarningCount = warnings[targetUser.id].count;
    let responseMessage = `${targetUser.tag}님에게 경고 ${warningCount}회를 부여했습니다! 🦊\n현재 경고 횟수: ${newWarningCount}회\n사유: ${reason}`;

    // 5회 이상 경고 시 자동 차단
    if (newWarningCount >= 5) {
      try {
        await targetMember.ban({
          reason: `경고 5회 누적으로 인한 자동 차단 (마지막 경고 사유: ${reason})`,
        });
        responseMessage += "\n\n⚠️ 경고 5회 누적으로 차단되었습니다!";
      } catch (error) {
        console.error("차단 실패:", error);
        responseMessage += "\n\n⚠️ 경고 5회 누적되었으나 차단에 실패했습니다.";
      }
    }

    await interaction.reply({
      content: responseMessage,
      ephemeral: true,
    });

    // DM으로 경고 알림
    try {
      let dmMessage = `${interaction.guild.name} 서버에서 경고 ${warningCount}회를 받았습니다.\n현재 경고 횟수: ${newWarningCount}회\n사유: ${reason}`;
      if (newWarningCount >= 5) {
        dmMessage += "\n\n⚠️ 경고 5회 ��적으로 차단되었습니다.";
      }
      await targetUser.send(dmMessage);
    } catch (error) {
      console.log("DM 전송 실패:", error);
    }
  } else if (commandName.endsWith("꼬리")) {
    const number = parseInt(commandName);
    await interaction.reply(`${number}꼬리 커맨드가 실행되었습니다! 🦊`);
  }
});

// 봇 로그인
client.login(token);
