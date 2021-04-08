function inject(options: {
  api_version: string;
}) {
  return target => target;
}

@inject({
  api_version: "0.3.4"
})
class MyComponent extends React.Component<Props> {
  render() {
    return document.createElement("div");
  }

}
