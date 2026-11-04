# 나유타 재판: 이 길이 아닌가? — v0.1

도트 감성 법정 공방 팬게임. 「승리의 여신: 니케」 비공식 팬 제작물.

> 이 프로젝트는 비영리 팬 프로젝트이며 원작의 권리를 존중합니다. 모든 캐릭터·세계관의 권리는 SHIFT UP에 있습니다.
> 권리자가 요청하면 즉시 중단하고 삭제합니다.
>
> 참고: 시프트업 2차 창작 가이드라인(policy.shiftup.co.kr/ip) 제3조는 게임 IP로 게임을 만들어 배포하는 것을 원칙적으로 허용하지 않는다.
> 위 문구를 달고 공개하되, 요청이 오면 저장소와 GitHub Pages를 바로 내린다. 모델 원본 출력(`assets/raw/`)은 올리지 않는다.

플레이: <https://hspark-rm.github.io/nayuta-trial/>

## 실행

```bash
python3 -m http.server 8841 --bind 127.0.0.1 --directory ~/Developer/nayuta-trial
```

브라우저에서 <http://127.0.0.1:8841> 을 연다. `index.html`을 파일로 바로 열면 그림 도트 변환이 막힌다(브라우저 보안 규칙).

### 휴대폰에서 하기

1. 맥과 휴대폰을 같은 와이파이에 연결한다.
2. 맥 터미널에서 `~/Developer/nayuta-trial/tools/serve-lan.sh` 를 실행한다.
3. 화면에 나온 `http://192.168.…:8850` 주소를 휴대폰 브라우저에서 연다.
4. 휴대폰을 가로로 돌린다. 안드로이드는 타이틀의 **전체 화면** 버튼을 누르면 가로로 고정된다.

맥 방화벽이 연결 허용을 물으면 허용한다. 맥이 꺼지거나 터미널을 닫으면 휴대폰에서도 멈춘다. 집 밖 인터넷에서는 열리지 않는다.
아이폰은 사파리 공유 → **홈 화면에 추가**로 열면 주소창 없이 쓸 수 있다.

## 조작

| 동작 | 키보드 | 마우스·터치 |
|---|---|---|
| 대사 넘기기 | Enter · Space · Z | 화면 아무 곳 누르기 |
| 증언 앞뒤로 | ← → | ◀ ▶ |
| 캐묻기 | X | 캐묻기 |
| 증거 목록 · 증거 내기 | E | 증거 E · 증거 내기 |
| 증거 고르기 · 제시 | ↑ ↓ · Z | 목록 누르기 · 제시 |
| 소리 켜기/끄기 | M | 타이틀의 소리 버튼 |

틀린 증거를 내면 재판장 인내심(왼쪽 위 하트)이 1칸 준다. 5칸이 모두 없어지면 패소하고, 마지막 저장 지점부터 다시 한다.

## 그림 넣기

PNG 파일을 아래 이름으로 넣으면 게임이 32색 도트 그림으로 바꿔서 보여 준다. 파일이 없으면 회색 자리표시 그림이 나온다.

- 인물: `assets/portraits/<인물>_<표정>.png` — 그 표정 파일이 없으면 `_normal`을 쓴다.
- 증거: `assets/evidence/<증거 id>.png` (32×32로 줄여 씀)
- 배경: `assets/bg/court.png` (320×180으로 잘라 씀)

### 원본 그림으로 도트 초상화 만들기 (고려대 LLM)

1. 원본 그림(게임 스크린샷도 됨)을 Dropbox `00. Inbox/nayuta-ref/` 에 `nayuta.png`, `anis.png`, `hongryeon.png` 이름으로 넣는다.
2. `tools/make_portraits.py --plan` 으로 장수와 예상 크레딧을 본다(1장 약 11).
3. `tools/make_portraits.py` 를 실행한다. 기본 표정을 먼저 만들고, 나머지 표정은 그 그림을 참고로 표정만 바꾼다.
4. 흰 배경을 지운 결과가 `assets/portraits/` 에 들어간다. 모델 원본 출력은 `assets/raw/` 에 남는다.

투명 여백은 자동으로 잘라 낸다. 전신 그림이면 상반신만 쓴다. 범위를 직접 정하려면 `data/case1.js`의 인물에 `crop: [x, y, 폭, 높이]`(그림 크기 대비 0~1 비율)를 넣는다.

| 인물 id | 쓰는 표정 |
|---|---|
| `nayuta` | normal, sad, smile |
| `anis` | normal, smile, shock |
| `hongryeon` | normal, drunk, shock |
| `prosecutor` | normal, smile, angry, shock |
| `judge` | normal |

이격(같은 인물의 다른 버전)은 `data/case1.js`의 `variants`에 적고, 그림은 `assets/portraits/<이격 id>_<표정>.png`로 넣는다. 플레이어가 타이틀의 **의상**에서 고른다. 고른 이격에 그 표정 그림이 없으면 기본 그림을 쓴다. 지금은 `anis` ↔ `anis_star`(아니스: 스타).

재판장과 검사는 원작에 없는 인물이다. 그림 없이 자리표시로 두어도 된다.

## 시나리오 고치기

시나리오는 `data/case1.js` 한 파일이다. 줄마다 하나의 명령이다.

| 명령 | 모양 |
|---|---|
| 대사 | `{ who: 'nayuta', face: 'sad', line: '…' }` (`who: null`이면 이름 없는 안내문, `me`는 지휘관. `(`로 시작하는 지휘관 대사는 속마음 색) |
| 장 제목 | `{ op: 'chapter', text: '제1심', sub: '독잔 사건' }` |
| 증언 | `{ op: 'testimony', title, witness, statements: [{ line, face, press: [대사…], present: { 증거id: 'label' } }], wrong: [대사…] }` |
| 증거 요구 | `{ op: 'demand', who, line, answer: 증거id, ok: 'label', wrong: [대사…] }` |
| 증거 받기 | `{ op: 'give', id: 'e3' }` |
| 표시·이동 | `{ op: 'label', id }` · `{ op: 'goto', id }` |
| 연출 | `{ op: 'fx', kind: 'stamp' \| 'shake' \| 'flash', text }` |
| 저장 지점 | `{ op: 'save' }` |
| 끝 | `{ op: 'end', result: 'win', title, text }` |

없는 인물·증거·label을 가리키면 타이틀 왼쪽 위에 "데이터 오류 N건"이 뜨고, 브라우저 콘솔에 목록이 나온다.

## 글꼴

갈무리11 (quiple/galmuri, SIL OFL 1.1). jsDelivr에서 받는다. 인터넷이 없으면 시스템 글꼴을 도트처럼 깎아서 쓴다.
