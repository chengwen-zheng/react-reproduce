
import ReactFake from './ReactFake';

class HelloMessage extends ReactFake.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (<div>Hello{
            this.props.name
        } </div>);
    }
}
export default HelloMessage;