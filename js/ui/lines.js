import { SPA } from "../utils/spa.js";

SPA((button) => {
  if (button.hasAttribute('data-processed')) return;

  const replacedValue = button.getAttribute('data-replaced');
  const lineValue = button.getAttribute('data-line') || 'down';

  const button_line = document.createElement('button');
  button_line.setAttribute("data-position", lineValue);

  Array.from(button.attributes).forEach(attr => {
    if (attr.name !== 'tag' && attr.name !== 'data-processed' && attr.name !== 'data-line') {
      button_line.setAttribute(attr.name, attr.value);
    }
  });

  button_line.classList.add('line');
  const iconClass = `iconoir-page-${lineValue}`;

  const nav = document.createElement('nav');
  const div1 = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = button.textContent.trim().toLowerCase();
  const div2 = document.createElement('div');

  nav.appendChild(div1);
  nav.appendChild(p);
  nav.appendChild(div2);

  const icon = document.createElement('i');
  icon.className = iconClass;

  const div3 = document.createElement('div');

  button_line.appendChild(nav);
  button_line.appendChild(icon);
  button_line.appendChild(div3);

  button.setAttribute('data-processed', 'true');
  if (button.parentNode) {
    button.parentNode.replaceChild(button_line, button);
  }

}, {
  selector: 'button[data-line]:not([data-processed])',
  continuous: true
});
