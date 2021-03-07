const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const ethers = require("ethers");
const axios = require("axios");
const xml2js = require("xml2js");
const cliProgress = require("cli-progress");

const createAccount = async (num = 10) => {
  return Promise.all(
    new Array(num).fill(1).map(v => {
      const account = ethers.Wallet.createRandom();
      return account;
    })
  );
};

const localTime = () => {
  return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
};

const dirResolve = dir => {
  return path.resolve(__dirname, dir);
};

const api = axios.create({});

const invite = async (follow, dre) => {
  const url = `http://okgs.cc/index/Index/save?${Math.random()}`;

  const params = new URLSearchParams();
  params.append("address", follow);
  params.append("dre", dre);

  const headers = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Length": "59",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: "click_cookie=value",
    Host: "okgs.cc",
    Origin: "http://okgs.cc",
    Pragma: "no-cache",
    Referer: dre ? `http://okgs.cc/?dre=${dre}` : "http://okgs.cc",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
  };

  const res = await api.post(url, params, {
    headers
  });

  return res.data;
};

const extract = async address => {
  const url = `http://okgs.cc/index/index/tb?${Math.random()}`;

  const params = new URLSearchParams();
  params.append("address", address);
  params.append("value", address);

  const headers = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Length": "99",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: `click_cookie=value; user_address=${address}`,
    Host: "okgs.cc",
    Origin: "http://okgs.cc",
    Pragma: "no-cache",
    Referer: "http://okgs.cc",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
  };

  const res = await api.post(url, params, {
    headers
  });

  return res.data;
};

const loadInfo = async address => {
  const url = "http://okgs.cc/";

  const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,es;q=0.7",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    Cookie: `click_cookie=value; user_address=${address}`,
    Host: "okgs.cc",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36"
  };

  const res = await api.get(url, {
    headers
  });

  return res.data;
};

const parseInfo = async address => {
  const res = await loadInfo(address);

  const reg1 = /Balance : (\d*)/i;
  const reg2 = /Has invited: (\d*)/i;
  const reg3 = /Invite rewards: (\d*)/i;
  const reg4 = /'\/\?dre=([0-9a-zA-Z]*)';/i;

  const reg5 = /<div class="s3">(.*?)<\/div>/is;

  let reg1Res = res.match(reg1);
  reg1Res = reg1Res ? reg1Res[1] : null;

  let reg2Res = res.match(reg2);
  reg2Res = reg2Res ? reg2Res[1] : null;

  let reg3Res = res.match(reg3);
  reg3Res = reg3Res ? reg3Res[1] : null;

  let reg4Res = res.match(reg4);
  reg4Res = reg4Res ? reg4Res[1] : null;

  let reg5Res = res.match(reg5);
  reg5Res = reg5Res ? reg5Res[1] : null;

  if (reg5Res) {
    reg5Res = await xml2js.parseStringPromise(reg5Res);
    reg5Res = reg5Res.table.tr.slice(1);
    reg5Res = reg5Res.map(v => {
      return {
        date: v.td[0]._,
        address: v.td[1]._,
        amount: v.td[2]._,
        status: v.td[3]._
      };
    });
  }

  return {
    balance: reg1Res,
    invited: reg2Res,
    rewards: reg3Res,
    dre: reg4Res,
    extract: reg5Res
  };
};

const main = async (num = 30) => {
  console.log("1：生成主号");
  let master = await createAccount(1);
  master = master[0];

  const masterRes = await invite(master.address);
  console.log("主号地址：", master.address);
  console.log("主号邀请码：", masterRes.data.dre);

  console.log("2：生成从号并邀请");

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(num, 0);

  let counter = 0;

  const follow = await createAccount(num);
  const followRes = await Promise.all(
    follow.map(async (v, k) => {
      const tmp = await invite(v.address, masterRes.data.dre);

      counter++;
      bar.update(counter);

      return {
        address: v.address,
        private: v.privateKey,
        respons: tmp
      };
    })
  );

  bar.stop();

  const cnt = {
    address: master.address,
    private: master.privateKey,
    respons: masterRes,
    follows: followRes
  };

  const file = dirResolve(`data/${master.address}.json`);
  const content = JSON.stringify(cnt, null, 2);
  await fs.writeFile(file, content);

  return cnt;
};

(async () => {
  // 1：生成一个主号领空投，并获取邀请码
  // 2: 生成30个从号，分别用上面的邀请码去空投
  // 3：记录结果到 data/{address}.json 文件里
  const res = await main();

  // 提交主号提现申请
  await extract(res.address);

  // 获取主号的信息
  const info = await parseInfo(res.address);

  console.log("主号：", res.address);
  console.log("结果：", info);
})();
