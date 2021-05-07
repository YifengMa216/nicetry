const crypto = require("crypto");

module.exports = {
    md5: function (str) {
        str = str + "qweqwjeqwjelkqjwejql";
        let md5 = crypto.createHash("md5");
        return md5.update(str).digest("hex");
    },
    responseClient(
        res,
        httpCode = 500,
        code = 3,
        message = "服务端异常",
        data = {}
    ) {
        let responseData = {};
        responseData.code = code;
        responseData.message = message;
        responseData.data = data;
        res.status(httpCode).json(responseData);
    },
};
