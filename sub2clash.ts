// sub2clash.ts — 订阅链接 → Clash Verge 配置（内联模式，YAML remap，优雅重启）
import { load, dump } from "js-yaml";
import { statSync } from "fs";

const ROOT = import.meta.dir;
const SUB_FILE = `${ROOT}/sub_links.txt`;
const DIRECT_FILE = `${ROOT}/my_direct.txt`;
const CLASH_DIR = `${process.env.APPDATA!.replace(/\\/g, "/")}/io.github.clash-verge-rev.clash-verge-rev`;
const PROFILES_DIR = `${CLASH_DIR}/profiles`;
const PROFILE_YAML = `${CLASH_DIR}/profiles.yaml`;
const PROF_UID = "sub2clash";
const SUB_API = "http://127.0.0.1:25500";

const C = { g: "\x1b[32m", c: "\x1b[36m", y: "\x1b[33m", r: "\x1b[31m", d: "\x1b[90m" } as const;
function log(msg: string, c: keyof typeof C = "c") { console.log(`${C[c]}${msg}\x1b[0m`); }
function die(msg: string): never { log(`[×] ${msg}`, "r"); process.exit(1); }
function exists(p: string) { try { statSync(p); return true; } catch { return false; } }

// ACL4SSR 组名 → 我们的 3 组映射
const GROUP_MAP: Record<string, string> = {
  "🎯 全球直连": "DIRECT", "🌏 国内媒体": "DIRECT", "📺 哔哩哔哩": "DIRECT",
  "Ⓜ️ 微软Bing": "DIRECT", "Ⓜ️ 微软云盘": "DIRECT", "Ⓜ️ 微软服务": "DIRECT",
  "🍎 苹果服务": "DIRECT", "🎮 游戏平台": "DIRECT", "🎶 网易音乐": "DIRECT",
  "📢 谷歌FCM": "DIRECT",
  "🛑 广告拦截": "REJECT", "🍃 应用净化": "REJECT", "🛑 全球拦截": "REJECT",
  "🚀 节点选择": "🔰 手动选择", "🔰 节点选择": "🔰 手动选择", "♻️ 自动选择": "♻️ 自动选择",
  "🐟 漏网之鱼": "🔰 手动选择", "📲 电报消息": "🔰 手动选择", "📲 电报信息": "🔰 手动选择",
  "💬 Ai平台": "🔰 手动选择", "📹 油管视频": "🔰 手动选择",
  "🎥 奈飞视频": "🔰 手动选择", "🎥 NETFLIX": "🔰 手动选择", "📺 巴哈姆特": "🔰 手动选择",
  "🌍 国外媒体": "🔰 手动选择", "🎥 奈飞节点": "🔰 手动选择",
};

async function main() {
  // 1. 读文件
  log("══════ 订阅链接 ══════", "c");
  if (!exists(SUB_FILE)) die("缺少 sub_links.txt");
  const links = (await Bun.file(SUB_FILE).text()).split("\n")
    .map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  if (links.length === 0) die("sub_links.txt 里没链接");
  log(`  ${links.length} 个`, "d");

  log("══════ 直连域名 ══════", "c");
  let domains: string[] = [];
  if (exists(DIRECT_FILE))
    domains = (await Bun.file(DIRECT_FILE).text()).split("\n")
      .map(l => l.trim()).filter(l => l && !l.startsWith("#") && !/\s/.test(l));
  log(`  ${domains.length} 个`, "d");

  // 2. subconverter
  log("══════ subconverter ══════", "c");
  try { await fetch(`${SUB_API}/version`, { signal: AbortSignal.timeout(3000) }); }
  catch {
    log("[!] 未运行，启动...", "y");
    let p = Bun.spawn(["docker", "start", "subconverter"]); await p.exited;
    if (p.exitCode !== 0) {
      p = Bun.spawn(["docker", "run", "-d", "--name", "subconverter", "--restart=always",
        "-p", "25500:25500", "tindy2013/subconverter:latest"]);
      await p.exited; if (p.exitCode !== 0) die("Docker 启动失败");
    }
    await Bun.sleep(3000);
  }
  log("[√] 就绪", "g");

  // 3. 拉取（内联模式，不用 provider: 前缀）
  log("══════ 拉取订阅 ══════", "c");
  const urlParam = links.join("|");
const RULES_FILE = `${ROOT}/rules.txt`;

// ...

  // 读规则选择
  let ruleConfig = "/base/config/ACL4SSR_Online_Mini.ini";
  if (exists(RULES_FILE)) {
    const r = (await Bun.file(RULES_FILE).text()).split("\n")[0].trim();
    if (r && !r.startsWith("#")) {
      ruleConfig = r.startsWith("/") || r.startsWith("http") ? r : `/base/config/${r}`;
    }
  }
  log(`  规则: ${ruleConfig.split("/").pop()}`, "d");

  // ...

  const subUrl = `${SUB_API}/sub?target=clash&url=${encodeURIComponent(urlParam)}&config=${ruleConfig}&insert=true`;

  let body = "";
  for (let retry = 0; retry < 3; retry++) {
    try {
      const r = await fetch(subUrl, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { body = await r.text(); break; }
      log(`  retry ${retry + 1}/3 (HTTP ${r.status})`, "y");
    } catch { log(`  retry ${retry + 1}/3`, "y"); }
    await Bun.sleep(2000);
  }
  if (!body) die("subconverter 3次重试均失败");
  if (!body.includes("proxies:")) die("返回无效");
  log(`[√] ${body.split("\n").length} 行`, "g");

  // 4. YAML 解析 + 重构
  log("══════ 重构配置 ══════", "c");
  const config = load(body) as any;

  // 替换 proxy-groups 为 3 组
  const proxyNames = (config.proxies || []).map((p: any) => p.name);
  config["proxy-groups"] = [
    { name: "🔰 手动选择", type: "select", proxies: ["♻️ 自动选择", "DIRECT", ...proxyNames] },
    { name: "♻️ 自动选择", type: "url-test", proxies: proxyNames,
      url: "http://www.gstatic.com/generate_204", interval: 300 },
    { name: "🛑 广告拦截", type: "select", proxies: ["REJECT", "DIRECT"] },
  ];

  // remap rules 组名（检查每个字段，不只是最后一个）
  // 先收集所有 proxy-groups 名
  const validGroups = new Set(["DIRECT", "REJECT", "🔰 手动选择", "♻️ 自动选择", "🛑 广告拦截"]);
  let ruleCount = 0;
  config.rules = (config.rules || []).map((rule: string) => {
    const parts = rule.split(",");
    for (let i = 0; i < parts.length; i++) {
      const field = parts[i].trim();
      if (GROUP_MAP[field]) {
        parts[i] = GROUP_MAP[field];
        ruleCount++;
        break;
      }
      // 未知组名（含中文/emoji）→ 默认走代理
      if (field.length > 1 && /[\u4e00-\u9fff\u{1F300}-\u{1F9FF}]/u.test(field) && !validGroups.has(field)) {
        parts[i] = "🔰 手动选择";
        ruleCount++;
        break;
      }
    }
    return parts.join(",");
  });

  // 插入自定义直连域名
  for (const d of domains) {
    config.rules.unshift(`DOMAIN-SUFFIX,${d},DIRECT`);
    config.rules.unshift(`DOMAIN,${d},DIRECT`);
  }

  // 清理端口
  delete config.port;
  delete config["socks-port"];
  delete config["external-controller"];
  config["mixed-port"] = 7897;
  config.mode = "rule";

  const finalYaml = dump(config, { lineWidth: -1, noRefs: true });
  log(`[√] ${proxyNames.length} 节点 | ${config.rules.length} 规则 | remap ${ruleCount} 条`, "g");

  // 5. 写入文件
  log("══════ 写入配置 ══════", "c");
  if (!exists(CLASH_DIR)) die("没装 Clash Verge");

  let uid = PROF_UID;
  let pyText = "";
  if (exists(PROFILE_YAML)) {
    pyText = await Bun.file(PROFILE_YAML).text();
    const m = pyText.match(/current:\s*(\S+)/);
    if (m && m[1] !== "null") uid = m[1];
  }

  const pf = `${PROFILES_DIR}/${uid}.yaml`;
  if (exists(pf)) await Bun.write(`${pf}.bak`, Bun.file(pf));
  await Bun.write(pf, `# Clash Verge | sub2clash\n\n${finalYaml}`);
  await Bun.write(`${CLASH_DIR}/clash-verge.yaml`, Bun.file(pf));
  log(`[√] ${pf}`, "g");

  // 更新 profiles.yaml
  if (pyText) {
    const data = load(pyText) as any;
    const ts = Math.floor(Date.now() / 1000);
    let items: any[] = data.items || [];
    let found = false;
    for (const item of items) {
      if (item.uid === uid) {
        found = true;
        item.option = item.option || {};
        for (const k of ["merge", "script", "rules", "proxies", "groups"]) delete item.option[k];
        item.option.update_interval = 1440;
        item.option.allow_auto_update = true;
        item.updated = ts;
        break;
      }
    }
    if (!found) {
      data.current = uid;
      items.push({ uid, type: "local", name: "sub2clash", file: `${uid}.yaml`, desc: "", updated: ts,
        option: { update_interval: 1440, allow_auto_update: true } });
    }
    data.items = items;
    await Bun.write(PROFILE_YAML, dump(data, { lineWidth: -1, noRefs: true }));
    log(`[√] profiles.yaml`, "g");
  }

  // 6. 热重载（通过命名管道）
  log("══════ 触发热重载 ══════", "c");
  try {
    const ps = Bun.spawn(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
      "-File", `${ROOT}/mihomo-reload.ps1`]);
    const out = await Promise.race([
      new Response(ps.stdout).text(),
      new Promise<string>(r => setTimeout(() => r("TIMEOUT"), 10000))
    ]);
    await ps.exited;
    if (out.includes("OK")) log("[√] 热重载成功", "g");
    else log(`[!] ${out.trim().slice(0, 80)}`, "y");
  } catch {
    log("[!] 热重载失败，请在 Clash Verge 配置页点 🔄 更新", "y");
  }

  log("════════════════════════════════════════", "g");
  log(`  完成! ${links.length}订阅 | ${proxyNames.length}节点 | ${config.rules.length}规则`, "c");
  log("════════════════════════════════════════", "g");
}

main();
