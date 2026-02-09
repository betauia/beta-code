import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";

export function mountCppEditor(parent: HTMLElement, initialDoc = "") {
  const state = EditorState.create({
    doc: initialDoc || `#include <iostream>

int main() {
  std::cout << "Hello, C++!" << std::endl;
  return 0;
}
`,
    extensions: [
      basicSetup,
      cpp(),
      oneDark,
      EditorView.lineWrapping,
    ],
  });

  const view = new EditorView({ state, parent });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text: string) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    destroy: () => view.destroy(),
  };
}
