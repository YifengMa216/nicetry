import React, { Component } from "react";
import { Input, Form, Button } from "antd";
import style from "./style.module.css";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

const FormItem = Form.Item;
class RegisterFormCom extends Component {
    onFinish = (values) => {
        console.log("Success:", values);

        this.props.register(values);
    };

    onFinishFailed = (errorInfo) => {
        console.log("Failed:", errorInfo);
    };

    handleRegister = (e) => {
        console.log("点击注册");
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            if (err) {
                console.log(err);
            }

            if (!err) {
                this.props.register(values);
            }
        });
    };

    render() {
        // const { getFieldDecorator } = this.props.form;
        return (
            <Form
                onFinish={this.onFinish}
                onFinishFailed={this.onFinishFailed}
                className={style.formStyle}
            >
                {/* <FormItem>
                    {getFieldDecorator("userName", {
                        rules: [{ required: true, message: "请输入用户名!" }],
                    })(
                        <Input
                            prefix={<AppstoreOutlined />}
                            placeholder="Username"
                        />
                    )}
                </FormItem>
                <FormItem>
                    {getFieldDecorator("password", {
                        rules: [{ required: true, message: "请输入密码!" }],
                    })(
                        <Input
                            prefix={<AppstoreOutlined />}
                            type="password"
                            placeholder="Password"
                        />
                    )}
                </FormItem>
                <FormItem>
                    {getFieldDecorator("passwordRe", {
                        rules: [{ required: true, message: "请输入密码!" }],
                    })(
                        <Input
                            prefix={<AppstoreOutlined />}
                            type="password"
                            placeholder="Repeat password"
                        />
                    )}
                </FormItem> */}
                <FormItem
                    name="userName"
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
                <FormItem
                    name="passwordRe"
                    rules={[{ required: true, message: "请输入密码!" }]}
                >
                    <Input
                        prefix={<LockOutlined style={{ fontSize: 18 }} />}
                        type="password"
                        placeholder="Repeat password"
                    />
                </FormItem>
                <FormItem>
                    <Button
                        className={style.loginButton}
                        type="primary"
                        htmlType="submit"
                    >
                        注册
                    </Button>
                </FormItem>
            </Form>
        );
    }
}

const RegisterForm = (Form.useForm = RegisterFormCom);

export default RegisterForm;
