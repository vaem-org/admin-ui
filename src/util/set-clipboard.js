export default function setClipboard(text) {
  const div = document.createElement('div');
  Object.assign(div.style, {
    opacity: 0,
    position: 'absolute',
    left: '-100%',
    top: 0
  });

  div.innerText = text;
  const body = document.getElementsByTagName('body')[0];
  body.appendChild(div);

  let range;
  if (document.selection) {
    range = document.body.createTextRange();
    range.moveToElementText(div);
    range.select();
  } else if (window.getSelection) {
    range = document.createRange();
    range.selectNode(div);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  document.execCommand('copy');
  setTimeout(function () {
    body.removeChild(div);
  }, 0);
}