const diff = require("jest-diff");

expect.extend({
  toMatchErrors(received, expected) {
    received = received.map((diagnostic) => {
      return {
        start: diagnostic.start,
        length: diagnostic.length,
        code: diagnostic.code,
        messageText: diagnostic.messageText,
      };
    });
    const pass = JSON.stringify(received) === JSON.stringify(expected);

    const options = {
      isNot: this.isNot,
      promise: this.promise,
    };

    const message = pass
      ? () =>
          this.utils.matcherHint(
            "toMatchErrors",
            undefined,
            undefined,
            options
          ) +
          "\n\n" +
          `Expected: ${this.utils.printExpected(expected)}\n` +
          `Received: ${this.utils.printReceived(received)}`
      : () => {
          const difference = diff(expected, received, {
            expand: this.expand,
          });
          return (
            this.utils.matcherHint("toEqual", undefined, undefined, options) +
            "\n\n" +
            (difference && difference.includes("- Expect")
              ? `Difference:\n\n${difference}`
              : `Expected: ${this.utils.printExpected(expected)}\n` +
                `Received: ${this.utils.printReceived(received)}`)
          );
        };

    return { actual: received, message, pass };
  },
});
