const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;

if (!apiKey) {
  console.error("❌ Perplexity API 키가 없습니다.");
}

export const getFilterCondition = async (userInput) => {
  const trimInput = userInput.trim();

  // ---------------------------------------------------------
  // 1. 키워드 정의
  // ---------------------------------------------------------
  const LOGIC_KEYWORDS = [
      '후기', '미작성', '답장', 
      '매출', '정산', '원', 
      '부재', '놓친', 
      '접속', '시간', 
      '이상', '이하', '초과', '미만',
      '순서', '순', '정렬', '랭킹', '높은', '낮은', '많은', '적은' // 정렬 키워드 추가
  ];

  const LOCAL_KEYWORDS = ['타로', '신점', '사주', '그린', '퍼플', '상담'];

  // ---------------------------------------------------------
  // 2. 결과 포맷 통일 함수 (중요!)
  // 문자열 대신 항상 이 객체 포맷을 반환하여 받는 쪽(UI)에서 에러가 없게 합니다.
  // ---------------------------------------------------------
  const createResult = (code, sortField = null, sortOrder = null) => ({
      filterCode: code,  // 필터링 조건문
      sortField: sortField, // 정렬 기준 필드 (예: 'item.curRev')
      sortOrder: sortOrder  // 'asc'(오름차순) or 'desc'(내림차순)
  });

  // 로컬 단순 검색 로직
  const getSimpleCode = (keyword) => {
      const code = `(
          (item.nick && item.nick.includes('${keyword}')) || 
          (item.category && item.category.includes('${keyword}')) || 
          (item.levelCat && item.levelCat.includes('${keyword}'))
      )`;
      return createResult(code); // 정렬 없음
  };

  const hasLogicKeyword = LOGIC_KEYWORDS.some(k => trimInput.includes(k));
  const hasLocalKeyword = LOCAL_KEYWORDS.some(k => trimInput.includes(k));
  const hasNumber = /\d/.test(trimInput);

  // ---------------------------------------------------------
  // 3. 로컬 검색 결정
  // ---------------------------------------------------------
  if (!hasNumber && !hasLogicKeyword && (!trimInput.includes(' ') || hasLocalKeyword)) {
      console.log(`[로컬 검색] "${trimInput}" -> 정렬 없이 필터만 수행`);
      return getSimpleCode(trimInput);
  }

  // ---------------------------------------------------------
  // 4. Perplexity API 호출 (필터 + 정렬)
  // ---------------------------------------------------------
  console.log(`[AI 검색] "${trimInput}" -> 필터 및 정렬 분석 중...`);

  const systemPrompt = `
    You are a JS condition & sort parser for counselor data.
    
    [Data Fields & Keywords Mapping]
    1. item.nick (String)
    2. item.category (String)
    3. item.curRev (Number) : "매출", "돈", "수익", "정산"
    4. item.curMissed (Number) : "부재", "부재중", "놓친", "Missed Calls" 
       -> ❌ NEVER use this for 'reviews' or '후기'.
    5. item.curTime (Number) : "접속", "시간", "Login Time"
    6. item.unanswered (Number) : "후기", "미작성", "답장", "Unwritten Reviews" 
       -> ✅ ALWAYS use this for 'reviews' or '후기'.

    [Output Format]
    "ConditionString | SortField | SortOrder"
    
    [Rules]
    1. Separator is "|".
    2. SortOrder: 'asc' (low->high) or 'desc' (high->low).
    3. If input has "후기" (Review) or "미작성", YOU MUST USE 'item.unanswered'.
    4. If input has "부재" (Missed), YOU MUST USE 'item.curMissed'.
    
    [Examples]
    Q: "타로 상담사" 
    A: item.category.includes('타로') | null | null
    
    Q: "매출 높은 순서" 
    A: true | item.curRev | desc
    
    Q: "미작성 후기 5건 이상"  <-- (User's Case)
    A: item.unanswered >= 5 | null | null

    Q: "부재중 3회 미만"
    A: item.curMissed < 3 | null | null
  `;

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
          { role: "user", content: `사용자 입력: "${trimInput}"` }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!response.ok) throw new Error(response.status);

    const data = await response.json();
    let rawResult = data.choices[0].message.content.replace(/`/g, '').trim();
    
    // 파싱 로직: "조건 | 필드 | 순서" 분리
    const parts = rawResult.split('|').map(s => s.trim());
    
    const filterCode = parts[0] || 'true';
    const sortField = (parts[1] && parts[1] !== 'null') ? parts[1] : null;
    const sortOrder = (parts[2] && parts[2] !== 'null') ? parts[2].toLowerCase() : null;

    console.log(`[AI 결과] 필터: ${filterCode}, 정렬: ${sortField} (${sortOrder})`);
    
    return createResult(filterCode, sortField, sortOrder);

  } catch (error) {
    console.error("Error:", error);
    return getSimpleCode(trimInput);
  }
};