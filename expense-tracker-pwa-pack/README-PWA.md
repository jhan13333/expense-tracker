# PWA 추가 가이드

## 1) 파일 복사
- `manifest.json`, `service-worker.js`, `offline.html`, `icons/` 폴더를 프로젝트 루트에 복사하세요.

## 2) index.html <head>에 아래 태그 추가

```html
<!-- In index.html <head> -->
<link rel="manifest" href="./manifest.json">
<meta name="theme-color" content="#2563eb">
<link rel="icon" href="./icons/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="./icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

## 3) app.js 마지막에 서비스워커 등록 코드 추가

```js
// In app.js (at the bottom)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}
```

## 4) GitHub Pages 경로 주의
- `start_url`과 파일 경로는 `./` 상대경로를 사용하므로 프로젝트 페이지(`/username.github.io/repo/`)에서도 안전합니다.

## 5) 배포 후 테스트
- 페이지를 열고 개발자도구(Application → Service Workers)에서 등록 여부 확인
- URL을 다시 로드한 뒤, 네트워크 끊고도 기본 화면이 열리는지 확인
