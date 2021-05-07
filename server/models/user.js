const dbmanager = require("./db.js");

module.exports = dbmanager.register(
    {
        username: String,
        password: String,
        // 管理员
        // 普通用户
        type: String,
    },
    "User",
    "users"
);
