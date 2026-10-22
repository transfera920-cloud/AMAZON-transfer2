// 依星期變換背景色（紅橙黃綠藍靛紫，致敬台北 101）。
// 這段會放進每一個靜態頁的 <head>；顏色定義在 public/day-theme.css。
// 以「台灣時間」判斷星期；網址加 ?day=1（週一）…?day=6（週六）、?day=0（週日）可預覽。
export const DAY_THEME_SCRIPT = `(function(){function s(){var d;try{var m=/[?&]day=([0-6])(?:&|#|$)/.exec(location.search);if(m){d=+m[1]}else{d={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short'}).format(new Date())]}}catch(e){}if(d===undefined)d=new Date().getDay();document.documentElement.setAttribute('data-day',d)}s();document.addEventListener('visibilitychange',s)})();`;

export const DAY_THEME_HEAD = `<script>${DAY_THEME_SCRIPT}</script>\n<link rel="stylesheet" href="/day-theme.css" />\n`;
