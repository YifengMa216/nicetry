import { TEST_ACTION } from '../constant'

const initState = 0
export default function testReducer(preState = initState, action) {
    const { type, data } = action

    switch (type) {
        case TEST_ACTION:
            {
                return preState + data
            }
        default:
            {
                return preState
            }
    }
}