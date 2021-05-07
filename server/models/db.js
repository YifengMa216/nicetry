const mongoose = require("mongoose");
const config = require("../config");

const dburl = `mongodb://${config.mongo_host}:${config.mongo_port}/butterfly`;
mongoose.Promise = require("bluebird");

class DBManager {
    init(cb) {
        mongoose.connect(
            dburl,
            { useNewUrlParser: true, useUnifiedTopology: true },
            function (err) {
                if (err) {
                    console.log(err, "数据库连接失败");
                    return;
                }

                console.log("数据库连接成功");

                cb();
            }
        );
    }

    register(schemaDefinition, schemaName, dbName) {
        const schema = mongoose.Schema(schemaDefinition);
        return mongoose.model(schemaName, schema, dbName);
    }
}

module.exports = new DBManager();
