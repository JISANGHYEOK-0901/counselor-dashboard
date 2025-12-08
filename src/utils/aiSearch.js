// import { GoogleGenAI } from "@google/genai"; // ❌ 이거 지우세요
// const genAI = new GoogleGenAI({ apiKey }); // ❌ 이것도 지우세요

const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;

if (!apiKey) {
  console.error("❌ Perplexity API 키가 없습니다. .env 파일을 확인해주세요.");
}

export const getFilterCondition = async (userInput) => {
  // ---------------------------------------------------------
  // 0. 공통 로직: 로컬 키워드 필터링 (비용 절약)
  // ---------------------------------------------------------
  const trimInput = userInput.trim();
  const LOCAL_KEYWORDS = ['타로', '신점', '사주', '그린', '퍼플', '상담'];

  const getSimpleCode = (keyword) => `(
      (item.nick && item.nick.includes('${keyword}')) || 
      (item.category && item.category.includes('${keyword}')) || 
      (item.levelCat && item.levelCat.includes('${keyword}'))
  )`;

  // 숫자가 없고, (공백이 없거나 OR 로컬 키워드가 포함된 경우) -> API 호출 안 함
  const hasLocalKeyword = LOCAL_KEYWORDS.some(k => trimInput.includes(k));
  if (!/\d/.test(trimInput) && (!trimInput.includes(' ') || hasLocalKeyword)) {
      console.log(`[로컬 검색] "${trimInput}" -> API 호출 생략`);
      return getSimpleCode(trimInput);
  }

  // ---------------------------------------------------------
  // 1. Perplexity API 호출 설정
  // ---------------------------------------------------------
  const systemPrompt = `
    You are a JavaScript condition generator for filtering counselor data.
    
    [Data Fields]
    - item.nick : Nickname
    - item.category : Category (e.g., '타로', '신점')
    - item.levelCat : Grade (e.g., '그린', '퍼플')
    - item.curRev : Revenue (Number)
    - item.curMissed : Missed calls (Number)
    - item.curTime : Login duration (Number, minutes)

    [Rules]
    1. RETURN ONLY the JavaScript condition string. NO explanations, NO markdown code blocks.
    2. Use .includes() for strings.
    3. If ambiguous, filter by nickname.
    
    [Examples]
    User: "타로 상담사" -> Output: item.category.includes('타로')
    User: "매출 50만 이상" -> Output: item.curRev >= 500000
  `;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "sonar", // 또는 "sonar-pro" (더 똑똑하지만 비쌈)
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `사용자 입력: "${trimInput}"` }
        ],
        temperature: 0.1, // 코드 생성이므로 창의성 낮춤
        max_tokens: 200 // 짧게 답변
      })
    });

    if (!response.ok) {
        throw new Error(`Perplexity API Error: ${response.status}`);
    }

    const data = await response.json();
    let result = data.choices[0].message.content;

    // ---------------------------------------------------------
    // 2. 결과 정제 (마크다운 제거 등)
    // ---------------------------------------------------------
    // Perplexity는 가끔 설명을 덧붙이는 경향이 있어 강제로 코만 추출하거나 정제합니다.
    let cleanCode = result.replace(/```javascript|```/g, '').trim();

    // 혹시라도 설명이 붙었을 경우를 대비해 첫 줄만 가져오거나 안전장치
    if (cleanCode.includes('\n')) {
        // 여러 줄이면 첫 줄이 코드일 확률이 높음 (단, 복잡한 조건일 수 있으니 주의)
        // 여기서는 간단히 전체를 쓰되 에러 방지
    }

    if (cleanCode.length < 3 || cleanCode.includes("Sorry")) {
         return getSimpleCode(trimInput);
    }

    console.log(`[Perplexity 검색] 입력: "${trimInput}" -> 변환: "${cleanCode}"`);
    return cleanCode;

  } catch (error) {
    console.error("Perplexity Search Error:", error);
    // 에러 발생 시 로컬 검색으로 대체
    return getSimpleCode(trimInput);
  }
};