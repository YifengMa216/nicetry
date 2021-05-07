import React from "react";
import App from "./containers";
import { render } from "react-dom";
import { Provider } from "react-redux";
import configureStore from "./configureStore";
import "antd/dist/antd.css";

let div = document.createElement("div");
div.setAttribute("id", "app");
document.body.appendChild(div);

const store = configureStore();

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("app")
);
