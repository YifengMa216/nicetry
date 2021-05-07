const Express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const config = require("./config");
const dbmanager = require("./models/db");

const port = config.port;
const app = new Express();

// app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("butterfly"));
app.use(
    session({
        name: "butterfly",
        secret: "butterfly",
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 60 * 1000 * 60 },
    })
);

// app.all("*", function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "http://localhost:3030"); //前端域名
//     res.header("Access-Control-Allow-Credentials", "true");
//     res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
//     next();
// });

app.use("*", (req, res, next) => {
    // res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header('Access-Control-Allow-Credentials','true');
    next();
});

app.use("/", require("./routes/api"));
app.use("/admin", require("./routes/admin"));

dbmanager.init(() => {
    app.listen(port, function (err) {
        if (err) {
            console.error("err: ", err);
        } else {
            console.info(
                `api server is running at ${config.host}:${config.port}`
            );
        }
    });
});
