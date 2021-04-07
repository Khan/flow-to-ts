import { autoBindMethodsForReact } from "class-autobind-decorator";

@autoBindMethodsForReact(AUTOBIND_CFG)
class PasswordEditor extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showPassword: false
    };
  }

}
