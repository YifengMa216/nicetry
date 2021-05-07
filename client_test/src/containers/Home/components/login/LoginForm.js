import React, { Component } from "react";
import { Input, Form, Button } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import style from "./style.module.css";

const FormItem = Form.Item;

class LoginFormCom extends Component {
    onFinish = (values) => {
        console.log("Success:", values);

        this.props.login(values);
    };

    onFinishFailed = (errorInfo) => {
        console.log("Failed:", errorInfo);
    };

    handleLogin = (e) => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            if (!err) {
                this.props.login(values.userName, values.password);
            }
        });
    };

    render() {
        console.log(this.props);
        // const { getFieldDecorator } = this.props.form;
        return (
            <Form
                onFinish={this.onFinish}
                onFinishFailed={this.onFinishFailed}
                className={style.formStyle}
                // onSubmit={this.handleLogin}
            >
                {/* <FormItem>
                    {getFieldDecorator("userName", {
                        rules: [{ required: true, message: "请输入用户名!" }],
                    })(
                        <Input
                            prefix={<MailOutlined />}
                            placeholder="Username"
                        />
                    )}
                </FormItem>
                <FormItem>
                    {getFieldDecorator("password", {
                        rules: [{ required: true, message: "请输入密码!" }],
                    })(
                        <Input
                            prefix={<MailOutlined />}
                            type="password"
                            placeholder="Password"
                        />
                    )}
                </FormItem> */}
                <FormItem
                    name="username"
                    rules={[{ required: true, message: "请输入用户名!" }]}
                >
                    <Input
                        prefix={<UserOutlined style={{ fontSize: 18 }} />}
                        placeholder="Username"
                    />
                </FormItem>
                <FormItem
                    name="password"
                    rules={[{ required: true, message: "请输入密码!" }]}
                >
                    <Input
                        prefix={<LockOutlined style={{ fontSize: 18 }} />}
                        type="password"
                        placeholder="Password"
                    />
                </FormItem>
                <FormItem>
                    <Button
                        className={style.loginButton}
                        type="primary"
                        htmlType="submit"
                    >
                        登录
                    </Button>
                </FormItem>
            </Form>
        );
    }
}

const LoginForm = (Form.useForm = LoginFormCom);

export default LoginForm;
