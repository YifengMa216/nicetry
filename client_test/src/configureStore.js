import { createStore, applyMiddleware, compose } from "redux";
import rootReducer from "./reducers";
import createSagaMiddleware from "redux-saga";
import rootSaga from "./sagas";

const sagaMiddleware = createSagaMiddleware();
const middlewares = [];

let storeEnhancers;
if (process.env.NODE_ENV === "production") {
    storeEnhancers = compose(applyMiddleware(...middlewares, sagaMiddleware));
} else {
    storeEnhancers = compose(
        applyMiddleware(...middlewares, sagaMiddleware),
        window && window.devToolsExtension
            ? window.devToolsExtension()
            : (f) => f
    );
}

export default function configureStore(initialState = {}) {
    const store = createStore(rootReducer, initialState, storeEnhancers);
    sagaMiddleware.run(rootSaga);
    return store;
}
