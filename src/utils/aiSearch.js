// src/utils/aiSearch.js

const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;

if (!apiKey) {
  console.error("❌ Perplexity API 키가 없습니다. .env 파일을 확인해주세요.");
}

/**
 * AI 검색 및 로컬 패턴 매칭을 수행합니다.
 * @param {string} userInput - 사용자의 자연어 질문
 * @param {object} dataStats - 데이터 통계 정보 (avgRev, maxRev, avgTime 등) -> AI 문맥 파악용
 */
export const getFilterCondition = async (userInput, dataStats = {}) => {
  const trimInput = userInput.trim();

  // 결과 생성 헬퍼 함수
  const createResult = (code, sortField = null, sortOrder = null) => ({
    filterCode: code,
    sortField: sortField,
    sortOrder: sortOrder
  });

  // =========================================================
  // [1. 로컬 검색 최적화] API 호출 없이 즉시 처리 (속도 UP, 비용 DOWN)
  // =========================================================

  // 1-1. "N단계" 패턴 처리 (예: "2단계", "2단계만", "6단계 보여줘")
  // 정규식: 숫자 뒤에 '단계'가 붙은 패턴 감지
  const levelMatch = trimInput.match(/(\d+)단계/);
  if (levelMatch) {
      const levelNum = levelMatch[1];
      console.log(`[로컬 검색] ${levelNum}단계 필터링`);
      // 숫자 레벨(levelNum)과 문자열 레벨(level) 모두 체크
      return createResult(`(item.levelNum == ${levelNum} || (item.level && item.level.includes('${levelNum}단계')))`);
  }

  // 1-2. 색상(그린/퍼플) 패턴 처리 (예: "그린만", "퍼플", "퍼플 상담사")
  if (trimInput.includes('그린') || trimInput.includes('퍼플')) {
      const color = trimInput.includes('그린') ? '그린' : '퍼플';
      
      // 입력이 짧고 단순할 때만 로컬 처리 (예: "그린이면서 매출 높은 순" 같은 복합 질문은 AI로 넘김)
      if (trimInput.length < 15) {
          console.log(`[로컬 검색] ${color} 등급 필터링`);
          return createResult(`(item.levelCat && item.levelCat.includes('${color}'))`);
      }
  }

  // 1-3. 단순 키워드 매칭 처리
  // 숫자가 없고, 공백이 없으며, 길이가 짧은 단어일 경우
  const isSimpleSearch = !/\d/.test(trimInput) && !trimInput.includes(' ') && trimInput.length < 10;
  
  if (isSimpleSearch) {
      if (trimInput === '신규') {
          console.log(`[로컬 검색] 신규 상담사`);
          return createResult(`item.status === 'new'`);
      }
      if (trimInput === '블라인드' || trimInput === '이탈') {
          console.log(`[로컬 검색] 블라인드 상담사`);
          return createResult(`item.status === 'blind'`);
      }
      
      const simpleKeywords = ['타로', '신점', '사주', '전화', '채팅'];
      if (simpleKeywords.some(k => trimInput.includes(k))) {
          console.log(`[로컬 검색] 키워드 매칭: "${trimInput}"`);
          return createResult(`(
              (item.category && item.category.includes('${trimInput}')) ||
              (item.adEligibleTypes && item.adEligibleTypes.some(t => t.includes('${trimInput}')))
          )`);
      }
  }

  // =========================================================
  // [2. AI 문맥 검색] 복합 질문 및 통계 기반 질의 처리
  // =========================================================
  
  // AI에게 알려줄 통계 문맥 (평균, 최대값 등)
  const statsInfo = dataStats.count ? `
  [Current Data Statistics]
  - Total Count: ${dataStats.count}
  - Revenue: Avg ${Math.round(dataStats.avgRev)} KRW, Max ${dataStats.maxRev} KRW
  - Time (Seconds): Avg ${Math.round(dataStats.avgTime)}s, Max ${dataStats.maxTime}s
  ` : '';

  // AI에게 알려줄 데이터 스키마
  const DATA_SCHEMA = `
  [Available Data Fields (item)]
  - item.nick (String): Activity Name
  - item.realName (String): Real Name
  - item.category (String): '타로', '사주', '신점'
  - item.levelCat (String): '그린', '퍼플'
  - item.level (String): '1단계'...'6단계', '등록존'
  - item.levelNum (Number): 0 ~ 6
  - item.status (String): 'new', 'blind', 'existing'
  
  - item.curRev (Number): Current Revenue (KRW)
  - item.revRate (Number): Growth Rate (0.1 = +10%)
  
  - item.curTime (Number): Current Time in **SECONDS** (3600 = 1 Hour)
  - item.timeRate (Number): Time Growth Rate
  
  - item.curMissed (Number): Missed Calls
  - item.unanswered (Number): Unanswered Reviews
  - item.issues (Array): ['A', 'B', 'C', 'D']
  - item.adEligibleTypes (Array): ['전화(메인)', '채팅(타로)', ...]
  `;

  const systemPrompt = `
    You are a Query-to-JavaScript Logic Generator.
    Convert Korean User Query into a JavaScript Object Filter.

    ${DATA_SCHEMA}
    ${statsInfo}

    [Strict Rules]
    1. **Time Unit**: Data is in SECONDS. "10 hours" -> \`item.curTime >= 10 * 3600\`.
    2. **Context**: Use Statistics values for "Average" or "Top" queries.
    3. **Syntax**: Use JavaScript syntax. Return ONLY JSON.
    4. **Sort**: Detect \`sortField\` and \`sortOrder\` ('asc'/'desc'). Default null.

    [Examples]
    Q: "평균 매출 이상"
    A: { "filter": "item.curRev >= ${Math.round(dataStats.avgRev || 0)}", "sortField": "curRev", "sortOrder": "desc" }
    
    Q: "접속시간 50시간 이상인 퍼플"
    A: { "filter": "item.curTime >= 50 * 3600 && item.levelCat.includes('퍼플')", "sortField": "curTime", "sortOrder": "desc" }
  `;

  console.log(`[AI 검색] "${trimInput}" API 요청 진행...`);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "sonar", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Query: "${trimInput}"` }
        ],
        temperature: 0,
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Markdown 코드 블럭 제거 (```json ... ```)
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);
    console.log(`[AI 결과]`, parsed);

    return createResult(parsed.filter, parsed.sortField, parsed.sortOrder);

  } catch (error) {
    console.error("AI Search Failed:", error);
    // 에러 발생 시 최후의 수단: 닉네임/실명 단순 포함 검색
    return createResult(`(
        (item.nick && item.nick.includes('${trimInput}')) || 
        (item.realName && item.realName.includes('${trimInput}'))
    )`);
  }
};