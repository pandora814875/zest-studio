import { useLayoutEffect } from "react";

export function useAutosizeTextarea(textareaRef, value) {
  useLayoutEffect(() => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 260)}px`;
  }, [textareaRef, value]);
}
