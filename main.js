(async () => {
    const fetch = (await import('node-fetch')).default;
    const chalk = (await import('chalk')).default;

    const headersTemplate = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
    };

  
    const log = (message, color = chalk.white) => {
        const timestamp = new Date().toISOString();
        console.log(color(`[${timestamp}] ${message}`));
    };

    async function coday(url, method, payloadData = null, headers = headersTemplate) {
        try {
            const options = {
                method,
                headers,
                body: payloadData ? JSON.stringify(payloadData) : null
            };
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            log(`请求出错：${error}`, chalk.red);
        }
    }

    async function loadSessions() {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile('accounts.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            log("加载账户时出错：" + error, chalk.red);
            return [];
        }
    }

    async function loginAndCheckIn(email, password) {
        log(`\n=== 开始处理账户: ${email} ===`, chalk.yellow.bold);

        const signInPayload = { email, password };
        const signIn = await coday("https://node.securitylabs.xyz/api/v1/auth/signin-user", 'POST', signInPayload);

        if (signIn && signIn.accessToken) {
            const headers = { ...headersTemplate, 'Authorization': `Bearer ${signIn.accessToken}` };
            log("登录成功！获取用户详细信息...", chalk.green);

            const user = await coday("https://node.securitylabs.xyz/api/v1/users", 'GET', null, headers);
            const { id, dipTokenBalance } = user || {};
            if (id) {
                log(`用户 ID: ${id} | 当前积分: ${dipTokenBalance}`, chalk.cyan);

                log("尝试每日签到...", chalk.white);
                const checkin = await coday(`https://node.securitylabs.xyz/api/v1/users/earn/${id}`, 'GET', null, headers);

                if (checkin && checkin.tokensToAward) {
                    log(`签到成功！奖励积分: ${checkin.tokensToAward}`, chalk.green);
                } else {
                    log("签到暂不可用。", chalk.yellow);
                }
            }
        } else {
            log(`登录失败，邮箱: ${email}`, chalk.red);
        }
        log(`=== 完成处理账户: ${email} ===\n`, chalk.yellow.bold);
    }

    async function main() {
        const sessions = await loadSessions();
        if (sessions.length === 0) {
            log("未找到账户信息。", chalk.red);
            return;
        }

        while (true) {
            log("\n开始为所有账户进行每日签到...", chalk.blue.bold);

            for (const session of sessions) {
                const { email, password } = session;
                if (email && password) await loginAndCheckIn(email, password);
            }

            log("所有账户已处理。等待 24 小时后进行下一次签到...\n", chalk.blue.bold);
            await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
        }
    }

    main();
})();
