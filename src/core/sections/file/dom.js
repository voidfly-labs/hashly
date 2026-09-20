/** An element of class `className`, with `text` in it (as text, never as markup: a file name is anyone's). */
export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
