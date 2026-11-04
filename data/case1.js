// 제1심 시나리오 — 독잔 사건 (공소사실 C1·C2, 반론 D1·D2·D3)
// 고치는 법은 README.md의 "시나리오 고치기" 참고.
// 대사 한 줄 = { who: 인물 id, face: 표정, line: '대사' }. who: null 이면 이름 없는 안내문.
window.CASE = {
  id: 'case1',
  subtitle: '— 제1심 · 독잔 사건 —',

  // 인물. voice = 대사 효과음 높이(Hz), color = 그림이 없을 때 자리표시 색
  chars: {
    judge:      { name: '에닉',    voice: 180, color: '#8a7a5a' },  // 재판장 = 방주 관리 AI 에닉
    prosecutor: { name: '노벨',    voice: 140, color: '#5a6a9a' },  // 검사 = 니케 노벨
    nayuta:     { name: '나유타',  voice: 300, color: '#5aa0a0' },
    anis:       { name: '아니스',  voice: 420, color: '#d8a040' },
    hongryeon:  { name: '홍련',    voice: 260, color: '#c04848' },
    me:         { name: '지휘관',  voice: 220, portrait: false },
  },

  // 이격(같은 인물의 다른 버전). 타이틀의 '의상'에서 고른다. id = 그림 파일 이름 앞부분
  variants: {
    anis: [{ id: 'anis', label: '기본' }, { id: 'anis_star', label: '스타' }],
  },

  evidence: {
    e1: { name: '거래 기록', color: '#e8c060',
      desc: 'EDEN SPEAR 무렵. 니힐리스타는 바디에 언체인드를 뿌려 퀸을 독살하려 했다. 이 거래는 니힐리스타가 먼저 제안했다.' },
    e2: { name: '퀸 전투 기록', color: '#e0505a',
      desc: '니힐리스타가 합류한 뒤의 전투 기록. 퀸은 예전처럼 상처를 바로 복원하지 못하고 피를 흘렸다.' },
    e3: { name: '나유타의 질문', color: '#5aa0a0',
      desc: '나유타가 니힐리스타에게 물었다. "퀸의 지배에서 벗어날 수는 없소?"' },
    e4: { name: '니힐리스타 신체 기록', color: '#a070c0',
      desc: '니힐리스타는 릴리스의 바디를 자기 몸에 흡수했다. 그 바디에는 언체인드가 들어 있었다.' },
    e5: { name: '언체인드 시료', color: '#7ee08a',
      desc: '독잔 계획에 쓰인 물질. 퀸을 안에서부터 녹이려는 독으로 쓰였다.' },
  },
  startEvidence: ['e1', 'e2', 'e4', 'e5'],

  script: [
    { op: 'chapter', text: '제1심', sub: '독잔 사건' },
    { who: 'judge', line: '지금부터 피고인 나유타에 대한 제1심 공판을 시작합니다.' },
    { who: 'judge', line: '검사, 공소사실을 낭독하세요.' },
    { who: 'prosecutor', line: '피고인은 릴리스의 바디를 찾으려고 헬레틱 니힐리스타와 손을 잡았습니다.' },
    { who: 'prosecutor', line: '그러나 바디를 손에 넣을 기회가 오자, 정에 끌려 니힐리스타를 놓아주었습니다.' },
    { who: 'prosecutor', face: 'smile', line: '그 결과 니힐리스타는 바디를 품은 채 퀸에게 돌아갔습니다. 피고인의 \'독잔 계획\'은 퀸만 이롭게 했습니다.' },
    { who: 'judge', line: '피고인, 할 말이 있습니까?' },
    { who: 'nayuta', line: '소인은 변명하지 않겠소. 다만 대협께서 소인을 대신해 말씀해 주실 것이오.' },
    { who: 'me', line: '(…결국 나한테 넘겼군.)' },
    { who: 'prosecutor', face: 'smile', line: '덧붙여, 여론은 이미 유죄입니다. 검찰은 시나리오 작가도 함께 기소하고 싶을 정도입니다.' },
    { who: 'judge', line: '본 법정은 시나리오 작가를 기소할 권한이 없습니다. 기각합니다.' },
    { who: 'prosecutor', line: '…알겠습니다. 첫 번째 증인을 부르겠습니다.' },
    { op: 'save' },

    { who: 'anis', line: '카운터스의 아니스예요. 솔직히 말해서… 트롤 맞잖아요?' },
    { who: 'judge', line: '증인은 본 것만 증언하세요.' },
    { who: 'anis', face: 'smile', line: '네네. 그럼 본 대로 말할게요.' },
    {
      op: 'testimony', title: '니힐리스타를 놓아준 일', witness: 'anis',
      statements: [
        { line: '나유타는 바디 위치를 알아내려고 니힐리스타랑 손을 잡았어요.',
          press: [
            { who: 'me', line: '왜 하필 헬레틱과 손을 잡았지?' },
            { who: 'anis', line: '바디 위치를 아는 게 걔뿐이었으니까요. 여기까진 다들 아는 얘기예요.' },
            { who: 'me', line: '(사실 관계는 맞다. 다른 문장을 살펴보자.)' },
          ] },
        { line: '바디를 찾으니까, 니힐리스타가 그걸 자기 몸에 흡수해 버렸죠.',
          press: [
            { who: 'me', line: '흡수했다고? 왜 그랬지?' },
            { who: 'anis', line: '토사구팽당할까 봐 보험을 든 거래요. 똑똑하긴 하죠.' },
            { who: 'nayuta', face: 'sad', line: '…그때 소인은 분을 삼키고 거래를 이어 갔소.' },
          ] },
        { line: '니힐리스타가 "나를 죽이고 바디를 가져가라"고까지 했대요. 그런데 나유타는 못 죽였어요.',
          press: [
            { who: 'me', line: '못 죽인 이유는?' },
            { who: 'anis', line: '정이 들어서래요. 니케가 헬레틱한테 정이 든다는 게 말이 돼요?' },
            { who: 'nayuta', face: 'sad', line: '…소인은 그 소저에게 물었소. 퀸의 지배에서 벗어날 수는 없느냐고.' },
            { who: 'me', line: '(그 대화는 기록으로 남아 있다.)' },
            { op: 'give', id: 'e3' },
          ] },
        { line: '애초에 바디에 언체인드를 넣어서 퀸을 독살하자는 \'독잔 계획\'도 나유타가 혼자 꾸민 거잖아요.',
          press: [
            { who: 'me', line: '나유타가 혼자 꾸몄다고 단정할 수 있나?' },
            { who: 'anis', line: '혼자 정하고 혼자 저지르는 거, 나유타 특기잖아요.' },
            { who: 'prosecutor', line: '증인의 말에 무슨 문제라도 있습니까, 변호인?' },
          ],
          present: { e1: 'contra1' } },
        { line: '결국 바디도 놓치고, 퀸만 좋은 일 시킨 거예요. 이건 트롤이죠.',
          press: [
            { who: 'anis', line: '전쟁은 결과가 전부예요. 과정이 어쨌든 결과가 최악이잖아요.' },
            { who: 'me', line: '(결과를 따지기 전에, 계획이 어디서 시작됐는지부터 확인해야 한다.)' },
          ] },
      ],
      wrong: [
        { who: 'prosecutor', face: 'smile', line: '변호인은 아무 증거나 내밀고 있군요.' },
        { who: 'judge', line: '그 증거가 증언과 무슨 관계가 있습니까? 주의하세요.' },
      ],
    },

    { op: 'label', id: 'contra1' },
    { op: 'fx', kind: 'stamp', text: '모순 발견!' },
    { op: 'fx', kind: 'shake' },
    { who: 'me', line: '증인은 독잔 계획을 나유타가 혼자 꾸몄다고 했다.' },
    { who: 'me', line: '그런데 이 거래 기록을 보면, 계획을 먼저 제안한 쪽은 니힐리스타다!' },
    { who: 'anis', face: 'shock', line: '에? 진짜요?' },
    { who: 'nayuta', line: '그렇소. 그 소저가 바디에 언체인드를 뿌려 퀸을 독살하려는 것을 소인이 먼저 알아챘소. 거래를 청한 것은 그쪽이었소.' },
    { who: 'prosecutor', face: 'angry', line: '…제안자가 누구든 상관없습니다. 핵심은 결과입니다!' },
    { who: 'prosecutor', line: '독잔은 끝내 퀸에게 아무 해도 끼치지 못했습니다. 이를 본 목격자가 있습니다.' },
    { who: 'judge', line: '좋습니다. 다음 증인을 부르세요.' },
    { op: 'save' },

    { who: 'hongryeon', face: 'drunk', line: '흐음… 홍련이오. 한잔 걸쳤으나 정신은 멀쩡하오.' },
    { who: 'judge', line: '…법정에 술을 들고 오지 마세요.' },
    { who: 'hongryeon', face: 'drunk', line: '이것은 술이 아니라 기억을 맑게 하는 약이오.' },
    { who: 'nayuta', line: '홍련 소저, 그것은 분명 술이오.' },
    { who: 'hongryeon', line: '나유타 소저야말로 길을 잃지 않고 법정까지 온 것이 기적이오.' },
    { who: 'nayuta', face: 'sad', line: '…소인은 길치가 아니오.' },
    {
      op: 'testimony', title: '퀸과의 결전', witness: 'hongryeon',
      statements: [
        { face: 'drunk', line: '니힐리스타가 퀸에게 합류한 뒤, 퀸과 칼을 맞대었소.',
          press: [
            { who: 'hongryeon', face: 'drunk', line: '그 기세가 대단했소. 술 열 동이를 마신 듯했지.' },
            { who: 'me', line: '(비유가 술밖에 없군.)' },
          ] },
        { line: '퀸은 니힐리스타와 바디를 거두어 오히려 더 강해졌소.',
          press: [
            { who: 'prosecutor', face: 'smile', line: '들으셨습니까? 독잔은 오히려 퀸을 강하게 만들었습니다.' },
            { who: 'me', line: '(겉보기에 강해졌다고 해서, 독이 듣지 않았다는 뜻은 아니다.)' },
          ] },
        { face: 'drunk', line: '베어도 베어도 상처가 곧바로 아물었소. 독 따위는 전혀 듣지 않았소.',
          press: [
            { who: 'me', line: '상처가 곧바로 아문 것을 똑똑히 보았나?' },
            { who: 'hongryeon', face: 'drunk', line: '예전에 보던 퀸 그대로였소… 아마도.' },
            { who: 'me', line: '(아마도?)' },
          ],
          present: { e2: 'contra2' } },
        { line: '그러니 독잔 계획은 실패였다고 보는 것이 옳소.',
          press: [
            { who: 'nayuta', face: 'sad', line: '홍련 소저마저 그리 말하니 소인의 마음이 아프오.' },
            { who: 'hongryeon', line: '미안하오. 술이 사람을 정직하게 만드는구려.' },
          ] },
      ],
      wrong: [
        { who: 'hongryeon', face: 'drunk', line: '변호인, 그것은 안주가 아니오.' },
        { who: 'judge', line: '증언과 관계없는 증거입니다. 주의하세요.' },
      ],
    },

    { op: 'label', id: 'contra2' },
    { op: 'fx', kind: 'stamp', text: '모순 발견!' },
    { op: 'fx', kind: 'shake' },
    { who: 'me', line: '증인은 상처가 곧바로 아물었다고 했다. 하지만 이 전투 기록을 보라.' },
    { who: 'me', line: '퀸은 예전처럼 상처를 바로 복원하지 못했다. 피를 흘리고 있었다!' },
    { who: 'hongryeon', face: 'shock', line: '…그러고 보니 소매에 묻은 붉은 것이 술은 아니었소.' },
    { who: 'prosecutor', face: 'angry', line: '피를 흘렸다고 해서 그것이 독잔 때문이라는 증거는 없습니다!' },
    { op: 'save' },
    { op: 'demand', who: 'judge', line: '변호인. 독잔은 지금 어디에 있습니까? 증거로 보여 주세요.',
      answer: 'e4', ok: 'final1',
      wrong: [
        { who: 'prosecutor', face: 'smile', line: '그것으로는 독잔의 행방을 설명할 수 없습니다.' },
        { who: 'judge', line: '다시 생각해 보세요. 독은 누구의 몸을 거쳐 퀸에게 갔습니까?' },
      ] },

    { op: 'label', id: 'final1' },
    { op: 'fx', kind: 'stamp', text: '결정적 증거!' },
    { op: 'fx', kind: 'flash' },
    { who: 'me', line: '니힐리스타의 신체 기록이다. 니힐리스타는 언체인드가 든 바디를 자기 몸에 흡수했다.' },
    { who: 'me', line: '그리고 퀸은 그 니힐리스타를 거두었다. 즉, 독잔은 니힐리스타 자신이었다!' },
    { who: 'nayuta', line: '그렇소. 그 소저를 죽이지 못한 것은 정 때문이기도 하오.' },
    { who: 'nayuta', line: '허나 독잔이 퀸에게 닿아야 했던 것도 사실이오. 그래야 다음을 도모할 수 있었소.' },
    { who: 'prosecutor', face: 'shock', line: '크윽…!' },
    { who: 'judge', line: '독잔 계획이 퀸만 이롭게 했다는 공소사실은 증명되지 않았습니다.' },
    { op: 'fx', kind: 'flash' },
    { who: 'judge', line: '본 법정은 피고인 나유타에게 제1심 무죄를 선고합니다.' },
    { who: 'judge', line: '다만 피고인. 혼자 정하고 혼자 저지르는 버릇은 따로 기록해 두겠습니다.' },
    { who: 'nayuta', face: 'smile', line: '…명심하겠소.' },
    { who: 'prosecutor', face: 'angry', line: '검찰은 항소합니다. 2심에서는 궤도 엘리베이터 사건을 다루겠습니다.' },
    { op: 'end', result: 'win', title: '제1심 무죄', text: '제2심 「미러의 배신」은 다음 판에서.' },
  ],
};
