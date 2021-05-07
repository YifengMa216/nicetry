const Express = require("express");
const router = Express.Router();
const User = require("../../models/user");
const { responseClient, md5 } = require("../../util/tools");

router.post("/login", (req, res) => {
    let { username, password } = req.body;

    console.log(username, password, md5(password));
    console.log("login");

    if (!username) {
        console.log("用户名不可为空");

        responseClient(res, 400, 2, "用户名不可为空");
        return;
    }

    if (!password) {
        console.log("密码不可为空");

        responseClient(res, 400, 2, "密码不可为空");
        return;
    }

    User.findOne({
        username,
        password: md5(password),
    })
        .then((userInfo) => {
            if (userInfo) {
                let data = {};

                console.log(req.session);

                data.username = userInfo.username;
                data.userType = userInfo.type;
                data.userId = userInfo._id;
                req.session.userInfo = data;
                req.session.test = 1;

                console.log("登录成功");
                console.log(data);

                console.log(req.session);
                console.log(req.session.userInfo);

                responseClient(res, 200, 0, "登录成功", data);

                return;
            }

            console.log("用户名密码错误");

            responseClient(res, 400, 1, "用户名密码错误");
        })
        .catch((err) => {
            responseClient(res);
        });
});

router.post("/register", (req, res) => {
    // console.log(req);
    let { userName, password, passwordRe } = req.body;

    console.log(req.body);
    console.log(userName, password, passwordRe);
    console.log("用户注册请求");

    if (!userName) {
        console.log("用户名不可为空");

        responseClient(res, 400, 2, "用户名不可为空");
        return;
    }

    if (!password) {
        console.log("密码不可为空");

        responseClient(res, 400, 2, "密码不可为空");
        return;
    }

    if (password !== passwordRe) {
        console.log("两次密码不一致");

        responseClient(res, 400, 2, "两次密码不一致");
        return;
    }

    User.findOne({ username: userName })
        .then((data) => {
            if (data) {
                console.log("用户名已存在");

                responseClient(res, 200, 1, "用户名已存在");

                return;
            }

            let newUser = new User({
                username: userName,
                password: md5(password),
                type: "user",
            });

            newUser.save().then(function () {
                User.findOne({ username: userName }).then((userInfo) => {
                    let data = {};
                    data.username = userInfo.username;
                    data.userType = userInfo.type;
                    data.userId = userInfo._id;

                    console.log("注册成功:" + md5(password));

                    responseClient(res, 200, 0, "注册成功", data);

                    return;
                });
            });
        })
        .catch((err) => {
            console.log(err);
            responseClient(res);
            return;
        });
});

router.get("/userInfo", function (req, res) {
    console.log("userInfo");

    // console.log(req.session);
    // console.log(req.session.userInfo);
    // console.log(req.session.test);

    if (req.session.userInfo) {
        responseClient(res, 200, 0, "自动登录成功", req.session.userInfo);
    } else {
        responseClient(res, 200, 1, "请重新登录", req.session.userInfo);
    }
});

router.get("/logout", function (req, res) {
    console.log("logout-----------");

    req.session.destroy();
    res.redirect("/");
});

module.exports = router;
