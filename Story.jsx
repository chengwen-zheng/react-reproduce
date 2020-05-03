import ReactFake from './ReactFake';

class Story extends ReactFake.Component {
    constructor(props) {
      super(props);
      this.state = { likes: Math.ceil(Math.random() * 100) };
    }
    like() {
      this.setState({
        likes: this.state.likes + 1
      });
    }
    render() {
      const { name, url } = this.props;
      const { likes } = this.state;
      const likesElement = <span />;
      return (
        <li>
          <button onClick={e => this.like()}>
            {likes}
            <b>❤️</b>
          </button>
          <a href={url}>{name}</a>
        </li>
      );
    }
  }
  
  export default Story;