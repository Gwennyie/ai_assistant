const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const banner = document.getElementById('offlineBanner');
const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;

function addMsg(text, who, label) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = label || (who === 'user' ? 'YOU (STUDENT)' : 'CLASS ASSISTANT');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  div.append(meta, bubble);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// ---- Offline detection ----
function updateOnline() {
  const off = !navigator.onLine;
  banner.classList.toggle('d-none', !off);
  sendBtn.disabled = off;
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

// ---- Send prompt to Django backend ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) return;
  if (!navigator.onLine) { updateOnline(); return; }

  addMsg(prompt, 'user');
  promptEl.value = '';
  sendBtn.disabled = true;
  const thinking = addMsg('Thinking…', 'bot');

  try {
    const res = await fetch('/api/ask/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf},
      body: JSON.stringify({prompt}),
    });
    const data = await res.json();
    thinking.remove();
    if (res.ok) addMsg(data.reply, 'bot');
    else addMsg(data.error || 'Something went wrong.', 'bot error');
  } catch {
    thinking.remove();
    addMsg('Could not reach the server. Are you offline?', 'bot error');
  } finally {
    updateOnline();
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  chat.querySelectorAll('.msg:not(:first-child)').forEach((m) => m.remove());
});
document.querySelectorAll('.chip').forEach((c) =>
  c.addEventListener('click', () => { promptEl.value = c.textContent + ': '; promptEl.focus(); })
);

// ---- PWA: register service worker + install button ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', {scope: '/'}));
}
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('d-none');
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('d-none');
});