const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// 中间件
app.use(bodyParser.json());
app.use(cors());

// 假设的数据库操作（实际应用中连接到真实数据库）
const users = []; // 用于模拟数据库中用户数据的数组
const siteActivity = { visits: [], homeVisits: 0 }; // 用于模拟访问记录的数组

// 配置信息
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "adminpassword"; // 真实应用中，请勿硬编码密码

// 检查管理员账户是否存在，不存在则创建 (首次运行时)
if (!users.find(u => u.username === ADMIN_USERNAME)) {
    users.push({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        securityQuestion: "Admin's secret?",
        securityAnswer: "secret",
        registrationTime: new Date().toISOString(),
        balance: 0,
        isAdmin: true,
        isDisabled: false
    });
}

// API路由

// 检查登录状态
app.get('/api/check-login', (req, res) => {
    const loggedUser = req.headers.authorization;
    const user = users.find(u => u.username === loggedUser);
    if (user) {
        res.json({
            loggedIn: true,
            isAdmin: user.isAdmin
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

// 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "请输入用户名和密码。" });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ success: true, isAdmin: true });
        return;
    }

    const user = users.find(u => u.username === username && u.password === password && !u.isDisabled);
    if (user) {
        res.json({ success: true, isAdmin: user.isAdmin });
    } else {
        res.json({ success: false, message: "用户名或密码错误，或账户已被禁用。" });
    }
});

// 注册
app.post('/api/register', (req, res) => {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    if (!username || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ success: false, message: "所有字段均为必填项。" });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ success: false, message: "用户名已存在。" });
    }

    if (username === ADMIN_USERNAME) {
        return res.status(400).json({ success: false, message: "不能使用此用户名进行注册。" });
    }

    users.push({
        username,
        password,
        securityQuestion,
        securityAnswer,
        registrationTime: new Date().toISOString(),
        balance: 0,
        isDisabled: false,
        isAdmin: false
    });

    return res.json({ success: true });
});

// 查找用户（用于忘记密码）
app.get('/api/find-user', (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ success: false, message: "请输入用户名。" });
    }

    const user = users.find(u => u.username === username);
    if (user) {
        res.json({ success: true, user: { username: user.username, securityQuestion: user.securityQuestion } });
    } else {
        res.json({ success: false, message: "未找到该用户。" });
    }
});

// 重置密码
app.post('/api/reset-password', (req, res) => {
    const { username, securityAnswer, newPassword } = req.body;
    if (!username || !securityAnswer || !newPassword) {
        return res.status(400).json({ success: false, message: "所有字段均为必填项。" });
    }

    const user = users.find(u => u.username === username);
    if (user) {
        if (user.securityAnswer.toLowerCase() === securityAnswer.toLowerCase()) {
            // 更新密码
            user.password = newPassword;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "密保答案错误。" });
        }
    } else {
        res.json({ success: false, message: "未找到该用户。" });
    }
});

// 退出登录
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

// 获取用户主页信息
app.get('/api/user-profile', (req, res) => {
    const username = req.headers.authorization;
    const user = users.find(u => u.username === username && !u.isAdmin && !u.isDisabled);
    if (user) {
        res.json({ success: true, user: { username: user.username, registrationTime: user.registrationTime, balance: user.balance } });
    } else {
        res.json({ success: false, message: "无法加载用户信息。" });
    }
});

// 获取管理员仪表盘信息
app.get('/api/admin-dashboard', (req, res) => {
    const username = req.headers.authorization;
    if (username !== ADMIN_USERNAME) {
        return res.json({ success: false, message: "无权访问管理员页面。" });
    }

    const userStats = users.filter(u => u.username !== ADMIN_USERNAME);
    const totalUsers = userStats.length;
    const totalBalance = userStats.reduce((sum, user) => sum + (user.balance || 0), 0);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentVisitsCount = siteActivity.visits.filter(visitTime => new Date(visitTime) >= threeDaysAgo).length;

    res.json({
        success: true,
        stats: { 
            totalUsers, 
            totalBalance, 
            recentVisits: recentVisitsCount,
            totalHomeVisits: siteActivity.homeVisits // 返回主页总访问次数
        },
        users: userStats.map(u => ({
            username: u.username,
            balance: u.balance,
            registrationTime: u.registrationTime,
            isDisabled: u.isDisabled
        }))
    });
});

// 禁用/启用用户
app.post('/api/toggle-user-status', (req, res) => {
    const { username } = req.query;
    if (username === ADMIN_USERNAME) {
        return res.json({ success: false, message: "不能禁用管理员账户。" });
    }

    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex > -1) {
        users[userIndex].isDisabled = !users[userIndex].isDisabled;
        res.json({
            success: true,
            isDisabled: users[userIndex].isDisabled
        });
    } else {
        res.json({ success: false, message: "未找到该用户。" });
    }
});

// 修改用户余额
app.post('/api/edit-balance', (req, res) => {
    const { username, balance } = req.body;
    if (username === ADMIN_USERNAME) {
        return res.json({ success: false, message: "不能修改管理员账户余额。" });
    }

    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex > -1) {
        users[userIndex].balance = parseFloat(balance);
        res.json({
            success: true,
            balance: users[userIndex].balance
        });
    } else {
        res.json({ success: false, message: "未找到该用户。" });
    }
});

// 记录访问
app.get('/api/record-visit', (req, res) => {
    siteActivity.visits.push(new Date().toISOString());
    res.json({ success: true });
});

// 记录主页访问
app.get('/api/record-home-visit', (req, res) => {
    siteActivity.homeVisits += 1;
    res.json({ success: true });
});

// 静态文件服务
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// 捕获404错误并返回主页
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});