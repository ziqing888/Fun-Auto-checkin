(async () => {
    // 导入所需模块
    const fetch = (await import('node-fetch')).default;  // 导入 node-fetch 模块，用于发送 HTTP 请求
    const chalk = (await import('chalk')).default;  // 导入 chalk 模块，用于输出彩色文字
    const fs = require('fs').promises;  // 导入 fs 模块的 promise 版本，用于文件操作

    // 请求头模板
    const headersTemplate = {
        'Accept': 'application/json, text/plain, */*',  // 接受的响应类型
        'Content-Type': 'application/json',  // 请求体的内容类型
        'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"  // 用户代理
    };

    // coday 函数，用于发送 HTTP 请求
    async function coday(url, method, payloadData = null, headers = headersTemplate) {
        try {
            const options = {
                method,  // 请求方法
                headers,  // 请求头
                body: payloadData ? JSON.stringify(payloadData) : null  // 如果有请求体数据，转换为 JSON 格式
            };
            const response = await fetch(url, options);  // 发送请求并等待响应
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);  // 如果响应状态不成功，抛出错误
            return await response.json();  // 返回 JSON 格式的响应数据
        } catch (error) {
            console.error('错误:', error);  // 捕获并输出错误
        }
    }

    // 加载账户会话数据
    async function loadSessions() {
        try {
            const data = await fs.readFile('accounts.json', 'utf8');  // 读取 accounts.json 文件
            return JSON.parse(data);  // 解析文件内容为 JSON 格式
        } catch (error) {
            console.error("加载账户时出错:", error);  // 输出错误信息
            return [];  // 如果出错，返回空数组
        }
    }

    // 登录并进行每日签到
    async function loginAndCheckIn(email, password) {
        console.log(`\n尝试登录，邮箱: ${email}`);
        const signInPayload = { email, password };  // 登录请求的负载数据
        const signIn = await coday("https://api.securitylabs.xyz/v1/auth/signin-user", 'POST', signInPayload);
        
        if (signIn && signIn.accessToken) {  // 如果登录成功并且有 accessToken
            const headers = { ...headersTemplate, 'Authorization': `Bearer ${signIn.accessToken}` };  // 添加授权头
            console.log(chalk.green('登录成功！获取用户详细信息...'));

            const user = await coday("https://api.securitylabs.xyz/v1/users", 'GET', null, headers);  // 获取用户信息
            const { id, dipTokenBalance } = user || {};
            if (id) {
                console.log(`用户 ID: ${id} | 当前积分: ${dipTokenBalance}`);

                console.log("尝试每日签到...");
                const checkin = await coday(`https://api.securitylabs.xyz/v1/users/earn/${id}`, 'GET', null, headers);  // 进行每日签到
                if (checkin && checkin.tokensToAward) {
                    console.log(chalk.green(`签到成功！奖励积分: ${checkin.tokensToAward}`));
                } else {
                    console.log(chalk.yellow('签到暂不可用。'));
                }
            }
        } else {
            console.error(chalk.red(`登录失败，邮箱: ${email}`));
        }
    }

    // 主函数
    async function main() {
        const sessions = await loadSessions();  // 加载账户会话数据
        if (sessions.length === 0) {
            console.log("未找到账户信息。");
            return;
        }

        while (true) {
            console.log("\n开始为所有账户进行每日签到...");

            for (const session of sessions) {
                const { email, password } = session;
                if (email && password) await loginAndCheckIn(email, password);  // 尝试登录并签到
            }

            console.log("所有账户已处理。等待 24 小时后进行下一次签到...");
            await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));  // 等待 24 小时
        }
    }

    main();  // 运行主函数
})();
