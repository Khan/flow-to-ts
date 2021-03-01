import * as React from "react";
import * as ReactDOM from "react-dom";

import App from "./app";

const container = document.querySelector("#container");

ReactDOM.render(<App />, container);

if (module.hot) {
  module.hot.dispose(function () {
    // module is about to be replaced
  });

  module.hot.accept();
}
